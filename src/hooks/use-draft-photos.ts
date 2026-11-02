import type { SQLiteDatabase } from 'expo-sqlite';
import { useState } from 'react';

import type { Attachment, OwnerType } from '@/db/attachments';
import { usePhotoPicking } from '@/hooks/use-photo-picking';
import { draftPhotosFrom, prepareDraftPhotos, savePhotoChanges, type DraftPhoto } from '@/lib/photos';

/** Moves the item at `from` to `to`, shifting the ones in between. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Pictures in an editor with a Save button: adding, removing and reordering only change the
 * draft; `save` applies the changes once the owner has been saved. The first is the cover.
 */
export function useDraftPhotos(initial: readonly Attachment[]) {
  const [photos, setPhotos] = useState<DraftPhoto[]>(() => draftPhotosFrom(initial));

  const picking = usePhotoPicking(async (images) => {
    const drafts = await prepareDraftPhotos(images);
    setPhotos((current) => [...current, ...drafts]);
  });

  const remove = (key: string) => setPhotos((current) => current.filter((photo) => photo.key !== key));

  const move = (from: number, to: number) => setPhotos((current) => moveItem(current, from, to));

  const makeCover = (key: string) =>
    setPhotos((current) => moveItem(current, current.findIndex((photo) => photo.key === key), 0));

  const changed =
    photos.length !== initial.length || photos.some((photo, index) => photo.key !== initial[index].id);

  const save = (db: SQLiteDatabase, ownerType: OwnerType, ownerId: string) =>
    savePhotoChanges(db, ownerType, ownerId, initial, photos);

  return {
    photos,
    add: picking.pick,
    remove,
    move,
    makeCover,
    changed,
    save,
    busy: picking.busy,
    error: picking.error,
  };
}

export type DraftPhotos = ReturnType<typeof useDraftPhotos>;
