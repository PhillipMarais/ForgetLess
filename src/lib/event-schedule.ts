import { addDays, startOfDay, withTimeOf } from './dates';
import { buildRRule, firstOccurrenceFrom, type RepeatFrequency } from './recurrence';

/** The event editor's schedule: repeat first, then the picker that suits it, then times. */
export type EventSchedule = {
  repeat: RepeatFrequency | null;
  /** Weekly: 0 = Monday … 6 = Sunday. */
  weekdays: number[];
  /** Monthly: 1–31. */
  monthDay: number;
  allDay: boolean;
  startAt: number;
  /** For all-day events, the last day (inclusive). */
  endAt: number;
};

/**
 * The rule, and for a repeating event its first start and end. A repeating event lasts from
 * its start time to its end time (into the next day if the end time is earlier), and starts
 * on the first chosen weekday or day of the month on or after the start date.
 * `snap` false keeps the start as it is (editing a series without changing its rule).
 */
export function resolveEventSchedule(schedule: EventSchedule, snap = true) {
  const { repeat, allDay, startAt, endAt } = schedule;
  const rrule = buildRRule(repeat, { weekdays: schedule.weekdays, monthDay: schedule.monthDay });
  if (!rrule) return { rrule: null, startAt, endAt };

  let duration = 0;
  if (!allDay) {
    let end = withTimeOf(startOfDay(startAt), endAt);
    if (end <= startAt) end = addDays(end, 1);
    duration = end - startAt;
  }
  const first = snap ? (firstOccurrenceFrom(rrule, startAt, startAt) ?? startAt) : startAt;
  return { rrule, startAt: first, endAt: allDay ? startOfDay(first) : first + duration };
}
