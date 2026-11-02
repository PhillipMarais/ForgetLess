import type { SQLiteDatabase } from 'expo-sqlite';
import { useState } from 'react';

import type { Attachment, OwnerType } from '@/db/attachments';
import { usePhotoPicking } from '@/hooks/use-photo-picking';
import { draftPhotosFrom, prepareDraftPhotos, savePhotoChanges, type DraftPhoto } from '@/lib/photos';

/**
 * Pictures in an editor with a Save button: adding and removing only changes the draft;
 * `save` applies the changes once the owner has been saved.
 */
export function useDraftPhotos(initial: readonly Attachment[]) {
  const [photos, setPhotos] = useState<DraftPhoto[]>(() => draftPhotosFrom(initial));

  const picking = usePhotoPicking(async (images) => {
    const drafts = await prepareDraftPhotos(images);
    setPhotos((current) => [...current, ...drafts]);
  });

  const remove = (key: string) => setPhotos((current) => current.filter((photo) => photo.key !== key));

  const save = (db: SQLiteDatabase, ownerType: OwnerType, ownerId: string) =>
    savePhotoChanges(db, ownerType, ownerId, initial, photos);

  return { photos, add: picking.pick, remove, save, busy: picking.busy, error: picking.error };
}
