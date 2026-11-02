import { resolveEventSchedule, type EventSchedule } from './event-schedule';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

const base: EventSchedule = {
  repeat: null,
  weekdays: [0],
  monthDay: 1,
  allDay: false,
  // Monday 2 November 2026, 09:00 to 10:00
  startAt: at(2026, 11, 2, 9),
  endAt: at(2026, 11, 2, 10),
};

describe('resolveEventSchedule', () => {
  it('keeps a one-off event as it is', () => {
    expect(resolveEventSchedule({ ...base, endAt: at(2026, 11, 4, 10) })).toEqual({
      rrule: null,
      startAt: at(2026, 11, 2, 9),
      endAt: at(2026, 11, 4, 10),
    });
  });

  it('starts a weekly event on the first chosen weekday from the start date', () => {
    // Wednesday and Friday, from Monday 2 November.
    expect(resolveEventSchedule({ ...base, repeat: 'weekly', weekdays: [2, 4] })).toEqual({
      rrule: 'FREQ=WEEKLY;BYDAY=WE,FR',
      startAt: at(2026, 11, 4, 9),
      endAt: at(2026, 11, 4, 10),
    });
  });

  it('starts a monthly event on its day of the month', () => {
    expect(resolveEventSchedule({ ...base, repeat: 'monthly', monthDay: 15 })).toMatchObject({
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=15',
      startAt: at(2026, 11, 15, 9),
    });
  });

  it('runs a repeating event past midnight when it ends at an earlier time than it starts', () => {
    const night = resolveEventSchedule({
      ...base,
      repeat: 'daily',
      startAt: at(2026, 11, 2, 22),
      endAt: at(2026, 11, 2, 2),
    });
    expect(night.endAt - night.startAt).toBe(4 * 60 * 60 * 1000);
  });

  it('can leave the start where it is (editing a series without changing its rule)', () => {
    expect(resolveEventSchedule({ ...base, repeat: 'weekly', weekdays: [2] }, false).startAt).toBe(base.startAt);
  });
});
