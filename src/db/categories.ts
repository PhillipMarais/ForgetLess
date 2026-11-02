import type { SQLiteDatabase } from 'expo-sqlite';

import { notifyChange } from './changes';
import { newId, now } from './ids';

/** A folder of notes, shown in the notes list with an optional icon picture. */
export type Category = {
  id: string;
  name: string;
  /** Icon picture file (or data: URI on web); null shows a folder symbol. */
  iconUri: string | null;
  sortOrder: number;
  /** Notes currently in the folder. */
  noteCount: number;
  createdAt: number;
  updatedAt: number;
};

type CategoryRow = {
  id: string;
  name: string;
  icon_uri: string | null;
  sort_order: number;
  note_count: number;
  created_at: number;
  updated_at: number;
};

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    iconUri: row.icon_uri,
    sortOrder: row.sort_order,
    noteCount: row.note_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_CATEGORIES = `
  SELECT note_categories.*,
    (SELECT COUNT(*) FROM notes n
     WHERE n.category_id = note_categories.id AND n.deleted_at IS NULL) AS note_count
  FROM note_categories`;

/** In the user's order, then alphabetically. */
export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    `${SELECT_CATEGORIES} WHERE deleted_at IS NULL ORDER BY sort_order ASC, name COLLATE NOCASE ASC`,
  );
  return rows.map(toCategory);
}

export async function getCategory(db: SQLiteDatabase, id: string): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRow>(
    `${SELECT_CATEGORIES} WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? toCategory(row) : null;
}

export type CategoryInput = { name: string; iconUri: string | null };

export async function createCategory(db: SQLiteDatabase, input: CategoryInput): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO note_categories (id, name, icon_uri, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    id,
    input.name.trim(),
    input.iconUri,
    timestamp,
    timestamp,
  );
  notifyChange('note_categories');
  return id;
}

export async function updateCategory(db: SQLiteDatabase, id: string, input: CategoryInput) {
  await db.runAsync(
    'UPDATE note_categories SET name = ?, icon_uri = ?, updated_at = ? WHERE id = ?',
    input.name.trim(),
    input.iconUri,
    now(),
    id,
  );
  notifyChange('note_categories');
}

/** Deletes a folder. Its notes are kept and move back to the main notes list. */
export async function deleteCategory(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE note_categories SET deleted_at = ?, updated_at = ? WHERE id = ?',
      timestamp,
      timestamp,
      id,
    );
    await db.runAsync(
      'UPDATE notes SET category_id = NULL, updated_at = ? WHERE category_id = ?',
      timestamp,
      id,
    );
  });
  notifyChange('note_categories');
  notifyChange('notes');
}
