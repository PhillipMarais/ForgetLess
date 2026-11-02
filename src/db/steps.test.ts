import type { SQLiteDatabase } from 'expo-sqlite';

import { listSteps, saveSteps } from './steps';
import { createTask, deleteTask, getTask, listTasks, setTaskCompleted, toggleStep } from './tasks';
import { createMigratedTestDatabase } from './testing/test-database';

const at = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h).getTime();

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createMigratedTestDatabase();
});

async function taskWithSteps(titles: string[], input: Parameters<typeof createTask>[1] = { title: 'Move house' }) {
  const id = await createTask(db, input);
  await saveSteps(db, id, titles.map((title) => ({ id: null, title, doneAt: null })));
  return id;
}

describe('task steps', () => {
  it('saves steps in order, drops empty ones, and lists them with the task', async () => {
    const id = await taskWithSteps(['Pack', '', 'Load van', 'Unpack']);
    expect((await listSteps(db, id)).map((step) => step.title)).toEqual(['Pack', 'Load van', 'Unpack']);
    const [listed] = await listTasks(db);
    expect(listed.steps.map((step) => step.title)).toEqual(['Pack', 'Load van', 'Unpack']);
  });

  it('updates, reorders and removes steps', async () => {
    const id = await taskWithSteps(['A', 'B', 'C']);
    const [a, , c] = await listSteps(db, id);
    await saveSteps(db, id, [
      { id: c.id, title: 'C', doneAt: null },
      { id: a.id, title: 'A, renamed', doneAt: null },
      { id: null, title: 'D', doneAt: null },
    ]);
    expect((await listSteps(db, id)).map((step) => step.title)).toEqual(['C', 'A, renamed', 'D']);
  });

  it('ticks the task off with its last step, and reopens it when a step is unticked', async () => {
    const id = await taskWithSteps(['Pack', 'Load van']);
    let task = (await getTask(db, id))!;
    await toggleStep(db, task, task.steps[0].id);
    task = (await getTask(db, id))!;
    expect(task.completedAt).toBeNull();

    await toggleStep(db, task, task.steps[1].id);
    task = (await getTask(db, id))!;
    expect(task.completedAt).not.toBeNull();

    await toggleStep(db, task, task.steps[0].id);
    task = (await getTask(db, id))!;
    expect(task.completedAt).toBeNull();
    expect(task.steps.map((step) => step.doneAt !== null)).toEqual([false, true]);
  });

  it('moves a repeating task on with its steps unticked', async () => {
    const id = await taskWithSteps(['Stretch', 'Run'], {
      title: 'Workout',
      dueAt: at(2026, 11, 2, 7),
      rrule: 'FREQ=DAILY',
    });
    let task = (await getTask(db, id))!;
    await toggleStep(db, task, task.steps[0].id);
    task = (await getTask(db, id))!;
    await toggleStep(db, task, task.steps[1].id);

    task = (await getTask(db, id))!;
    expect(task.completedAt).toBeNull();
    expect(task.dueAt).toBe(at(2026, 11, 3, 7));
    expect(task.steps.every((step) => step.doneAt === null)).toBe(true);
  });

  it('removes steps with their task', async () => {
    const id = await taskWithSteps(['A']);
    await setTaskCompleted(db, id, true);
    await deleteTask(db, id);
    expect(await listSteps(db, id)).toEqual([]);
  });
});
