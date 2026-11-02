import type { SQLiteDatabase } from 'expo-sqlite';

import {
  addAttachment,
  clearDeletedAttachmentUris,
  deleteAttachment,
  listDeletedAttachmentUris,
  setAttachmentOrder,
  type Attachment,
  type OwnerType,
} from '@/db/attachments';
import { newId } from '@/db/ids';

import { ICON_EDGE, type PickedImage, type PreparedPhoto } from './photo-compress';
import { deletePhotoFile, preparePhoto, storePhoto } from './photo-storage';

/**
 * A picture in an editor: either already saved (`attachment`) or picked but not yet
 * saved (`prepared`). Editors keep a list of these and save the changes on Save.
 */
export type DraftPhoto = {
  key: string;
  uri: string;
  attachment?: Attachment;
  prepared?: PreparedPhoto;
};

export function draftPhotosFrom(attachments: readonly Attachment[]): DraftPhoto[] {
  return attachments.map((attachment) => ({
    key: attachment.id,
    uri: attachment.uri,
    attachment,
  }));
}

export async function prepareDraftPhotos(images: readonly PickedImage[]): Promise<DraftPhoto[]> {
  const drafts: DraftPhoto[] = [];
  for (const image of images) {
    const prepared = await preparePhoto(image);
    drafts.push({ key: newId(), uri: prepared.uri, prepared });
  }
  return drafts;
}

/** Stores one prepared picture and records it against its owner. */
export async function addPhoto(
  db: SQLiteDatabase,
  ownerType: OwnerType,
  ownerId: string,
  photo: PreparedPhoto,
): Promise<string> {
  const id = newId();
  const uri = await storePhoto(photo, id);
  await addAttachment(db, {
    id,
    ownerType,
    ownerId,
    uri,
    mimeType: photo.mimeType,
    width: photo.width,
    height: photo.height,
    byteSize: photo.byteSize,
  });
  return id;
}

export async function removePhoto(db: SQLiteDatabase, attachment: Attachment) {
  await deleteAttachment(db, attachment.id);
  deletePhotoFile(attachment.uri);
}

/**
 * Saves an editor's picture changes: removes dropped pictures, stores new ones, and saves
 * the order shown in the editor (the first picture is the cover).
 */
export async function savePhotoChanges(
  db: SQLiteDatabase,
  ownerType: OwnerType,
  ownerId: string,
  initial: readonly Attachment[],
  photos: readonly DraftPhoto[],
) {
  const kept = new Set(photos.flatMap((photo) => (photo.attachment ? [photo.attachment.id] : [])));
  for (const attachment of initial) {
    if (!kept.has(attachment.id)) await removePhoto(db, attachment);
  }
  const ordered: string[] = [];
  for (const photo of photos) {
    if (photo.prepared) ordered.push(await addPhoto(db, ownerType, ownerId, photo.prepared));
    else if (photo.attachment) ordered.push(photo.attachment.id);
  }
  await setAttachmentOrder(db, ordered);
}

/**
 * Deletes the files of pictures whose owner was deleted (rows are soft-deleted, so the
 * files would otherwise stay). Safe to run repeatedly; run at startup.
 */
export async function purgeDeletedPhotos(db: SQLiteDatabase) {
  const uris = await listDeletedAttachmentUris(db);
  for (const uri of uris) deletePhotoFile(uri);
  await clearDeletedAttachmentUris(db, uris);
}

/** Stores a picked picture as a small folder icon and returns its URI. */
export async function storeIcon(image: PickedImage): Promise<string> {
  const prepared = await preparePhoto(image, { maxEdge: ICON_EDGE });
  return storePhoto(prepared, `icon-${newId()}`);
}
