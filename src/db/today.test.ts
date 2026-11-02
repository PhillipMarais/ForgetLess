import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createTask,
  dismissFromToday,
  getTask,
  listTaskEntriesBetween,
  listTodayTasks,
  reopenOccurrence,
  setTaskCompleted,
} from './tasks';
import { createMigratedTestDatabase } from './testing/test-database';

const at = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h).getTime();
const TODAY = at(2026, 11, 2);
const TOMORROW = at(2026, 11, 3);

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createMigratedTestDatabase();
});

const titles = async () =>
  (await listTodayTasks(db, TODAY, TOMORROW)).map((task) => [task.title, task.completedAt !== null]);

describe('the Today list', () => {
  it('keeps a task ticked off today, struck through, until it is swiped away', async () => {
    const id = await createTask(db, { title: 'Water plants', dueAt: at(2026, 11, 2, 9) });
    await setTaskCompleted(db, id, true);
    expect(await titles()).toEqual([['Water plants', true]]);

    const [task] = await listTodayTasks(db, TODAY, TOMORROW);
    await dismissFromToday(db, task, TODAY);
    expect(await titles()).toEqual([]);
  });

  it('shows the ticked-off date of a repeating task while the task moves on', async () => {
    const id = await createTask(db, { title: 'Stretch', dueAt: at(2026, 11, 2, 8), rrule: 'FREQ=DAILY' });
    await setTaskCompleted(db, id, true);

    const entries = await listTodayTasks(db, TODAY, TOMORROW);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ title: 'Stretch', occurrence: 'done', dueAt: at(2026, 11, 2, 8) });
    expect((await getTask(db, id))?.dueAt).toBe(at(2026, 11, 3, 8));

    await dismissFromToday(db, entries[0], TODAY);
    expect(await titles()).toEqual([]);
  });

  it('unticking a done date makes the task due on it again', async () => {
    const id = await createTask(db, { title: 'Stretch', dueAt: at(2026, 11, 2, 8), rrule: 'FREQ=DAILY' });
    await setTaskCompleted(db, id, true);
    await reopenOccurrence(db, id, at(2026, 11, 2, 8));

    expect((await getTask(db, id))?.dueAt).toBe(at(2026, 11, 2, 8));
    expect(await titles()).toEqual([['Stretch', false]]);
  });

  it('ticking a task off again after clearing it brings it back', async () => {
    const id = await createTask(db, { title: 'Call mum', dueAt: at(2026, 11, 2, 9) });
    await setTaskCompleted(db, id, true);
    const [task] = await listTodayTasks(db, TODAY, TOMORROW);
    await dismissFromToday(db, task, TODAY);
    await setTaskCompleted(db, id, false);
    await setTaskCompleted(db, id, true);
    expect(await titles()).toEqual([['Call mum', true]]);
  });
});

describe('listTaskEntriesBetween', () => {
  it('lists the done, current and upcoming dates of a repeating task', async () => {
    const id = await createTask(db, {
      title: 'Gym',
      dueAt: at(2026, 11, 2, 18),
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE',
    });
    await setTaskCompleted(db, id, true); // Monday done; now due Wednesday.

    const entries = await listTaskEntriesBetween(db, at(2026, 11, 2), at(2026, 11, 10));
    expect(entries.map((entry) => [entry.dueAt, entry.occurrence])).toEqual([
      [at(2026, 11, 2, 18), 'done'],
      [at(2026, 11, 4, 18), null],
      [at(2026, 11, 9, 18), 'upcoming'],
    ]);
  });
});
