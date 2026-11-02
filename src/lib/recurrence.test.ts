import {
  buildRRule,
  describeRepeat,
  nextOccurrenceAfter,
  occurrencesBetween,
  repeatFrequencyOf,
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
