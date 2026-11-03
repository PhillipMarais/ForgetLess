import type { SQLiteDatabase } from 'expo-sqlite';

import { describeTimeUntil, planAlarms, taskAlarms } from '@/lib/alarms';

import { createEvent, deleteEvent } from './events';
import { getAlarmOffset, listAlarmSources, setAlarmOffset, skipAlarm } from './reminders';
import { createTask, getTask, setTaskCompleted } from './tasks';
import { createMigratedTestDatabase } from './testing/test-database';

const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();
const NOW = at(2026, 11, 2, 12);

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createMigratedTestDatabase();
});

const event = (title: string, startAt: number, endAt: number) =>
  createEvent(db, { title, notes: null, allDay: false, rrule: null, startAt, endAt });

describe('alarms on items', () => {
  it('sets, changes and removes an alarm', async () => {
    const id = await createTask(db, { title: 'Pills', dueAt: at(2026, 11, 2, 20) });
    expect(await getAlarmOffset(db, 'task', id)).toBeNull();
    await setAlarmOffset(db, 'task', id, 0);
    await setAlarmOffset(db, 'task', id, 15);
    expect(await getAlarmOffset(db, 'task', id)).toBe(15);
    expect(await listAlarmSources(db)).toEqual([{ ownerType: 'task', ownerId: id, offsetMinutes: 15 }]);
    await setAlarmOffset(db, 'task', id, null);
    expect(await getAlarmOffset(db, 'task', id)).toBeNull();
  });

  it('forgets the alarms of deleted items', async () => {
    const id = await event('Dentist', at(2026, 11, 3, 14), at(2026, 11, 3, 15));
    await setAlarmOffset(db, 'event', id, 30);
    await deleteEvent(db, id);
    expect(await listAlarmSources(db)).toEqual([]);
  });
});

describe('planning alarms', () => {
  it('rings at or before a timed task, never for past times or untimed tasks', async () => {
    const id = await createTask(db, { title: 'Pills', dueAt: at(2026, 11, 2, 20) });
    const task = (await getTask(db, id))!;
    expect(taskAlarms(task, 0, NOW)).toEqual([
      {
        id: `task:${id}:${at(2026, 11, 2, 20)}`,
        at: at(2026, 11, 2, 20),
        title: 'Pills',
        body: expect.stringContaining('Due now'),
        detail: expect.stringMatching(/^Due \d/),
        ownerType: 'task',
        ownerId: id,
        repeating: false,
      },
    ]);
    expect(taskAlarms(task, 15, NOW)[0].at).toBe(at(2026, 11, 2, 19, 45));
    expect(taskAlarms(task, 0, at(2026, 11, 2, 21))).toEqual([]);
    expect(taskAlarms({ ...task, dueAllDay: true }, 0, NOW)).toEqual([]);
  });

  it('rings on each upcoming date of a repeating task, and not for a done task', async () => {
    const id = await createTask(db, { title: 'Stretch', dueAt: at(2026, 11, 2, 8), rrule: 'FREQ=DAILY' });
    const alarms = taskAlarms((await getTask(db, id))!, 0, NOW);
    // 08:00 today has passed, so the first alarm is tomorrow.
    expect(alarms[0].at).toBe(at(2026, 11, 3, 8));
    expect(alarms.length).toBeGreaterThan(14);

    const once = await createTask(db, { title: 'Once', dueAt: at(2026, 11, 2, 20) });
    await setTaskCompleted(db, once, true);
    expect(taskAlarms((await getTask(db, once))!, 0, NOW)).toEqual([]);
  });

  it('plans task and event alarms together, soonest first', async () => {
    const task = await createTask(db, { title: 'Pills', dueAt: at(2026, 11, 2, 20) });
    const dentist = await event('Dentist', at(2026, 11, 2, 14), at(2026, 11, 2, 15));
    const quiet = await createTask(db, { title: 'No alarm', dueAt: at(2026, 11, 2, 16) });
    await setAlarmOffset(db, 'task', task, 0);
    await setAlarmOffset(db, 'event', dentist, 30);

    const planned = await planAlarms(db, NOW);
    expect(planned.map((alarm) => [alarm.title, alarm.at])).toEqual([
      ['Dentist', at(2026, 11, 2, 13, 30)],
      ['Pills', at(2026, 11, 2, 20)],
    ]);
    expect(planned.some((alarm) => alarm.id.includes(quiet))).toBe(false);
  });

  it('leaves out an alarm cancelled on its own, but keeps the other alarms', async () => {
    const id = await createTask(db, { title: 'Stretch', dueAt: at(2026, 11, 3, 8), rrule: 'FREQ=DAILY' });
    await setAlarmOffset(db, 'task', id, 0);
    const [first, second] = await planAlarms(db, NOW);
    expect(first.repeating).toBe(true);

    await skipAlarm(db, first.id, 'task', id);
    const after = await planAlarms(db, NOW);
    expect(after.some((alarm) => alarm.id === first.id)).toBe(false);
    expect(after[0].id).toBe(second.id);
  });

  it('plans for one item only when asked', async () => {
    const a = await createTask(db, { title: 'A', dueAt: at(2026, 11, 2, 20) });
    const b = await createTask(db, { title: 'B', dueAt: at(2026, 11, 2, 21) });
    await setAlarmOffset(db, 'task', a, 0);
    await setAlarmOffset(db, 'task', b, 0);
    const planned = await planAlarms(db, NOW, { ownerType: 'task', ownerId: b });
    expect(planned.map((alarm) => alarm.title)).toEqual(['B']);
  });
});

describe('describeTimeUntil', () => {
  const minute = 60_000;
  it('says how long until an alarm rings, like the clock app', () => {
    expect(describeTimeUntil(NOW + 20_000, NOW)).toBe('less than a minute');
    expect(describeTimeUntil(NOW + minute, NOW)).toBe('1 minute');
    expect(describeTimeUntil(NOW + 125 * minute, NOW)).toBe('2 hours and 5 minutes');
    expect(describeTimeUntil(NOW + 60 * minute, NOW)).toBe('1 hour');
    expect(describeTimeUntil(NOW + (26 * 60 + 7) * minute, NOW)).toBe('1 day and 2 hours');
  });
});
