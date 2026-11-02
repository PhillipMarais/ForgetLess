import type { SQLiteDatabase } from 'expo-sqlite';

import { notifyChange } from './changes';
import { newId, now } from './ids';

/**
 * Files attached to a task, event or note: pictures, and PDF documents (notes only).
 * The file itself lives at `uri`.
 */
export type OwnerType = 'event' | 'task' | 'note';

export const PDF_MIME = 'application/pdf';

/** Pictures and documents are listed, counted and ordered separately. */
export type AttachmentKind = 'pictures' | 'documents';

const KIND_SQL: Record<AttachmentKind, string> = {
  pictures: `(mime_type IS NULL OR mime_type != '${PDF_MIME}')`,
  documents: `mime_type = '${PDF_MIME}'`,
};

export type Attachment = {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  uri: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  /** The original file name, for documents. */
  fileName: string | null;
  /** Position among the owner's pictures; the lowest is the cover. */
  sortOrder: number;
  createdAt: number;
};

export type NewAttachment = Omit<Attachment, 'id' | 'createdAt' | 'sortOrder' | 'fileName'> & {
  id?: string;
  fileName?: string | null;
  /** Defaults to after the owner's existing pictures. */
  sortOrder?: number;
};

type AttachmentRow = {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  uri: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  file_name: string | null;
  sort_order: number;
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
    fileName: row.file_name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

const PICTURE_ORDER = 'sort_order ASC, created_at ASC, id ASC';

/**
 * SQL for `attachment_count` (pictures), `cover_uri` and `document_count` columns on a list
 * query, e.g. `SELECT tasks.*, ${attachmentColumns('task', 'tasks')} FROM tasks`.
 * Both arguments are fixed strings from our own code, never user input.
 */
export function attachmentColumns(ownerType: OwnerType, table: string) {
  const ofOwner = `a.owner_type = '${ownerType}' AND a.owner_id = ${table}.id AND a.deleted_at IS NULL`;
  const pictures = `${ofOwner} AND (a.mime_type IS NULL OR a.mime_type != '${PDF_MIME}')`;
  return `(SELECT COUNT(*) FROM attachments a WHERE ${pictures}) AS attachment_count,
          (SELECT a.uri FROM attachments a WHERE ${pictures} ORDER BY ${PICTURE_ORDER} LIMIT 1)
          AS cover_uri,
          (SELECT COUNT(*) FROM attachments a WHERE ${ofOwner} AND a.mime_type = '${PDF_MIME}')
          AS document_count`;
}

/** The owner's pictures (the first is the cover) or documents, in display order. */
export async function listAttachments(
  db: SQLiteDatabase,
  ownerType: OwnerType,
  ownerId: string,
  kind: AttachmentKind = 'pictures',
): Promise<Attachment[]> {
  const rows = await db.getAllAsync<AttachmentRow>(
    `SELECT * FROM attachments
     WHERE owner_type = ? AND owner_id = ? AND deleted_at IS NULL AND ${KIND_SQL[kind]}
     ORDER BY ${PICTURE_ORDER}`,
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
       (id, owner_type, owner_id, uri, mime_type, width, height, byte_size, file_name, sort_order,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
       COALESCE(?, (SELECT MAX(sort_order) + 1 FROM attachments
                    WHERE owner_type = ? AND owner_id = ? AND deleted_at IS NULL), 0),
       ?, ?)`,
    id,
    input.ownerType,
    input.ownerId,
    input.uri,
    input.mimeType,
    input.width,
    input.height,
    input.byteSize,
    input.fileName ?? null,
    input.sortOrder ?? null,
    input.ownerType,
    input.ownerId,
    timestamp,
    timestamp,
  );
  notifyChange('attachments');
  return id;
}

/** Saves a new order: `ids` from first (the cover) to last. */
export async function setAttachmentOrder(db: SQLiteDatabase, ids: readonly string[]) {
  const timestamp = now();
  for (const [index, id] of ids.entries()) {
    await db.runAsync(
      'UPDATE attachments SET sort_order = ?, updated_at = ? WHERE id = ? AND sort_order != ?',
      index,
      timestamp,
      id,
      index,
    );
  }
  notifyChange('attachments');
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
