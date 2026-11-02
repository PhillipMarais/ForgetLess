import { addDays, startOfDay } from './dates';

/**
 * Public holidays, worked out on the phone (no internet or paid service). Days declared one
 * year at a time (e.g. election days) can't be known in advance and aren't included.
 */
export const HOLIDAY_REGIONS = [
  { value: 'ZA', title: 'South Africa', description: 'Shows South African public holidays in the calendar.' },
  { value: 'none', title: 'None', description: 'Don’t show public holidays.' },
] as const;

export type HolidayRegion = (typeof HOLIDAY_REGIONS)[number]['value'];

export const HOLIDAY_REGION_VALUES: readonly string[] = HOLIDAY_REGIONS.map((region) => region.value);

/** Easter Sunday of `year` (Gregorian calendar), as local midnight. */
export function easterSunday(year: number) {
  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day).getTime();
}

/**
 * South Africa (Public Holidays Act 36 of 1994): a holiday on a Sunday is also taken on the
 * Monday after, or the next day that isn't already a holiday (e.g. Christmas on a Sunday).
 */
function southAfrica(year: number): Map<number, string> {
  const on = (month: number, day: number) => new Date(year, month - 1, day).getTime();
  const easter = easterSunday(year);
  const holidays: [number, string][] = [
    [on(1, 1), 'New Year’s Day'],
    [on(3, 21), 'Human Rights Day'],
    [addDays(easter, -2), 'Good Friday'],
    [addDays(easter, 1), 'Family Day'],
    [on(4, 27), 'Freedom Day'],
    [on(5, 1), 'Workers’ Day'],
    [on(6, 16), 'Youth Day'],
    [on(8, 9), 'National Women’s Day'],
    [on(9, 24), 'Heritage Day'],
    [on(12, 16), 'Day of Reconciliation'],
    [on(12, 25), 'Christmas Day'],
    [on(12, 26), 'Day of Goodwill'],
  ];
  const result = new Map(holidays);
  for (const [day, name] of holidays) {
    if (new Date(day).getDay() !== 0) continue;
    let observed = addDays(day, 1);
    while (result.has(observed)) observed = addDays(observed, 1);
    result.set(observed, `${name} (observed)`);
  }
  return result;
}

/** Holidays within [from, to), by day start (local midnight), with their names. */
export function holidaysBetween(region: HolidayRegion, from: number, to: number): Map<number, string> {
  const result = new Map<number, string>();
  if (region === 'none') return result;
  const first = new Date(from).getFullYear();
  const last = new Date(to - 1).getFullYear();
  for (let year = first; year <= last; year++) {
    for (const [day, name] of southAfrica(year)) {
      if (day >= startOfDay(from) && day < to) result.set(day, name);
    }
  }
  return result;
}
