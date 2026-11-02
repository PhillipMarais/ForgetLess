import type { SQLiteDatabase } from 'expo-sqlite';

import { notifyChange } from './changes';
import { newId, now } from './ids';

export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

type NoteRow = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  created_at: number;
  updated_at: number;
};

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Pinned first, then most recently edited. */
export async function listNotes(db: SQLiteDatabase): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY pinned DESC, updated_at DESC`,
  );
  return rows.map(toNote);
}

export async function getNote(db: SQLiteDatabase, id: string): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>(
    'SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row ? toNote(row) : null;
}

export async function createNote(db: SQLiteDatabase): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.runAsync(
    'INSERT INTO notes (id, created_at, updated_at) VALUES (?, ?, ?)',
    id,
    timestamp,
    timestamp,
  );
  notifyChange('notes');
  return id;
}

export async function updateNote(
  db: SQLiteDatabase,
  id: string,
  changes: { title: string; body: string },
) {
  await db.runAsync(
    'UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?',
    changes.title,
    changes.body,
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
  await db.runAsync(
    'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    id,
  );
  notifyChange('notes');
}
