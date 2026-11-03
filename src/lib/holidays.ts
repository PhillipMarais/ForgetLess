import type HolidaysLibrary from 'date-holidays';

import { addDays, startOfDay } from './dates';
import { ForgetlessDevice } from './device';

/**
 * Public holidays, worked out on the phone (no internet or paid service). South Africa's are
 * built in; every other country's come from the date-holidays library (data CC BY 3.0). Days
 * declared one year at a time (e.g. election days) can't be known in advance, so with
 * calendar access the phone's Google holiday calendar adds them.
 */

/** 'auto' follows the phone's region (no location access needed); else a country code. */
export type HolidayRegion = string;

/** The phone's country from its language and region setting, e.g. 'ZA' for en-ZA. */
export function phoneRegion(): string | null {
  try {
    // e.g. "en-ZA" or "af-Latn-ZA"; the region is the two capital letters.
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return /[-_]([A-Z]{2})(?:$|[-_])/.exec(locale)?.[1] ?? null;
  } catch {
    return null;
  }
}

let library: typeof HolidaysLibrary | null = null;

/** Loaded on first use: the holiday data is large and not needed at start-up. */
function holidaysLibrary() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  library ??= require('date-holidays') as typeof HolidaysLibrary;
  return library;
}

let countries: Record<string, string> | null = null;

/** Every country with known holidays, by code. */
function countryNames() {
  countries ??= { ...new (holidaysLibrary())().getCountries('en'), ZA: 'South Africa' };
  return countries;
}

export function isHolidayRegion(value: unknown): value is HolidayRegion {
  return value === 'auto' || value === 'none' || (typeof value === 'string' && value in countryNames());
}

/** The country `region` stands for, or null for none. */
export function resolveHolidayRegion(region: HolidayRegion): string | null {
  if (region === 'none') return null;
  if (region === 'auto') {
    const phone = phoneRegion();
    return phone && phone in countryNames() ? phone : null;
  }
  return region;
}

/** A setting's name for people, e.g. "Automatic (South Africa)". */
export function holidayRegionTitle(region: HolidayRegion) {
  if (region === 'none') return 'None';
  if (region === 'auto') {
    const country = resolveHolidayRegion('auto');
    return country ? `Automatic (${countryNames()[country]})` : 'Automatic';
  }
  return countryNames()[region] ?? region;
}

/** Choices for Settings: Automatic, None, then every country by name. */
export function holidayRegionChoices() {
  const phone = resolveHolidayRegion('auto');
  const names = countryNames();
  return [
    {
      value: 'auto',
      title: holidayRegionTitle('auto'),
      description: phone
        ? 'Follows the region set on your phone.'
        : 'Your phone has no region set, so no holidays show. Pick a country instead.',
    },
    { value: 'none', title: 'None', description: 'Don’t show public holidays.' },
    ...Object.entries(names)
      .sort(([, a], [, b]) => a.localeCompare(b))
      .map(([code, name]) => ({ value: code, title: name, description: undefined as string | undefined })),
  ];
}

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

const yearCache = new Map<string, Map<number, string>>();

/** One country's public holidays in a year, by day start (local midnight). */
function countryHolidays(country: string, year: number): Map<number, string> {
  const key = `${country}:${year}`;
  let result = yearCache.get(key);
  if (result) return result;
  result = new Map();
  if (country === 'ZA') result = southAfrica(year);
  else {
    const Holidays = holidaysLibrary();
    for (const holiday of new Holidays(country).getHolidays(year, 'en') || []) {
      if (holiday.type !== 'public') continue;
      // "2026-04-27 00:00:00": the date in that country, shown as that day here.
      const [y, m, d] = holiday.date.slice(0, 10).split('-').map(Number);
      const day = new Date(y, m - 1, d).getTime();
      if (!result.has(day)) result.set(day, holiday.name);
    }
  }
  yearCache.set(key, result);
  return result;
}

/** How long the phone's holiday calendar is read from memory before it is asked again. */
const PHONE_CACHE_MS = 60_000;
const phoneCache = new Map<string, { at: number; holidays: Map<number, string> }>();

/** Forgets what was read from the phone's calendar, e.g. once calendar access is given. */
export function clearPhoneHolidayCache() {
  phoneCache.clear();
}

/**
 * Public holidays (not observances like Mother's Day) in the phone's Google holiday calendars
 * within [from, to). Empty without calendar access, on web and in tests.
 */
function phoneCalendarHolidays(from: number, to: number): Map<number, string> {
  const key = `${from}-${to}`;
  const cached = phoneCache.get(key);
  if (cached && Date.now() - cached.at < PHONE_CACHE_MS) return cached.holidays;
  const holidays = new Map<number, string>();
  try {
    // A day either side: all-day events start at midnight UTC, not local midnight.
    for (const holiday of ForgetlessDevice?.phoneHolidays(addDays(from, -1), addDays(to, 1)) ?? []) {
      if (/observance/i.test(holiday.description)) continue;
      const date = new Date(holiday.begin);
      const day = holiday.allDay
        ? new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).getTime()
        : startOfDay(holiday.begin);
      if (day >= startOfDay(from) && day < to && !holidays.has(day)) holidays.set(day, holiday.title);
    }
  } catch {
    // No phone holidays; the built-in ones still show.
  }
  phoneCache.set(key, { at: Date.now(), holidays });
  return holidays;
}

/**
 * Holidays within [from, to), by day start (local midnight), with their names. With
 * `fromPhone`, days the phone's holiday calendar has that the built-in list lacks are added.
 */
export function holidaysBetween(
  region: HolidayRegion,
  from: number,
  to: number,
  fromPhone = false,
): Map<number, string> {
  const result = new Map<number, string>();
  if (region === 'none') return result;
  const country = resolveHolidayRegion(region);
  if (country) {
    const first = new Date(from).getFullYear();
    const last = new Date(to - 1).getFullYear();
    for (let year = first; year <= last; year++) {
      for (const [day, name] of countryHolidays(country, year)) {
        if (day >= startOfDay(from) && day < to) result.set(day, name);
      }
    }
  }
  if (fromPhone) {
    for (const [day, name] of phoneCalendarHolidays(from, to)) {
      if (!result.has(day)) result.set(day, name);
    }
  }
  return result;
}
