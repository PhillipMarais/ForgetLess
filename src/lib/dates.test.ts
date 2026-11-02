import { addDays, daysFromToday, formatDueLabel, startOfDay } from './dates';

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
