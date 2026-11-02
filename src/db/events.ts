import type { SQLiteDatabase } from 'expo-sqlite';

import { occurrencesBetween } from '@/lib/recurrence';

import { attachmentCountColumn, deleteAttachmentsFor } from './attachments';
import { notifyChange } from './changes';
import { currentTimeZone, newId, now } from './ids';

/**
 * Events are stored once; repeating events (with an `rrule`) are expanded into occurrences
 * when read. An occurrence is identified by its event id plus `originalStart`, the start
 * time the rule generated for it. Editing or deleting a single occurrence writes a row in
 * `occurrence_exceptions` keyed by that pair, which overrides or cancels it.
 *
 * All-day events start at local midnight and end at midnight after their last day (exclusive).
 */

export type CalendarEvent = {
  id: string;
  title: string;
  notes: string | null;
  startAt: number;
  endAt: number;
  allDay: boolean;
  timeZone: string;
  rrule: string | null;
  attachmentCount: number;
  createdAt: number;
  updatedAt: number;
};

export type EventOccurrence = {
  eventId: string;
  originalStart: number;
  title: string;
  notes: string | null;
  startAt: number;
  endAt: number;
  allDay: boolean;
  rrule: string | null;
  /** Pictures belong to the whole event, so every occurrence shows the same count. */
  attachmentCount: number;
};

export type EventInput = {
  title: string;
  notes: string | null;
  startAt: number;
  endAt: number;
  allDay: boolean;
  rrule: string | null;
};

export type OccurrenceChanges = Pick<EventInput, 'title' | 'notes' | 'startAt' | 'endAt'>;

type EventRow = {
  id: string;
  title: string;
  notes: string | null;
  start_at: number;
  end_at: number;
  all_day: number;
  time_zone: string;
  rrule: string | null;
  attachment_count: number;
  created_at: number;
  updated_at: number;
};

type ExceptionRow = {
  owner_id: string;
  original_start: number;
  cancelled: number;
  title: string | null;
  notes: string | null;
  start_at: number | null;
  end_at: number | null;
};

const SELECT_EVENTS = `SELECT events.*, ${attachmentCountColumn('event', 'events')} FROM events`;

function toEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day === 1,
    timeZone: row.time_zone,
    rrule: row.rrule,
    attachmentCount: row.attachment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Whether [start, end) overlaps [from, to); a zero-length item counts if it starts inside. */
function overlaps(start: number, end: number, from: number, to: number) {
  return start < to && (end > from || (start === end && start >= from));
}

function toOccurrence(
  event: CalendarEvent,
  originalStart: number,
  exception?: ExceptionRow,
): EventOccurrence {
  const duration = event.endAt - event.startAt;
  return {
    eventId: event.id,
    originalStart,
    title: exception?.title ?? event.title,
    notes: exception ? exception.notes : event.notes,
    startAt: exception?.start_at ?? originalStart,
    endAt: exception?.end_at ?? originalStart + duration,
    allDay: event.allDay,
    rrule: event.rrule,
    attachmentCount: event.attachmentCount,
  };
}

function sortOccurrences(a: EventOccurrence, b: EventOccurrence) {
  return a.startAt - b.startAt || Number(b.allDay) - Number(a.allDay) || a.endAt - b.endAt;
}

export async function getEvent(db: SQLiteDatabase, id: string): Promise<CalendarEvent | null> {
  const row = await db.getFirstAsync<EventRow>(
    `${SELECT_EVENTS} WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? toEvent(row) : null;
}

/** One occurrence with its exception applied; null if the event is gone or it was cancelled. */
export async function getOccurrence(
  db: SQLiteDatabase,
  eventId: string,
  originalStart: number,
): Promise<EventOccurrence | null> {
  const event = await getEvent(db, eventId);
  if (!event) return null;
  if (!event.rrule) return toOccurrence(event, event.startAt);

  const exception = await db.getFirstAsync<ExceptionRow>(
    `SELECT * FROM occurrence_exceptions
     WHERE owner_type = 'event' AND owner_id = ? AND original_start = ? AND deleted_at IS NULL`,
    eventId,
    originalStart,
  );
  if (exception?.cancelled) return null;
  return toOccurrence(event, originalStart, exception ?? undefined);
}

/** Every occurrence overlapping [from, to), repeating events expanded, sorted by start. */
export async function listOccurrences(
  db: SQLiteDatabase,
  from: number,
  to: number,
): Promise<EventOccurrence[]> {
  const events = (
    await db.getAllAsync<EventRow>(
      `${SELECT_EVENTS}
       WHERE deleted_at IS NULL AND start_at < ? AND (rrule IS NOT NULL OR end_at >= ?)`,
      to,
      from,
    )
  ).map(toEvent);

  const repeating = events.filter((event) => event.rrule);
  const longest = Math.max(0, ...repeating.map((event) => event.endAt - event.startAt));
  const exceptions = new Map<string, ExceptionRow>();
  if (repeating.length > 0) {
    const rows = await db.getAllAsync<ExceptionRow>(
      `SELECT * FROM occurrence_exceptions
       WHERE owner_type = 'event' AND deleted_at IS NULL AND original_start >= ? AND original_start < ?`,
      from - longest,
      to,
    );
    for (const row of rows) exceptions.set(`${row.owner_id}:${row.original_start}`, row);
  }

  const occurrences: EventOccurrence[] = [];
  for (const event of events) {
    const starts = event.rrule
      ? occurrencesBetween(event.rrule, event.startAt, from - (event.endAt - event.startAt), to)
      : [event.startAt];

    for (const start of starts) {
      const exception = event.rrule ? exceptions.get(`${event.id}:${start}`) : undefined;
      if (exception?.cancelled) continue;
      const occurrence = toOccurrence(event, start, exception);
      if (overlaps(occurrence.startAt, occurrence.endAt, from, to)) occurrences.push(occurrence);
    }
  }
  return occurrences.sort(sortOccurrences);
}

export async function createEvent(db: SQLiteDatabase, input: EventInput): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO events (id, title, notes, start_at, end_at, all_day, time_zone, rrule, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title.trim(),
    input.notes,
    input.startAt,
    input.endAt,
    input.allDay ? 1 : 0,
    currentTimeZone(),
    input.rrule,
    timestamp,
    timestamp,
  );
  notifyChange('events');
  return id;
}

/**
 * Updates the whole event (every occurrence). If a repeating event's start or rule changes,
 * its per-occurrence exceptions no longer line up with the new occurrences and are dropped.
 */
export async function updateEvent(db: SQLiteDatabase, id: string, input: EventInput) {
  const existing = await getEvent(db, id);
  if (!existing) return;
  const timestamp = now();
  const seriesChanged =
    existing.rrule !== null &&
    (existing.startAt !== input.startAt || existing.rrule !== input.rrule);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE events SET title = ?, notes = ?, start_at = ?, end_at = ?, all_day = ?, rrule = ?, updated_at = ?
       WHERE id = ?`,
      input.title.trim(),
      input.notes,
      input.startAt,
      input.endAt,
      input.allDay ? 1 : 0,
      input.rrule,
      timestamp,
      id,
    );
    if (seriesChanged) await deleteExceptions(db, id, timestamp);
  });
  notifyChange('events');
  if (seriesChanged) notifyChange('occurrence_exceptions');
}

export async function deleteEvent(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?',
      timestamp,
      timestamp,
      id,
    );
    await deleteExceptions(db, id, timestamp);
    await deleteAttachmentsFor(db, 'event', id, timestamp);
  });
  notifyChange('events');
  notifyChange('occurrence_exceptions');
}

async function deleteExceptions(db: SQLiteDatabase, eventId: string, timestamp: number) {
  await db.runAsync(
    `UPDATE occurrence_exceptions SET deleted_at = ?, updated_at = ?
     WHERE owner_type = 'event' AND owner_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    eventId,
  );
}

async function upsertException(
  db: SQLiteDatabase,
  eventId: string,
  originalStart: number,
  values: { cancelled: boolean } & Partial<OccurrenceChanges>,
) {
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO occurrence_exceptions
       (id, owner_type, owner_id, original_start, cancelled, title, notes, start_at, end_at, created_at, updated_at)
     VALUES (?, 'event', ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (owner_type, owner_id, original_start) DO UPDATE SET
       cancelled = excluded.cancelled, title = excluded.title, notes = excluded.notes,
       start_at = excluded.start_at, end_at = excluded.end_at,
       updated_at = excluded.updated_at, deleted_at = NULL`,
    newId(),
    eventId,
    originalStart,
    values.cancelled ? 1 : 0,
    values.title?.trim() ?? null,
    values.notes ?? null,
    values.startAt ?? null,
    values.endAt ?? null,
    timestamp,
    timestamp,
  );
  notifyChange('occurrence_exceptions');
}

/** Changes only one occurrence of a repeating event. */
export function editOccurrence(
  db: SQLiteDatabase,
  eventId: string,
  originalStart: number,
  changes: OccurrenceChanges,
) {
  return upsertException(db, eventId, originalStart, { cancelled: false, ...changes });
}

/** Removes only one occurrence of a repeating event. */
export function cancelOccurrence(db: SQLiteDatabase, eventId: string, originalStart: number) {
  return upsertException(db, eventId, originalStart, { cancelled: true });
}
