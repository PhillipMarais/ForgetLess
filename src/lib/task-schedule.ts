import { nextHour, startOfDay, withTimeOf } from './dates';
import {
  buildRRule,
  firstOccurrenceFrom,
  repeatDetailsOf,
  repeatFrequencyOf,
  type RepeatFrequency,
} from './recurrence';

/**
 * What the task editor's "Repeat" and "Time" controls hold. Each repeat has its own picker:
 * a date (never, yearly), weekdays (weekly) or a day of the month (monthly); daily needs none.
 */
export type TaskSchedule = {
  repeat: RepeatFrequency | null;
  /** Weekly: 0 = Monday … 6 = Sunday. */
  weekdays: number[];
  /** Monthly: 1–31. */
  monthDay: number;
  /** Never: whether the task has a date at all. */
  hasDate: boolean;
  /** Never: the due day. Yearly: the day it repeats on. */
  date: number;
  hasTime: boolean;
  /** The time of day (its date part is ignored). */
  time: number;
};

/** Monday = 0 … Sunday = 6. */
export const mondayIndex = (time: number) => (new Date(time).getDay() + 6) % 7;

export function scheduleFrom(
  task: { dueAt: number | null; dueAllDay: boolean; rrule: string | null } | null,
  now = Date.now(),
): TaskSchedule {
  const due = task?.dueAt ?? null;
  const day = due ?? startOfDay(now);
  const details = repeatDetailsOf(task?.rrule ?? null);
  return {
    repeat: repeatFrequencyOf(task?.rrule ?? null),
    weekdays: details.weekdays?.length ? [...details.weekdays] : [mondayIndex(day)],
    monthDay: details.monthDay ?? new Date(day).getDate(),
    hasDate: due !== null,
    date: startOfDay(day),
    hasTime: due !== null && !task!.dueAllDay,
    time: due !== null && !task!.dueAllDay ? due : nextHour(now),
  };
}

export function sameSchedule(a: TaskSchedule, b: TaskSchedule) {
  return (
    a.repeat === b.repeat &&
    a.hasDate === b.hasDate &&
    a.hasTime === b.hasTime &&
    a.date === b.date &&
    (!a.hasTime || withTimeOf(0, a.time) === withTimeOf(0, b.time)) &&
    a.weekdays.join() === b.weekdays.join() &&
    a.monthDay === b.monthDay
  );
}

export type ResolvedSchedule = { dueAt: number | null; dueAllDay: boolean; rrule: string | null };

/**
 * The task's due time and rule. A repeating task is due on its first date from today
 * (from now, if it has a time that has already passed today).
 */
export function resolveSchedule(schedule: TaskSchedule, now = Date.now()): ResolvedSchedule {
  const { repeat, hasTime, time } = schedule;
  const at = (day: number) => (hasTime ? withTimeOf(day, time) : startOfDay(day));

  if (!repeat) {
    if (!schedule.hasDate) return { dueAt: null, dueAllDay: false, rrule: null };
    return { dueAt: at(schedule.date), dueAllDay: !hasTime, rrule: null };
  }

  const rrule = buildRRule(repeat, { weekdays: schedule.weekdays, monthDay: schedule.monthDay })!;
  const today = startOfDay(now);
  const anchor = at(repeat === 'yearly' ? schedule.date : today);
  const from = hasTime ? now : today;
  const dueAt = firstOccurrenceFrom(rrule, anchor, Math.max(from, anchor)) ?? anchor;
  return { dueAt, dueAllDay: !hasTime, rrule };
}
