import type { SQLiteDatabase } from 'expo-sqlite';

import { subscribeToChanges } from './changes';
import {
  createTask,
  deleteTask,
  listOpenTasksDueBefore,
  listTasks,
  setTaskCompleted,
} from './tasks';
import { createMigratedTestDatabase } from './testing/test-database';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 2, 9, 0).getTime();

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createMigratedTestDatabase();
});

describe('createTask', () => {
  it('stores the task with a UUID, trimmed title, time zone and timestamps', async () => {
    const id = await createTask(db, { title: '  Buy milk  ', dueAt: NOW, dueAllDay: true });
    const [task] = await listTasks(db);

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(task).toMatchObject({
      id,
      title: 'Buy milk',
      dueAt: NOW,
      dueAllDay: true,
      completedAt: null,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(task.createdAt).toBe(task.updatedAt);
  });

  it('notifies listeners of the tasks table', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToChanges(listener);
    await createTask(db, { title: 'Anything' });
    unsubscribe();

    expect(listener).toHaveBeenCalledWith('tasks');
  });
});

describe('listTasks', () => {
  it('orders open tasks by due date (undated last), then completed tasks', async () => {
    await createTask(db, { title: 'No date' });
    await createTask(db, { title: 'Later', dueAt: NOW + 2 * DAY });
    const doneId = await createTask(db, { title: 'Done', dueAt: NOW - DAY });
    await createTask(db, { title: 'Sooner', dueAt: NOW + DAY });
    await setTaskCompleted(db, doneId, true);

    const titles = (await listTasks(db)).map((task) => task.title);
    expect(titles).toEqual(['Sooner', 'Later', 'No date', 'Done']);
  });
});

describe('setTaskCompleted', () => {
  it('sets and clears completedAt', async () => {
    const id = await createTask(db, { title: 'Call plumber' });

    await setTaskCompleted(db, id, true);
    expect((await listTasks(db))[0].completedAt).toEqual(expect.any(Number));

    await setTaskCompleted(db, id, false);
    expect((await listTasks(db))[0].completedAt).toBeNull();
  });
});

describe('deleteTask', () => {
  it('soft-deletes: hidden from lists but the row is kept for sync', async () => {
    const id = await createTask(db, { title: 'Temporary' });
    await deleteTask(db, id);

    expect(await listTasks(db)).toEqual([]);
    const row = await db.getFirstAsync<{ deleted_at: number | null }>(
      'SELECT deleted_at FROM tasks WHERE id = ?',
      id,
    );
    expect(row?.deleted_at).toEqual(expect.any(Number));
  });
});

describe('listOpenTasksDueBefore', () => {
  it('returns only open, dated, non-deleted tasks due before the cutoff, oldest first', async () => {
    const cutoff = NOW + DAY;
    await createTask(db, { title: 'Due today', dueAt: NOW });
    await createTask(db, { title: 'Overdue', dueAt: NOW - DAY });
    await createTask(db, { title: 'Tomorrow', dueAt: cutoff });
    await createTask(db, { title: 'Undated' });
    const doneId = await createTask(db, { title: 'Done', dueAt: NOW });
    const deletedId = await createTask(db, { title: 'Deleted', dueAt: NOW });
    await setTaskCompleted(db, doneId, true);
    await deleteTask(db, deletedId);

    const titles = (await listOpenTasksDueBefore(db, cutoff)).map((task) => task.title);
    expect(titles).toEqual(['Overdue', 'Due today']);
  });
});
