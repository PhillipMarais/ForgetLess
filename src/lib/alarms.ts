import type { SQLiteDatabase } from 'expo-sqlite';

import { listOccurrences, type EventOccurrence } from '@/db/events';
import { listAlarmSources, listSkippedAlarms, type ReminderOwner } from '@/db/reminders';
import { getTask, type Task } from '@/db/tasks';

import { formatTime } from './dates';
import { occurrencesLimited } from './recurrence';

/**
 * One alarm for the phone to ring (id, at, title and body mirror NativeAlarm in
 * modules/forgetless-device), and the task or event it belongs to.
 */
export type PlannedAlarm = {
  id: string;
  at: number;
  title: string;
  /** The notification's text, worded for when it rings ("Due now · 17:00"). */
  body: string;
  /** The same for a list of alarms still to come ("Due 17:00", "15 min before · due 17:00"). */
  detail: string;
  ownerType: ReminderOwner;
  ownerId: string;
  /** The item repeats, so it has other alarms too. */
  repeating: boolean;
};

/**
 * How far ahead alarms are handed to Android. Repeating items get one alarm per date in
 * this window; the app refreshes the list whenever it opens, so it never runs out.
 */
export const ALARM_HORIZON_MS = 21 * 24 * 60 * 60 * 1000;
/** Android allows an app about 500 alarms; stay well under it. */
export const MAX_ALARMS = 200;
const MAX_PER_ITEM = 31;

function span(offsetMinutes: number) {
  return offsetMinutes >= 60 ? `${offsetMinutes / 60} h` : `${offsetMinutes} min`;
}

function lead(offsetMinutes: number, time: number) {
  if (offsetMinutes === 0) return formatTime(time);
  return `In ${span(offsetMinutes)} · ${formatTime(time)}`;
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
      detail:
        offsetMinutes === 0
          ? `Due ${formatTime(time)}`
          : `${span(offsetMinutes)} before · due ${formatTime(time)}`,
      ownerType: 'task' as const,
      ownerId: task.id,
      repeating: task.rrule !== null,
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
      detail:
        offsetMinutes === 0
          ? `${formatTime(occurrence.startAt)} – ${formatTime(occurrence.endAt)}`
          : `${span(offsetMinutes)} before · starts ${formatTime(occurrence.startAt)}`,
      ownerType: 'event' as const,
      ownerId: occurrence.eventId,
      repeating: occurrence.rrule !== null,
    }));
}

/**
 * Every alarm due to ring in the next ALARM_HORIZON_MS, soonest first, leaving out alarms
 * cancelled one by one. `only` limits it to one task or event.
 */
export async function planAlarms(
  db: SQLiteDatabase,
  now = Date.now(),
  only?: { ownerType: ReminderOwner; ownerId: string },
): Promise<PlannedAlarm[]> {
  const sources = (await listAlarmSources(db)).filter(
    (source) => !only || (source.ownerType === only.ownerType && source.ownerId === only.ownerId),
  );
  const skipped = await listSkippedAlarms(db);
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

  return alarms
    .filter((alarm) => !skipped.has(alarm.id))
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_ALARMS);
}

/**
 * "2 hours and 5 minutes", "1 day and 3 hours", "less than a minute": how long until an
 * alarm rings, as the phone's clock app says it.
 */
export function describeTimeUntil(at: number, now = Date.now()) {
  const minutes = Math.max(0, Math.round((at - now) / 60_000));
  if (minutes < 1) return 'less than a minute';
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  const unit = (count: number, name: string) => `${count} ${name}${count === 1 ? '' : 's'}`;
  const parts = [
    days > 0 ? unit(days, 'day') : null,
    hours > 0 ? unit(hours, 'hour') : null,
    // Past a day, minutes are noise.
    mins > 0 && days === 0 ? unit(mins, 'minute') : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
}
