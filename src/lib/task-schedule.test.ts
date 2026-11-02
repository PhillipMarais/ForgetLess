import { resolveSchedule, sameSchedule, scheduleFrom, type TaskSchedule } from './task-schedule';

const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

// Monday 2 November 2026, 10:00.
const NOW = at(2026, 11, 2, 10);

const base: TaskSchedule = {
  repeat: null,
  weekdays: [0],
  monthDay: 2,
  hasDate: true,
  date: at(2026, 11, 2),
  hasTime: false,
  time: at(2026, 11, 2, 9),
};

describe('resolveSchedule', () => {
  it('gives no due date to a task without a date', () => {
    expect(resolveSchedule({ ...base, hasDate: false }, NOW)).toEqual({ dueAt: null, dueAllDay: false, rrule: null });
  });

  it('uses the chosen day, with or without a time', () => {
    expect(resolveSchedule({ ...base, date: at(2026, 11, 5) }, NOW)).toEqual({
      dueAt: at(2026, 11, 5),
      dueAllDay: true,
      rrule: null,
    });
    expect(resolveSchedule({ ...base, hasTime: true, time: at(2000, 1, 1, 14, 30) }, NOW).dueAt).toBe(
      at(2026, 11, 2, 14, 30),
    );
  });

  it('starts a daily task today, or tomorrow when its time has passed', () => {
    expect(resolveSchedule({ ...base, repeat: 'daily' }, NOW)).toEqual({
      dueAt: at(2026, 11, 2),
      dueAllDay: true,
      rrule: 'FREQ=DAILY',
    });
    expect(resolveSchedule({ ...base, repeat: 'daily', hasTime: true, time: at(2026, 1, 1, 8) }, NOW).dueAt).toBe(
      at(2026, 11, 3, 8),
    );
    expect(resolveSchedule({ ...base, repeat: 'daily', hasTime: true, time: at(2026, 1, 1, 18) }, NOW).dueAt).toBe(
      at(2026, 11, 2, 18),
    );
  });

  it('is next due on the first chosen weekday', () => {
    // Wednesday and Friday, from a Monday.
    const result = resolveSchedule({ ...base, repeat: 'weekly', weekdays: [2, 4], hasTime: true, time: at(2026, 1, 1, 7) }, NOW);
    expect(result.rrule).toBe('FREQ=WEEKLY;BYDAY=WE,FR');
    expect(result.dueAt).toBe(at(2026, 11, 4, 7));
  });

  it('is next due on the chosen day of the month', () => {
    expect(resolveSchedule({ ...base, repeat: 'monthly', monthDay: 1 }, NOW).dueAt).toBe(at(2026, 12, 1));
    expect(resolveSchedule({ ...base, repeat: 'monthly', monthDay: 20 }, NOW).dueAt).toBe(at(2026, 11, 20));
  });

  it('is next due on the chosen date of the year', () => {
    expect(resolveSchedule({ ...base, repeat: 'yearly', date: at(2026, 3, 14) }, NOW).dueAt).toBe(at(2027, 3, 14));
    expect(resolveSchedule({ ...base, repeat: 'yearly', date: at(2026, 12, 25) }, NOW).dueAt).toBe(at(2026, 12, 25));
  });
});

describe('scheduleFrom / sameSchedule', () => {
  it('reads a weekly task back into the editor', () => {
    const schedule = scheduleFrom({ dueAt: at(2026, 11, 4, 7), dueAllDay: false, rrule: 'FREQ=WEEKLY;BYDAY=WE,FR' }, NOW);
    expect(schedule).toMatchObject({ repeat: 'weekly', weekdays: [2, 4], hasTime: true, hasDate: true });
  });

  it('defaults a new task to its weekday and day of the month', () => {
    const schedule = scheduleFrom(null, NOW);
    expect(schedule).toMatchObject({ repeat: null, hasDate: false, hasTime: false, weekdays: [0], monthDay: 2 });
  });

  it('notices changes that move the due date, and ignores the time while it is off', () => {
    expect(sameSchedule(base, { ...base, time: at(2026, 11, 2, 20) })).toBe(true);
    expect(sameSchedule(base, { ...base, hasTime: true })).toBe(false);
    expect(sameSchedule(base, { ...base, weekdays: [1] })).toBe(false);
  });
});
