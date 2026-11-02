import type { SQLiteDatabase } from 'expo-sqlite';

import { subscribeToChanges } from './changes';
import {
  createTask,
  deleteTask,
  getTask,
  listOpenTasksDueBefore,
  listTasks,
  listTasksDueBetween,
  setTaskCompleted,
  skipMissedRepeats,
  updateTask,
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

describe('repeating tasks', () => {
  it('completing moves the task to its next due date and logs the done occurrence', async () => {
    const id = await createTask(db, { title: 'Water plants', dueAt: NOW, rrule: 'FREQ=WEEKLY' });
    await setTaskCompleted(db, id, true);

    expect(await getTask(db, id)).toMatchObject({ dueAt: NOW + 7 * DAY, completedAt: null });
    const log = await db.getAllAsync<{ original_start: number; completed_at: number }>(
      "SELECT * FROM occurrence_exceptions WHERE owner_type = 'task' AND owner_id = ?",
      id,
    );
    expect(log).toEqual([expect.objectContaining({ original_start: NOW, completed_at: expect.any(Number) })]);
  });

  it('is completed for good once the series has no more occurrences', async () => {
    const id = await createTask(db, { title: 'Twice', dueAt: NOW, rrule: 'FREQ=DAILY;COUNT=1' });
    await setTaskCompleted(db, id, true);

    expect((await getTask(db, id))?.completedAt).toEqual(expect.any(Number));
  });

  it('drops the repeat rule from tasks without a due date', async () => {
    const id = await createTask(db, { title: 'Undated', rrule: 'FREQ=DAILY' });
    expect((await getTask(db, id))?.rrule).toBeNull();
  });
});

describe('skipMissedRepeats', () => {
  // Local midnights; the weekly case crosses the 25 Oct DST change on purpose.
  const TODAY = new Date(2026, 10, 2).getTime();

  it('moves missed repeating tasks to their first date on or after today', async () => {
    const weekly = await createTask(db, {
      title: 'Weekly',
      dueAt: new Date(2026, 9, 23).getTime(), // a Friday
      rrule: 'FREQ=WEEKLY',
    });
    const daily = await createTask(db, {
      title: 'Daily',
      dueAt: new Date(2026, 9, 30).getTime(),
      rrule: 'FREQ=DAILY',
    });

    expect(await skipMissedRepeats(db, TODAY)).toBe(2);
    expect((await getTask(db, weekly))?.dueAt).toBe(new Date(2026, 10, 6).getTime());
    expect((await getTask(db, daily))?.dueAt).toBe(TODAY);
  });

  it('leaves one-off, completed, current and ended tasks alone', async () => {
    const oneOff = await createTask(db, { title: 'Once', dueAt: TODAY - DAY });
    const current = await createTask(db, { title: 'Today', dueAt: TODAY, rrule: 'FREQ=DAILY' });
    const ended = await createTask(db, { title: 'Ended', dueAt: TODAY - DAY, rrule: 'FREQ=DAILY;COUNT=1' });
    const done = await createTask(db, { title: 'Done', dueAt: TODAY - DAY, rrule: 'FREQ=DAILY;COUNT=1' });
    await setTaskCompleted(db, done, true);

    expect(await skipMissedRepeats(db, TODAY)).toBe(0);
    expect((await getTask(db, oneOff))?.dueAt).toBe(TODAY - DAY);
    expect((await getTask(db, current))?.dueAt).toBe(TODAY);
    expect((await getTask(db, ended))?.dueAt).toBe(TODAY - DAY);
  });
});

describe('updateTask', () => {
  it('saves every editable field', async () => {
    const id = await createTask(db, { title: 'Draft' });
    await updateTask(db, id, {
      title: ' Final ',
      notes: 'Details',
      dueAt: NOW,
      dueAllDay: false,
      rrule: 'FREQ=MONTHLY',
    });

    expect(await getTask(db, id)).toMatchObject({
      title: 'Final',
      notes: 'Details',
      dueAt: NOW,
      dueAllDay: false,
      rrule: 'FREQ=MONTHLY',
    });
  });
});

describe('listTasksDueBetween', () => {
  it('returns open and completed tasks due in the range', async () => {
    await createTask(db, { title: 'Before', dueAt: NOW - DAY });
    await createTask(db, { title: 'Inside', dueAt: NOW });
    const doneId = await createTask(db, { title: 'Done inside', dueAt: NOW + 1 });
    await createTask(db, { title: 'At end', dueAt: NOW + DAY });
    await setTaskCompleted(db, doneId, true);

    const titles = (await listTasksDueBetween(db, NOW, NOW + DAY)).map((task) => task.title);
    expect(titles).toEqual(['Inside', 'Done inside']);
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
