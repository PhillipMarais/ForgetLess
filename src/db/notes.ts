import type { SQLiteDatabase } from 'expo-sqlite';

import { attachmentColumns, deleteAttachmentsFor } from './attachments';
import { notifyChange } from './changes';
import { newId, now } from './ids';

export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  /** The category it is in, or null for the main notes list. */
  categoryId: string | null;
  attachmentCount: number;
  /** The first picture, shown on list rows; null when there are none. */
  coverUri: string | null;
  /** Attached PDFs. */
  documentCount: number;
  createdAt: number;
  updatedAt: number;
};

type NoteRow = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  category_id: string | null;
  attachment_count: number;
  cover_uri: string | null;
  document_count: number;
  created_at: number;
  updated_at: number;
};

const SELECT_NOTES = `SELECT notes.*, ${attachmentColumns('note', 'notes')} FROM notes`;
const NOTE_ORDER = 'ORDER BY pinned DESC, updated_at DESC';

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned === 1,
    categoryId: row.category_id,
    attachmentCount: row.attachment_count,
    coverUri: row.cover_uri,
    documentCount: row.document_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Every note, pinned first, then most recently edited. */
export async function listNotes(db: SQLiteDatabase): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(`${SELECT_NOTES} WHERE deleted_at IS NULL ${NOTE_ORDER}`);
  return rows.map(toNote);
}

/**
 * The main notes list: pinned notes from every category, then the unpinned notes that are not
 * in a category. Categories sit between the two (see listCategories).
 */
export async function listMainNotes(db: SQLiteDatabase): Promise<{ pinned: Note[]; loose: Note[] }> {
  const pinned = await db.getAllAsync<NoteRow>(
    `${SELECT_NOTES} WHERE deleted_at IS NULL AND pinned = 1 ORDER BY updated_at DESC`,
  );
  const loose = await db.getAllAsync<NoteRow>(
    `${SELECT_NOTES} WHERE deleted_at IS NULL AND pinned = 0 AND category_id IS NULL
     ORDER BY updated_at DESC`,
  );
  return { pinned: pinned.map(toNote), loose: loose.map(toNote) };
}

/** The notes in one category, pinned first. */
export async function listNotesInCategory(db: SQLiteDatabase, categoryId: string): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `${SELECT_NOTES} WHERE deleted_at IS NULL AND category_id = ? ${NOTE_ORDER}`,
    categoryId,
  );
  return rows.map(toNote);
}

/** Notes written or last edited within [from, to), newest first: a day's notes in the calendar. */
export async function listNotesTouchedBetween(db: SQLiteDatabase, from: number, to: number): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `${SELECT_NOTES} WHERE deleted_at IS NULL
       AND ((created_at >= ? AND created_at < ?) OR (updated_at >= ? AND updated_at < ?))
     ORDER BY updated_at DESC`,
    from,
    to,
    from,
    to,
  );
  return rows.map(toNote);
}

export async function getNote(db: SQLiteDatabase, id: string): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>(
    `${SELECT_NOTES} WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? toNote(row) : null;
}

export type NoteInput = {
  title: string;
  body: string;
  pinned?: boolean;
  /** A category id, or null for none; left out, the category is not changed. */
  categoryId?: string | null;
};

export async function createNote(
  db: SQLiteDatabase,
  input: NoteInput = { title: '', body: '' },
): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO notes (id, title, body, pinned, category_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title,
    input.body,
    input.pinned ? 1 : 0,
    input.categoryId ?? null,
    timestamp,
    timestamp,
  );
  notifyChange('notes');
  return id;
}

/** Saves the note's text, and its pin and category when those are given. */
export async function updateNote(db: SQLiteDatabase, id: string, changes: NoteInput) {
  const moveCategory = changes.categoryId !== undefined;
  await db.runAsync(
    `UPDATE notes SET title = ?, body = ?, pinned = COALESCE(?, pinned),
       category_id = CASE WHEN ? THEN ? ELSE category_id END, updated_at = ?
     WHERE id = ?`,
    changes.title,
    changes.body,
    changes.pinned === undefined ? null : changes.pinned ? 1 : 0,
    moveCategory ? 1 : 0,
    changes.categoryId ?? null,
    now(),
    id,
  );
  notifyChange('notes');
}

export async function setNotePinned(db: SQLiteDatabase, id: string, pinned: boolean) {
  await db.runAsync(
    'UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ?',
    pinned ? 1 : 0,
    now(),
    id,
  );
  notifyChange('notes');
}

export async function deleteNote(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?',
      timestamp,
      timestamp,
      id,
    );
    await deleteAttachmentsFor(db, 'note', id, timestamp);
  });
  notifyChange('notes');
}

/** Pins or unpins several notes at once (multi-select). */
export async function setNotesPinned(db: SQLiteDatabase, ids: readonly string[], pinned: boolean) {
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(
        'UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ?',
        pinned ? 1 : 0,
        timestamp,
        id,
      );
    }
  });
  notifyChange('notes');
}

/** Moves several notes into a category, or out of categories with null (multi-select). */
export async function setNotesCategory(
  db: SQLiteDatabase,
  ids: readonly string[],
  categoryId: string | null,
) {
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(
        'UPDATE notes SET category_id = ?, updated_at = ? WHERE id = ?',
        categoryId,
        timestamp,
        id,
      );
    }
  });
  notifyChange('notes');
}

/** Deletes several notes and their pictures at once (multi-select). */
export async function deleteNotes(db: SQLiteDatabase, ids: readonly string[]) {
  for (const id of ids) await deleteNote(db, id);
}
