import type { SQLiteDatabase } from 'expo-sqlite';

import { notifyChange } from './changes';
import { newId, now } from './ids';

/** Pictures attached to a task, event or note. The file itself lives at `uri`. */
export type OwnerType = 'event' | 'task' | 'note';

export type Attachment = {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  uri: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  createdAt: number;
};

export type NewAttachment = Omit<Attachment, 'id' | 'createdAt'> & { id?: string };

type AttachmentRow = {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  uri: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  created_at: number;
};

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    uri: row.uri,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    byteSize: row.byte_size,
    createdAt: row.created_at,
  };
}

/**
 * SQL for a `attachment_count` column on a list query, e.g.
 * `SELECT tasks.*, ${attachmentCountColumn('task', 'tasks')} FROM tasks`.
 * Both arguments are fixed strings from our own code, never user input.
 */
export function attachmentCountColumn(ownerType: OwnerType, table: string) {
  return `(SELECT COUNT(*) FROM attachments a
           WHERE a.owner_type = '${ownerType}' AND a.owner_id = ${table}.id AND a.deleted_at IS NULL)
          AS attachment_count`;
}

/** Oldest first, so pictures keep the order they were added in. */
export async function listAttachments(
  db: SQLiteDatabase,
  ownerType: OwnerType,
  ownerId: string,
): Promise<Attachment[]> {
  const rows = await db.getAllAsync<AttachmentRow>(
    `SELECT * FROM attachments
     WHERE owner_type = ? AND owner_id = ? AND deleted_at IS NULL
     ORDER BY created_at ASC, id ASC`,
    ownerType,
    ownerId,
  );
  return rows.map(toAttachment);
}

export async function addAttachment(db: SQLiteDatabase, input: NewAttachment): Promise<string> {
  const id = input.id ?? newId();
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO attachments
       (id, owner_type, owner_id, uri, mime_type, width, height, byte_size, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.ownerType,
    input.ownerId,
    input.uri,
    input.mimeType,
    input.width,
    input.height,
    input.byteSize,
    timestamp,
    timestamp,
  );
  notifyChange('attachments');
  return id;
}

export async function deleteAttachment(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    timestamp,
    timestamp,
    id,
  );
  notifyChange('attachments');
}

/** Soft-deletes every picture of an owner; called when the owner itself is deleted. */
export async function deleteAttachmentsFor(
  db: SQLiteDatabase,
  ownerType: OwnerType,
  ownerId: string,
  timestamp = now(),
) {
  await db.runAsync(
    `UPDATE attachments SET deleted_at = ?, updated_at = ?
     WHERE owner_type = ? AND owner_id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    ownerType,
    ownerId,
  );
  notifyChange('attachments');
}

/** URIs of deleted pictures, so their files can be removed from storage. */
export async function listDeletedAttachmentUris(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ uri: string }>(
    "SELECT uri FROM attachments WHERE deleted_at IS NOT NULL AND uri != ''",
  );
  return rows.map((row) => row.uri);
}

/** Marks deleted pictures' files as removed (the row is kept for sync). */
export async function clearDeletedAttachmentUris(db: SQLiteDatabase, uris: readonly string[]) {
  for (const uri of uris) {
    await db.runAsync(
      "UPDATE attachments SET uri = '' WHERE uri = ? AND deleted_at IS NOT NULL",
      uri,
    );
  }
}
