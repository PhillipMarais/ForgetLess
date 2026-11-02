import type { SQLiteDatabase } from 'expo-sqlite';

import { attachmentColumns, deleteAttachmentsFor } from './attachments';
import { notifyChange } from './changes';
import { newId, now } from './ids';

export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  attachmentCount: number;
  /** The first picture, shown on list rows; null when there are none. */
  coverUri: string | null;
  createdAt: number;
  updatedAt: number;
};

type NoteRow = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  attachment_count: number;
  cover_uri: string | null;
  created_at: number;
  updated_at: number;
};

const SELECT_NOTES = `SELECT notes.*, ${attachmentColumns('note', 'notes')} FROM notes`;

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned === 1,
    attachmentCount: row.attachment_count,
    coverUri: row.cover_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Pinned first, then most recently edited. */
export async function listNotes(db: SQLiteDatabase): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `${SELECT_NOTES} WHERE deleted_at IS NULL ORDER BY pinned DESC, updated_at DESC`,
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

export type NoteInput = { title: string; body: string; pinned?: boolean };

export async function createNote(
  db: SQLiteDatabase,
  input: NoteInput = { title: '', body: '' },
): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.runAsync(
    'INSERT INTO notes (id, title, body, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    input.title,
    input.body,
    input.pinned ? 1 : 0,
    timestamp,
    timestamp,
  );
  notifyChange('notes');
  return id;
}

/** Saves the note's text, and its pin when `pinned` is given. */
export async function updateNote(db: SQLiteDatabase, id: string, changes: NoteInput) {
  await db.runAsync(
    'UPDATE notes SET title = ?, body = ?, pinned = COALESCE(?, pinned), updated_at = ? WHERE id = ?',
    changes.title,
    changes.body,
    changes.pinned === undefined ? null : changes.pinned ? 1 : 0,
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

/** Deletes several notes and their pictures at once (multi-select). */
export async function deleteNotes(db: SQLiteDatabase, ids: readonly string[]) {
  for (const id of ids) await deleteNote(db, id);
}
