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

export function formatDueLabel(dueAt: number, allDay: boolean) {
  const days = daysFromToday(dueAt);
  const time = allDay
    ? ''
    : ` ${new Date(dueAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;

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
