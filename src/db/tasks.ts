import type { SQLiteDatabase } from 'expo-sqlite';

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
  created_at: number;
  updated_at: number;
};

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Open tasks first (soonest due, undated last), then completed tasks, most recent first. */
export async function listTasks(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
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
    `SELECT * FROM tasks
     WHERE deleted_at IS NULL AND completed_at IS NULL AND due_at IS NOT NULL AND due_at < ?
     ORDER BY due_at ASC, sort_order ASC, created_at ASC`,
    before,
  );
  return rows.map(toTask);
}

export type NewTask = {
  title: string;
  notes?: string | null;
  dueAt?: number | null;
  dueAllDay?: boolean;
};

export async function createTask(db: SQLiteDatabase, input: NewTask): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO tasks (id, title, notes, due_at, due_all_day, time_zone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title.trim(),
    input.notes ?? null,
    input.dueAt ?? null,
    input.dueAllDay ? 1 : 0,
    currentTimeZone(),
    timestamp,
    timestamp,
  );
  notifyChange('tasks');
  return id;
}

export async function setTaskCompleted(db: SQLiteDatabase, id: string, completed: boolean) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE tasks SET completed_at = ?, updated_at = ? WHERE id = ?',
    completed ? timestamp : null,
    timestamp,
    id,
  );
  notifyChange('tasks');
}

export async function deleteTask(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    id,
  );
  notifyChange('tasks');
}
