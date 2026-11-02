const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight of the day containing `time`. */
export function startOfDay(time: number | Date = Date.now()) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Same local wall-clock time `days` later (DST-safe, unlike adding 24h). */
export function addDays(time: number, days: number) {
  const date = new Date(time);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** Whole local days from today to the day containing `time` (negative = past). */
export function daysFromToday(time: number, today = startOfDay()) {
  return Math.round((startOfDay(time) - today) / DAY_MS);
}

/** `date`'s day with `time`'s hours and minutes. */
export function withTimeOf(date: number, time: number) {
  const result = new Date(date);
  const source = new Date(time);
  result.setHours(source.getHours(), source.getMinutes(), 0, 0);
  return result.getTime();
}

/** The next whole hour after `time`. */
export function nextHour(time: number = Date.now()) {
  const date = new Date(time);
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date.getTime();
}

export function formatTime(time: number) {
  return new Date(time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Weeks start on Monday (ISO 8601, the norm in South Africa and Europe). */
export const WEEK_STARTS_ON = 1;

/** Midnight on the 1st of the month containing `time`. */
export function startOfMonth(time: number) {
  const date = new Date(startOfDay(time));
  date.setDate(1);
  return date.getTime();
}

/** The 1st of the month `months` away from the month containing `time`. */
export function addMonths(time: number, months: number) {
  const date = new Date(startOfMonth(time));
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}

/** 42 day starts (6 full weeks) covering the month containing `time`, for a month grid. */
export function monthGridDays(time: number) {
  const first = startOfMonth(time);
  const offset = (new Date(first).getDay() - WEEK_STARTS_ON + 7) % 7;
  const gridStart = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

/** Short weekday names in grid order, e.g. ["Mon", "Tue", …]. */
export function weekdayLabels() {
  // 5 Jan 2026 is a Monday.
  return Array.from({ length: 7 }, (_, index) =>
    new Date(2026, 0, 5 + ((index + WEEK_STARTS_ON - 1 + 7) % 7)).toLocaleDateString(undefined, {
      weekday: 'short',
    }),
  );
}

export function formatDueLabel(dueAt: number, allDay: boolean) {
  const days = daysFromToday(dueAt);
  const time = allDay ? '' : ` ${formatTime(dueAt)}`;

  if (days === 0) return `Today${time}`;
  if (days === 1) return `Tomorrow${time}`;
  if (days === -1) return `Yesterday${time}`;

  const sameYear = new Date(dueAt).getFullYear() === new Date().getFullYear();
  const date = new Date(dueAt).toLocaleDateString(undefined, {
    weekday: Math.abs(days) < 7 ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  });
  return `${date}${time}`;
}

export function formatLongDate(time: number = Date.now()) {
  return new Date(time).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
