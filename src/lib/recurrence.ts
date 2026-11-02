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

/** Weekdays as numbers, Monday first: 0 = Monday … 6 = Sunday (RRULE's own order). */
export const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

/** Extra detail for a repeat: which weekdays (weekly), which day of the month (monthly). */
export type RepeatDetails = {
  /** 0 = Monday … 6 = Sunday. Empty or missing: the start date's weekday. */
  weekdays?: readonly number[];
  /** 1–31. Missing: the start date's day. Months without that day are skipped. */
  monthDay?: number;
};

export function buildRRule(
  frequency: RepeatFrequency | null,
  details: RepeatDetails = {},
): string | null {
  if (!frequency) return null;
  let rule = `FREQ=${FREQUENCY_TO_RRULE[frequency]}`;
  if (frequency === 'weekly' && details.weekdays?.length) {
    const days = [...new Set(details.weekdays)].sort((a, b) => a - b);
    rule += `;BYDAY=${days.map((day) => WEEKDAY_CODES[day]).join(',')}`;
  }
  if (frequency === 'monthly' && details.monthDay) rule += `;BYMONTHDAY=${details.monthDay}`;
  return rule;
}

export function repeatFrequencyOf(rrule: string | null): RepeatFrequency | null {
  const freq = rrule?.match(/FREQ=([A-Z]+)/)?.[1];
  return REPEAT_FREQUENCIES.find((frequency) => FREQUENCY_TO_RRULE[frequency] === freq) ?? null;
}

export function repeatDetailsOf(rrule: string | null): RepeatDetails {
  const byDay = rrule?.match(/BYDAY=([A-Z,]+)/)?.[1];
  const byMonthDay = rrule?.match(/BYMONTHDAY=(\d+)/)?.[1];
  return {
    weekdays: byDay
      ? byDay.split(',').map((code) => WEEKDAY_CODES.indexOf(code as (typeof WEEKDAY_CODES)[number]))
      : undefined,
    monthDay: byMonthDay ? Number(byMonthDay) : undefined,
  };
}

/** 1 → "1st", 22 → "22nd". */
export function ordinal(day: number) {
  const tens = day % 100;
  const suffix =
    tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
  return `${day}${suffix}`;
}

/** Short weekday name for 0 = Monday … 6 = Sunday, in the phone's language. */
export function weekdayName(day: number, style: 'short' | 'long' = 'short') {
  // 5 Jan 2026 is a Monday.
  return new Date(2026, 0, 5 + day).toLocaleDateString(undefined, { weekday: style });
}

export function describeRepeat(rrule: string | null) {
  const frequency = repeatFrequencyOf(rrule);
  if (!frequency) return 'Does not repeat';
  const { weekdays, monthDay } = repeatDetailsOf(rrule);
  if (frequency === 'weekly' && weekdays?.length) {
    if (weekdays.length === 7) return 'Every day';
    return `Every ${weekdays.map((day) => weekdayName(day)).join(', ')}`;
  }
  if (frequency === 'monthly' && monthDay) return `Every month on the ${ordinal(monthDay)}`;
  return REPEAT_LABELS[frequency];
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

/** The first occurrence at or after `from`, or null if the series has ended. */
export function firstOccurrenceFrom(rrule: string, start: number, from: number) {
  return nextOccurrenceAfter(rrule, start, from - 1);
}

/** Up to `limit` occurrence starts with `from <= start < to`. */
export function occurrencesLimited(
  rrule: string,
  start: number,
  from: number,
  to: number,
  limit: number,
) {
  const result: number[] = [];
  let next = firstOccurrenceFrom(rrule, start, from);
  while (next !== null && next < to && result.length < limit) {
    result.push(next);
    next = nextOccurrenceAfter(rrule, start, next);
  }
  return result;
}
