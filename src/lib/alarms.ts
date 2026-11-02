import type { SQLiteDatabase } from 'expo-sqlite';

import { listOccurrences, type EventOccurrence } from '@/db/events';
import { listAlarmSources } from '@/db/reminders';
import { getTask, type Task } from '@/db/tasks';

import { formatTime } from './dates';
import { occurrencesLimited } from './recurrence';

/** One alarm for the phone to ring; mirrors NativeAlarm in modules/forgetless-device. */
export type PlannedAlarm = { id: string; at: number; title: string; body: string };

/**
 * How far ahead alarms are handed to Android. Repeating items get one alarm per date in
 * this window; the app refreshes the list whenever it opens, so it never runs out.
 */
export const ALARM_HORIZON_MS = 21 * 24 * 60 * 60 * 1000;
/** Android allows an app about 500 alarms; stay well under it. */
export const MAX_ALARMS = 200;
const MAX_PER_ITEM = 31;

function lead(offsetMinutes: number, time: number) {
  if (offsetMinutes === 0) return formatTime(time);
  const before = offsetMinutes >= 60 ? `${offsetMinutes / 60} h` : `${offsetMinutes} min`;
  return `In ${before} · ${formatTime(time)}`;
}

/** Alarms for timed tasks (each upcoming date of a repeating one) after `now`. */
export function taskAlarms(task: Task, offsetMinutes: number, now: number): PlannedAlarm[] {
  if (task.dueAt === null || task.dueAllDay || task.completedAt !== null) return [];
  const offset = offsetMinutes * 60_000;
  const times = task.rrule
    ? [task.dueAt, ...occurrencesLimited(task.rrule, task.dueAt, task.dueAt + 1, now + offset + ALARM_HORIZON_MS, MAX_PER_ITEM)]
    : [task.dueAt];
  return times
    .filter((time) => time - offset > now)
    .slice(0, MAX_PER_ITEM)
    .map((time) => ({
      id: `task:${task.id}:${time}`,
      at: time - offset,
      title: task.title,
      body: offsetMinutes === 0 ? `Due now · ${formatTime(time)}` : lead(offsetMinutes, time),
    }));
}

/** Alarms for timed event occurrences after `now`. */
export function eventAlarms(
  occurrences: readonly EventOccurrence[],
  offsetMinutes: number,
  now: number,
): PlannedAlarm[] {
  const offset = offsetMinutes * 60_000;
  return occurrences
    .filter((occurrence) => !occurrence.allDay && occurrence.startAt - offset > now)
    .slice(0, MAX_PER_ITEM)
    .map((occurrence) => ({
      id: `event:${occurrence.eventId}:${occurrence.originalStart}`,
      at: occurrence.startAt - offset,
      title: occurrence.title,
      body:
        offsetMinutes === 0
          ? `${formatTime(occurrence.startAt)} – ${formatTime(occurrence.endAt)}`
          : lead(offsetMinutes, occurrence.startAt),
    }));
}

/** Every alarm due to ring in the next ALARM_HORIZON_MS, soonest first. */
export async function planAlarms(db: SQLiteDatabase, now = Date.now()): Promise<PlannedAlarm[]> {
  const sources = await listAlarmSources(db);
  const alarms: PlannedAlarm[] = [];

  const events = sources.filter((source) => source.ownerType === 'event');
  if (events.length > 0) {
    const longestOffset = Math.max(...events.map((source) => source.offsetMinutes)) * 60_000;
    const occurrences = await listOccurrences(db, now, now + ALARM_HORIZON_MS + longestOffset);
    for (const source of events) {
      const own = occurrences.filter((occurrence) => occurrence.eventId === source.ownerId);
      alarms.push(...eventAlarms(own, source.offsetMinutes, now));
    }
  }

  for (const source of sources.filter((item) => item.ownerType === 'task')) {
    const task = await getTask(db, source.ownerId);
    if (task) alarms.push(...taskAlarms(task, source.offsetMinutes, now));
  }

  return alarms.sort((a, b) => a.at - b.at).slice(0, MAX_ALARMS);
}
