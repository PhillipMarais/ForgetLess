import { RRule } from 'rrule';

/**
 * Repeating items store an RRULE without DTSTART (e.g. "FREQ=WEEKLY"); the item's own
 * start time is the series anchor.
 *
 * rrule works in UTC, which would shift wall-clock times across DST changes. So times are
 * converted to "floating" dates (local wall-clock fields stored as UTC) before expanding,
 * and back to local instants after. A 09:00 weekly event stays at 09:00 all year.
 * Times follow the device's current time zone; the stored IANA zone is kept for later.
 */

export const REPEAT_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export type RepeatFrequency = (typeof REPEAT_FREQUENCIES)[number];

const FREQUENCY_TO_RRULE: Record<RepeatFrequency, string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
};

const REPEAT_LABELS: Record<RepeatFrequency, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};

/** Choices for a repeat picker, "Never" first. */
export const REPEAT_OPTIONS: readonly { label: string; value: RepeatFrequency | null }[] = [
  { label: 'Never', value: null },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export function buildRRule(frequency: RepeatFrequency | null): string | null {
  return frequency ? `FREQ=${FREQUENCY_TO_RRULE[frequency]}` : null;
}

export function repeatFrequencyOf(rrule: string | null): RepeatFrequency | null {
  const freq = rrule?.match(/FREQ=([A-Z]+)/)?.[1];
  return REPEAT_FREQUENCIES.find((frequency) => FREQUENCY_TO_RRULE[frequency] === freq) ?? null;
}

export function describeRepeat(rrule: string | null) {
  const frequency = repeatFrequencyOf(rrule);
  return frequency ? REPEAT_LABELS[frequency] : 'Does not repeat';
}

function toFloating(time: number) {
  const d = new Date(time);
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
      d.getMilliseconds(),
    ),
  );
}

function fromFloating(date: Date) {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ).getTime();
}

function ruleFor(rrule: string, start: number) {
  return new RRule({ ...RRule.parseString(rrule), dtstart: toFloating(start) });
}

/** Start times of the series' occurrences with `from <= start < to`, in order. */
export function occurrencesBetween(rrule: string, start: number, from: number, to: number) {
  if (to <= from) return [];
  return ruleFor(rrule, start)
    .between(toFloating(from), toFloating(to), true)
    .map(fromFloating)
    .filter((time) => time >= from && time < to);
}

/**
 * Moves `time` by the same wall-clock change that took `from` to `to`, so a series moved
 * from 09:00 to 10:00 moves each occurrence to 10:00 even across a DST change.
 */
export function shiftWallClock(time: number, from: number, to: number) {
  const shift = toFloating(to).getTime() - toFloating(from).getTime();
  return fromFloating(new Date(toFloating(time).getTime() + shift));
}

/** The first occurrence strictly after `after`, or null if the series has ended. */
export function nextOccurrenceAfter(rrule: string, start: number, after: number) {
  const next = ruleFor(rrule, start).after(toFloating(after), false);
  return next ? fromFloating(next) : null;
}
