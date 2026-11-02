import {
  buildRRule,
  describeRepeat,
  firstOccurrenceFrom,
  nextOccurrenceAfter,
  occurrencesBetween,
  occurrencesLimited,
  ordinal,
  repeatDetailsOf,
  repeatFrequencyOf,
  shiftWallClock,
} from './recurrence';

const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

describe('buildRRule / repeatFrequencyOf / describeRepeat', () => {
  it('round-trips each frequency', () => {
    for (const frequency of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
      expect(repeatFrequencyOf(buildRRule(frequency))).toBe(frequency);
    }
  });

  it('treats null as not repeating', () => {
    expect(buildRRule(null)).toBeNull();
    expect(repeatFrequencyOf(null)).toBeNull();
    expect(describeRepeat(null)).toBe('Does not repeat');
    expect(describeRepeat('FREQ=WEEKLY')).toBe('Every week');
  });
});

describe('occurrencesBetween', () => {
  it('expands a weekly rule within [from, to)', () => {
    const start = at(2026, 11, 2, 9); // Monday 09:00
    const result = occurrencesBetween('FREQ=WEEKLY', start, at(2026, 11, 1), at(2026, 11, 23, 9));
    expect(result).toEqual([at(2026, 11, 2, 9), at(2026, 11, 9, 9), at(2026, 11, 16, 9)]);
  });

  it('includes an occurrence exactly at `from` and excludes one exactly at `to`', () => {
    const start = at(2026, 11, 2, 9);
    expect(occurrencesBetween('FREQ=DAILY', start, start, at(2026, 11, 3, 9))).toEqual([start]);
  });

  it('never returns occurrences before the series starts', () => {
    const start = at(2026, 11, 10, 9);
    expect(occurrencesBetween('FREQ=DAILY', start, at(2026, 11, 1), at(2026, 11, 11))).toEqual([
      start,
    ]);
  });

  it('keeps the wall-clock time across a DST change', () => {
    // Tests run in Europe/London (jest.global-setup.js), where DST ends on 25 Oct 2026.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/London');
    const start = at(2026, 10, 20, 9);
    const result = occurrencesBetween('FREQ=DAILY', start, start, at(2026, 10, 28));
    expect(result.map((time) => new Date(time).getHours())).toEqual(Array(8).fill(9));
  });

  it('skips months without the start day for monthly rules', () => {
    const start = at(2026, 1, 31, 8);
    const result = occurrencesBetween('FREQ=MONTHLY', start, start, at(2026, 6, 1));
    expect(result).toEqual([at(2026, 1, 31, 8), at(2026, 3, 31, 8), at(2026, 5, 31, 8)]);
  });
});

describe('shiftWallClock', () => {
  it('moves by the same wall-clock change across a DST change', () => {
    // 09:00 -> 10:00 in October (summer time) moves a December 09:00 to 10:00 (winter time).
    const moved = shiftWallClock(at(2026, 12, 7, 9), at(2026, 10, 5, 9), at(2026, 10, 5, 10));
    expect(moved).toBe(at(2026, 12, 7, 10));
  });

  it('moves by whole days', () => {
    expect(shiftWallClock(at(2026, 11, 16, 9), at(2026, 11, 2, 9), at(2026, 11, 9, 9))).toBe(
      at(2026, 11, 23, 9),
    );
  });
});

describe('nextOccurrenceAfter', () => {
  it('returns the next occurrence strictly after the given time', () => {
    const start = at(2026, 11, 2, 9);
    expect(nextOccurrenceAfter('FREQ=WEEKLY', start, start)).toBe(at(2026, 11, 9, 9));
    expect(nextOccurrenceAfter('FREQ=YEARLY', start, start)).toBe(at(2027, 11, 2, 9));
  });

  it('returns null when the series has ended', () => {
    const start = at(2026, 11, 2, 9);
    expect(nextOccurrenceAfter('FREQ=DAILY;COUNT=2', start, at(2026, 11, 3, 9))).toBeNull();
  });
});

describe('weekday and month-day repeats', () => {
  it('builds and reads back chosen weekdays and days of the month', () => {
    const weekly = buildRRule('weekly', { weekdays: [4, 0, 2] });
    expect(weekly).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    expect(repeatDetailsOf(weekly).weekdays).toEqual([0, 2, 4]);
    expect(repeatFrequencyOf(weekly)).toBe('weekly');

    const monthly = buildRRule('monthly', { monthDay: 15 });
    expect(monthly).toBe('FREQ=MONTHLY;BYMONTHDAY=15');
    expect(repeatDetailsOf(monthly).monthDay).toBe(15);
  });

  it('ignores details that do not fit the frequency', () => {
    expect(buildRRule('daily', { weekdays: [1], monthDay: 3 })).toBe('FREQ=DAILY');
  });

  it('describes them in words', () => {
    expect(describeRepeat('FREQ=WEEKLY;BYDAY=MO,WE')).toBe('Every Mon, Wed');
    expect(describeRepeat('FREQ=MONTHLY;BYMONTHDAY=22')).toBe('Every month on the 22nd');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 31].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '31st',
    ]);
  });

  it('only lands on the chosen weekdays', () => {
    const start = at(2026, 11, 2, 8); // Monday
    const result = occurrencesBetween('FREQ=WEEKLY;BYDAY=TU,TH', start, start, at(2026, 11, 13));
    expect(result).toEqual([at(2026, 11, 3, 8), at(2026, 11, 5, 8), at(2026, 11, 10, 8), at(2026, 11, 12, 8)]);
  });

  it('finds the first date from a time, and caps how many it lists', () => {
    const start = at(2026, 11, 2, 8);
    expect(firstOccurrenceFrom('FREQ=DAILY', start, start)).toBe(start);
    expect(firstOccurrenceFrom('FREQ=DAILY', start, start + 1)).toBe(at(2026, 11, 3, 8));
    expect(occurrencesLimited('FREQ=DAILY', start, start, at(2027, 1, 1), 3)).toEqual([
      at(2026, 11, 2, 8),
      at(2026, 11, 3, 8),
      at(2026, 11, 4, 8),
    ]);
  });
});
