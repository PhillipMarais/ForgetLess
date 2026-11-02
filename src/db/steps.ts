import type { SQLiteDatabase } from 'expo-sqlite';

import { notifyChange } from './changes';
import { newId, now } from './ids';

/** One step of a task. A task with steps is ticked off by ticking off all of its steps. */
export type TaskStep = {
  id: string;
  taskId: string;
  title: string;
  doneAt: number | null;
  sortOrder: number;
};

type StepRow = {
  id: string;
  task_id: string;
  title: string;
  done_at: number | null;
  sort_order: number;
};

function toStep(row: StepRow): TaskStep {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    doneAt: row.done_at,
    sortOrder: row.sort_order,
  };
}

/** The steps of each of `taskIds`, in order; tasks without steps get an empty list. */
export async function stepsByTask(
  db: SQLiteDatabase,
  taskIds: readonly string[],
): Promise<Map<string, TaskStep[]>> {
  const result = new Map<string, TaskStep[]>(taskIds.map((id) => [id, []]));
  if (taskIds.length === 0) return result;
  const unique = [...new Set(taskIds)];
  // SQLite allows 999 parameters per statement; ask in batches.
  for (let start = 0; start < unique.length; start += 500) {
    const batch = unique.slice(start, start + 500);
    const rows = await db.getAllAsync<StepRow>(
      `SELECT id, task_id, title, done_at, sort_order FROM task_steps
       WHERE deleted_at IS NULL AND task_id IN (${batch.map(() => '?').join(',')})
       ORDER BY sort_order ASC, created_at ASC`,
      ...batch,
    );
    for (const row of rows) result.get(row.task_id)?.push(toStep(row));
  }
  return result;
}

export async function listSteps(db: SQLiteDatabase, taskId: string): Promise<TaskStep[]> {
  return (await stepsByTask(db, [taskId])).get(taskId) ?? [];
}

/** A step as the editor holds it: `id` is null for steps not saved yet, which get a `key`. */
export type StepDraft = { id: string | null; key?: string; title: string; doneAt: number | null };

/**
 * Makes the task's steps match `steps` (in that order): new ones are added, edited ones
 * updated, and missing ones removed. Empty titles are dropped.
 */
export async function saveSteps(db: SQLiteDatabase, taskId: string, steps: readonly StepDraft[]) {
  const timestamp = now();
  const kept = steps.filter((step) => step.title.trim().length > 0);
  const keptIds = new Set(kept.flatMap((step) => (step.id ? [step.id] : [])));
  const existing = await listSteps(db, taskId);

  await db.withTransactionAsync(async () => {
    for (const step of existing) {
      if (!keptIds.has(step.id)) {
        await db.runAsync(
          'UPDATE task_steps SET deleted_at = ?, updated_at = ? WHERE id = ?',
          timestamp,
          timestamp,
          step.id,
        );
      }
    }
    for (const [index, step] of kept.entries()) {
      if (step.id) {
        await db.runAsync(
          'UPDATE task_steps SET title = ?, done_at = ?, sort_order = ?, updated_at = ? WHERE id = ?',
          step.title.trim(),
          step.doneAt,
          index,
          timestamp,
          step.id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO task_steps (id, task_id, title, done_at, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          newId(),
          taskId,
          step.title.trim(),
          step.doneAt,
          index,
          timestamp,
          timestamp,
        );
      }
    }
  });
  notifyChange('task_steps');
  notifyChange('tasks');
}

export async function setStepDoneAt(db: SQLiteDatabase, stepId: string, doneAt: number | null) {
  await db.runAsync(
    'UPDATE task_steps SET done_at = ?, updated_at = ? WHERE id = ?',
    doneAt,
    now(),
    stepId,
  );
}

/** Unticks every step, e.g. when a repeating task moves on to its next date. */
export async function resetSteps(db: SQLiteDatabase, taskId: string) {
  await db.runAsync(
    'UPDATE task_steps SET done_at = NULL, updated_at = ? WHERE task_id = ? AND deleted_at IS NULL AND done_at IS NOT NULL',
    now(),
    taskId,
  );
}

export async function deleteStepsFor(db: SQLiteDatabase, taskId: string, timestamp: number) {
  await db.runAsync(
    'UPDATE task_steps SET deleted_at = ?, updated_at = ? WHERE task_id = ? AND deleted_at IS NULL',
    timestamp,
    timestamp,
    taskId,
  );
}
