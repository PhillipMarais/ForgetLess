import {
  addDays,
  addMonths,
  daysFromToday,
  formatDueLabel,
  formatWeekRange,
  monthGridDays,
  startOfDay,
  startOfWeek,
  weekDays,
  withTimeOf,
} from './dates';

// Mon 2 Nov 2026, 15:30 local time.
const NOW = new Date(2026, 10, 2, 15, 30);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('startOfDay', () => {
  it('returns local midnight of the same day', () => {
    const start = new Date(startOfDay(NOW));
    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2026, 10, 2]);
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0]);
  });
});

describe('addDays', () => {
  it('keeps the wall-clock time across month boundaries', () => {
    const result = new Date(addDays(new Date(2026, 0, 31, 8, 15).getTime(), 1));
    expect([result.getMonth(), result.getDate(), result.getHours(), result.getMinutes()]).toEqual([
      1, 1, 8, 15,
    ]);
  });

  it('goes backwards with negative days', () => {
    const result = new Date(addDays(startOfDay(NOW), -2));
    expect(result.getDate()).toBe(31);
    expect(result.getMonth()).toBe(9);
  });
});

describe('daysFromToday', () => {
  it.each([
    [new Date(2026, 10, 2, 23, 59), 0],
    [new Date(2026, 10, 3, 0, 1), 1],
    [new Date(2026, 10, 1, 12, 0), -1],
    [new Date(2026, 11, 2, 9, 0), 30],
  ])('%s is %i days from today', (date, expected) => {
    expect(daysFromToday(date.getTime())).toBe(expected);
  });
});

describe('formatDueLabel', () => {
  it.each([
    [new Date(2026, 10, 2), 'Today'],
    [new Date(2026, 10, 3), 'Tomorrow'],
    [new Date(2026, 10, 1), 'Yesterday'],
  ])('labels %s as %s for all-day items', (date, label) => {
    expect(formatDueLabel(date.getTime(), true)).toBe(label);
  });

  it('adds the time for timed items', () => {
    const label = formatDueLabel(new Date(2026, 10, 3, 14, 5).getTime(), false);
    expect(label).toMatch(/^Tomorrow /);
    expect(label).toMatch(/5/);
  });

  it('includes the year only for other years', () => {
    expect(formatDueLabel(new Date(2026, 11, 25).getTime(), true)).not.toMatch(/2026/);
    expect(formatDueLabel(new Date(2027, 0, 5).getTime(), true)).toMatch(/2027/);
  });
});

describe('monthGridDays', () => {
  it('covers the month in 6 Monday-first weeks', () => {
    const days = monthGridDays(NOW.getTime()).map((time) => new Date(time));

    expect(days).toHaveLength(42);
    expect(days.every((day, index) => day.getDay() === (index + 1) % 7)).toBe(true);
    // November 2026 starts on a Sunday, so the grid starts Monday 26 October.
    expect([days[0].getMonth(), days[0].getDate()]).toEqual([9, 26]);
    expect(days.filter((day) => day.getMonth() === 10)).toHaveLength(30);
    expect(days.every((day) => day.getHours() === 0)).toBe(true);
  });
});

describe('addMonths', () => {
  it('returns the 1st of the target month, across years', () => {
    const result = new Date(addMonths(new Date(2026, 11, 31).getTime(), 2));
    expect([result.getFullYear(), result.getMonth(), result.getDate()]).toEqual([2027, 1, 1]);
  });
});

describe('withTimeOf', () => {
  it("puts one time's hours and minutes on another day", () => {
    const result = new Date(withTimeOf(new Date(2026, 0, 5).getTime(), NOW.getTime()));
    expect([result.getDate(), result.getHours(), result.getMinutes()]).toEqual([5, 15, 30]);
  });
});

describe('startOfWeek / weekDays / formatWeekRange', () => {
  it('starts weeks on Monday', () => {
    // Sunday 8 Nov 2026 belongs to the week of Monday 2 Nov.
    expect(new Date(startOfWeek(new Date(2026, 10, 8, 18).getTime())).getDate()).toBe(2);
    expect(weekDays(NOW.getTime()).map((day) => new Date(day).getDate())).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it('labels a week inside one month and across two', () => {
    expect(formatWeekRange(NOW.getTime())).toMatch(/^2 – 8 Nov/);
    expect(formatWeekRange(new Date(2026, 10, 30).getTime())).toMatch(/^30 Nov – 6 Dec/);
  });
});
