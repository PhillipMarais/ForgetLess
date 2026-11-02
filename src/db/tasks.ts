import type { SQLiteDatabase } from 'expo-sqlite';

import { nextOccurrenceAfter } from '@/lib/recurrence';

import { attachmentColumns, deleteAttachmentsFor } from './attachments';
import { notifyChange } from './changes';
import { currentTimeZone, newId, now } from './ids';

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: number | null;
  dueAllDay: boolean;
  timeZone: string;
  rrule: string | null;
  priority: number;
  completedAt: number | null;
  sortOrder: number;
  attachmentCount: number;
  /** The first picture, shown on list rows; null when there are none. */
  coverUri: string | null;
  createdAt: number;
  updatedAt: number;
};

type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  due_at: number | null;
  due_all_day: number;
  time_zone: string;
  rrule: string | null;
  priority: number;
  completed_at: number | null;
  sort_order: number;
  attachment_count: number;
  cover_uri: string | null;
  created_at: number;
  updated_at: number;
};

const SELECT_TASKS = `SELECT tasks.*, ${attachmentColumns('task', 'tasks')} FROM tasks`;

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    dueAt: row.due_at,
    dueAllDay: row.due_all_day === 1,
    timeZone: row.time_zone,
    rrule: row.rrule,
    priority: row.priority,
    completedAt: row.completed_at,
    sortOrder: row.sort_order,
    attachmentCount: row.attachment_count,
    coverUri: row.cover_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Open tasks first (soonest due, undated last), then completed tasks, most recent first. */
export async function listTasks(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `${SELECT_TASKS}
     WHERE deleted_at IS NULL
     ORDER BY completed_at IS NOT NULL,
              CASE WHEN completed_at IS NULL THEN due_at END ASC NULLS LAST,
              completed_at DESC,
              sort_order ASC,
              created_at ASC`,
  );
  return rows.map(toTask);
}

/** Open tasks due before `before` (epoch ms), oldest first. */
export async function listOpenTasksDueBefore(db: SQLiteDatabase, before: number): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `${SELECT_TASKS}
     WHERE deleted_at IS NULL AND completed_at IS NULL AND due_at IS NOT NULL AND due_at < ?
     ORDER BY due_at ASC, sort_order ASC, created_at ASC`,
    before,
  );
  return rows.map(toTask);
}

/** Tasks (open or completed) due within [from, to), soonest first. */
export async function listTasksDueBetween(
  db: SQLiteDatabase,
  from: number,
  to: number,
): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `${SELECT_TASKS}
     WHERE deleted_at IS NULL AND due_at >= ? AND due_at < ?
     ORDER BY due_at ASC, sort_order ASC, created_at ASC`,
    from,
    to,
  );
  return rows.map(toTask);
}

export async function getTask(db: SQLiteDatabase, id: string): Promise<Task | null> {
  const row = await db.getFirstAsync<TaskRow>(
    `${SELECT_TASKS} WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? toTask(row) : null;
}

export type TaskInput = {
  title: string;
  notes?: string | null;
  dueAt?: number | null;
  dueAllDay?: boolean;
  /** Only kept when the task has a due date. */
  rrule?: string | null;
};

export async function createTask(db: SQLiteDatabase, input: TaskInput): Promise<string> {
  const id = newId();
  const timestamp = now();
  const dueAt = input.dueAt ?? null;
  await db.runAsync(
    `INSERT INTO tasks (id, title, notes, due_at, due_all_day, time_zone, rrule, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title.trim(),
    input.notes ?? null,
    dueAt,
    input.dueAllDay ? 1 : 0,
    currentTimeZone(),
    dueAt === null ? null : (input.rrule ?? null),
    timestamp,
    timestamp,
  );
  notifyChange('tasks');
  return id;
}

export async function updateTask(db: SQLiteDatabase, id: string, input: TaskInput) {
  const dueAt = input.dueAt ?? null;
  await db.runAsync(
    `UPDATE tasks SET title = ?, notes = ?, due_at = ?, due_all_day = ?, rrule = ?, updated_at = ?
     WHERE id = ?`,
    input.title.trim(),
    input.notes ?? null,
    dueAt,
    input.dueAllDay ? 1 : 0,
    dueAt === null ? null : (input.rrule ?? null),
    now(),
    id,
  );
  notifyChange('tasks');
}

/**
 * Completing a repeating task logs that occurrence as done (in occurrence_exceptions) and
 * moves the task to its next due date, so it stays open. Other tasks are simply marked done.
 */
export async function setTaskCompleted(db: SQLiteDatabase, id: string, completed: boolean) {
  const timestamp = now();
  const task = await getTask(db, id);
  if (!task) return;

  const next =
    completed && task.rrule && task.dueAt !== null
      ? nextOccurrenceAfter(task.rrule, task.dueAt, task.dueAt)
      : null;

  if (next === null) {
    await db.runAsync(
      'UPDATE tasks SET completed_at = ?, updated_at = ? WHERE id = ?',
      completed ? timestamp : null,
      timestamp,
      id,
    );
    notifyChange('tasks');
    return;
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO occurrence_exceptions
         (id, owner_type, owner_id, original_start, completed_at, created_at, updated_at)
       VALUES (?, 'task', ?, ?, ?, ?, ?)
       ON CONFLICT (owner_type, owner_id, original_start) DO UPDATE SET
         completed_at = excluded.completed_at, updated_at = excluded.updated_at, deleted_at = NULL`,
      newId(),
      id,
      task.dueAt,
      timestamp,
      timestamp,
      timestamp,
    );
    await db.runAsync(
      'UPDATE tasks SET due_at = ?, completed_at = NULL, updated_at = ? WHERE id = ?',
      next,
      timestamp,
      id,
    );
  });
  notifyChange('tasks');
  notifyChange('occurrence_exceptions');
}

/**
 * Moves open repeating tasks that were due before `today` to their first date on or after
 * it, skipping the missed dates. Used when "Hold repeats until done" is off. Tasks whose
 * series has ended stay overdue. Returns how many tasks moved.
 */
export async function skipMissedRepeats(db: SQLiteDatabase, today: number): Promise<number> {
  const rows = await db.getAllAsync<TaskRow>(
    `${SELECT_TASKS}
     WHERE deleted_at IS NULL AND completed_at IS NULL AND rrule IS NOT NULL AND due_at < ?`,
    today,
  );
  const timestamp = now();
  let moved = 0;
  for (const task of rows.map(toTask)) {
    const next = nextOccurrenceAfter(task.rrule!, task.dueAt!, today - 1);
    if (next === null) continue;
    await db.runAsync(
      'UPDATE tasks SET due_at = ?, updated_at = ? WHERE id = ?',
      next,
      timestamp,
      task.id,
    );
    moved++;
  }
  if (moved > 0) notifyChange('tasks');
  return moved;
}

export async function deleteTask(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?',
      timestamp,
      timestamp,
      id,
    );
    await deleteAttachmentsFor(db, 'task', id, timestamp);
  });
  notifyChange('tasks');
}
