import type { SQLiteDatabase } from 'expo-sqlite';

import { nextOccurrenceAfter, occurrencesLimited } from '@/lib/recurrence';

import { attachmentColumns, deleteAttachmentsFor } from './attachments';
import { notifyChange } from './changes';
import { currentTimeZone, newId, now } from './ids';
import { deleteStepsFor, listSteps, resetSteps, setStepDoneAt, stepsByTask, type TaskStep } from './steps';

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
  /**
   * Set on list entries for one date of a repeating task, rather than the task itself:
   * 'done' is a ticked-off past date, 'upcoming' a later date shown in the calendar.
   * `dueAt` is then that date and `completedAt` when it was ticked off.
   */
  occurrence: 'done' | 'upcoming' | null;
  /** Its steps, in order; empty for a task without steps. */
  steps: TaskStep[];
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
    occurrence: null,
    steps: [],
  };
}

/** Fills in each task's steps. */
async function withSteps(db: SQLiteDatabase, tasks: Task[]): Promise<Task[]> {
  const steps = await stepsByTask(db, tasks.map((task) => task.id));
  return tasks.map((task) => ({ ...task, steps: steps.get(task.id) ?? [] }));
}

/** A unique key for a list entry: one task can have several dated entries. */
export function taskEntryKey(task: Task) {
  return task.occurrence ? `${task.id}:${task.occurrence}:${task.dueAt}` : task.id;
}

type DoneOccurrenceRow = TaskRow & { original_start: number; done_at: number };

/** Ticked-off dates of repeating tasks, as list entries. */
async function listDoneOccurrences(db: SQLiteDatabase, where: string, ...params: number[]) {
  const rows = await db.getAllAsync<DoneOccurrenceRow>(
    `SELECT tasks.*, ${attachmentColumns('task', 'tasks')},
            e.original_start AS original_start, e.completed_at AS done_at
     FROM occurrence_exceptions e JOIN tasks ON tasks.id = e.owner_id
     WHERE e.owner_type = 'task' AND e.deleted_at IS NULL AND e.completed_at IS NOT NULL
       AND tasks.deleted_at IS NULL AND ${where}`,
    ...params,
  );
  return rows.map(
    (row): Task => ({
      ...toTask(row),
      dueAt: row.original_start,
      completedAt: row.done_at,
      occurrence: 'done',
    }),
  );
}

const byDue = (a: Task, b: Task) => a.dueAt! - b.dueAt! || a.sortOrder - b.sortOrder;

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
  return withSteps(db, rows.map(toTask));
}

/** Open tasks due before `before` (epoch ms), oldest first. */
export async function listOpenTasksDueBefore(db: SQLiteDatabase, before: number): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `${SELECT_TASKS}
     WHERE deleted_at IS NULL AND completed_at IS NULL AND due_at IS NOT NULL AND due_at < ?
     ORDER BY due_at ASC, sort_order ASC, created_at ASC`,
    before,
  );
  return withSteps(db, rows.map(toTask));
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
  return withSteps(db, rows.map(toTask));
}

/**
 * Today's list: open tasks due before `tomorrow` (overdue ones included), plus tasks and
 * repeating dates ticked off today, which stay (struck through) until swiped away.
 */
export async function listTodayTasks(
  db: SQLiteDatabase,
  today: number,
  tomorrow: number,
): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `${SELECT_TASKS}
     WHERE deleted_at IS NULL AND due_at IS NOT NULL AND due_at < ?
       AND (completed_at IS NULL OR (completed_at >= ? AND dismissed_on IS NULL))`,
    tomorrow,
    today,
  );
  const done = await listDoneOccurrences(
    db,
    'e.completed_at >= ? AND e.original_start < ? AND e.dismissed_on IS NULL',
    today,
    tomorrow,
  );
  return withSteps(db, [...rows.map(toTask), ...done].sort(byDue));
}

/**
 * Every task entry dated within [from, to) for the calendar: tasks due then, ticked-off
 * dates of repeating tasks, and their upcoming dates.
 */
export async function listTaskEntriesBetween(
  db: SQLiteDatabase,
  from: number,
  to: number,
): Promise<Task[]> {
  const rows = (
    await db.getAllAsync<TaskRow>(
      `${SELECT_TASKS}
       WHERE deleted_at IS NULL AND due_at < ? AND (due_at >= ? OR (rrule IS NOT NULL AND completed_at IS NULL))`,
      to,
      from,
    )
  ).map(toTask);

  const entries: Task[] = [];
  for (const task of rows) {
    if (task.dueAt! >= from) entries.push(task);
    if (task.rrule && task.completedAt === null) {
      const later = occurrencesLimited(task.rrule, task.dueAt!, Math.max(from, task.dueAt! + 1), to, 62);
      for (const dueAt of later) entries.push({ ...task, dueAt, occurrence: 'upcoming' });
    }
  }
  const done = await listDoneOccurrences(db, 'e.original_start >= ? AND e.original_start < ?', from, to);
  return withSteps(db, [...entries, ...done].sort(byDue));
}

export async function getTask(db: SQLiteDatabase, id: string): Promise<Task | null> {
  const row = await db.getFirstAsync<TaskRow>(
    `${SELECT_TASKS} WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  if (!row) return null;
  return { ...toTask(row), steps: await listSteps(db, id) };
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
      'UPDATE tasks SET completed_at = ?, dismissed_on = NULL, updated_at = ? WHERE id = ?',
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
         completed_at = excluded.completed_at, updated_at = excluded.updated_at,
         deleted_at = NULL, dismissed_on = NULL`,
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
    // The next date starts with every step to do again.
    await resetSteps(db, id);
  });
  notifyChange('tasks');
  notifyChange('occurrence_exceptions');
  notifyChange('task_steps');
}

/**
 * Ticks a step off or on. Ticking off the last step ticks off the task (a repeating task
 * then moves to its next date with its steps unticked); unticking one reopens a done task.
 */
export async function toggleStep(db: SQLiteDatabase, task: Task, stepId: string) {
  const step = task.steps.find((item) => item.id === stepId);
  if (!step) return;
  await setStepDoneAt(db, stepId, step.doneAt === null ? now() : null);
  const steps = await listSteps(db, task.id);
  const allDone = steps.length > 0 && steps.every((item) => item.doneAt !== null);
  if (allDone && task.completedAt === null) await setTaskCompleted(db, task.id, true);
  else if (!allDone && task.completedAt !== null && task.occurrence === null) {
    await setTaskCompleted(db, task.id, false);
  }
  notifyChange('task_steps');
  notifyChange('tasks');
}

/**
 * Unticks one ticked-off date of a repeating task. The task moves back to that date if it
 * had moved past it, so it is due again.
 */
export async function reopenOccurrence(db: SQLiteDatabase, taskId: string, originalStart: number) {
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE occurrence_exceptions SET deleted_at = ?, updated_at = ?
       WHERE owner_type = 'task' AND owner_id = ? AND original_start = ?`,
      timestamp,
      timestamp,
      taskId,
      originalStart,
    );
    await db.runAsync(
      `UPDATE tasks SET due_at = ?, completed_at = NULL, updated_at = ?
       WHERE id = ? AND due_at > ?`,
      originalStart,
      timestamp,
      taskId,
      originalStart,
    );
  });
  notifyChange('tasks');
  notifyChange('occurrence_exceptions');
}

/** Ticks a list entry off or on, whether it is a task or one date of a repeating task. */
export function toggleTaskEntry(db: SQLiteDatabase, task: Task) {
  if (task.occurrence === 'done') return reopenOccurrence(db, task.id, task.dueAt!);
  return setTaskCompleted(db, task.id, task.completedAt === null);
}

/** Clears a ticked-off entry from Today (like swiping away a notification). */
export async function dismissFromToday(db: SQLiteDatabase, task: Task, today: number) {
  const timestamp = now();
  if (task.occurrence === 'done') {
    await db.runAsync(
      `UPDATE occurrence_exceptions SET dismissed_on = ?, updated_at = ?
       WHERE owner_type = 'task' AND owner_id = ? AND original_start = ?`,
      today,
      timestamp,
      task.id,
      task.dueAt,
    );
    notifyChange('occurrence_exceptions');
  } else {
    await db.runAsync(
      'UPDATE tasks SET dismissed_on = ?, updated_at = ? WHERE id = ?',
      today,
      timestamp,
      task.id,
    );
    notifyChange('tasks');
  }
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
    await deleteStepsFor(db, id, timestamp);
  });
  notifyChange('tasks');
}
