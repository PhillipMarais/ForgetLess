import type { SQLiteDatabase } from 'expo-sqlite';
import { useState } from 'react';

import type { Attachment, OwnerType } from '@/db/attachments';
import { draftDocumentsFrom, pickDocuments, saveDocumentChanges, type DraftDocument } from '@/lib/documents';

/** PDFs in an editor with a Save button: changes stay in the draft until `save`. */
export function useDraftDocuments(initial: readonly Attachment[]) {
  const [documents, setDocuments] = useState<DraftDocument[]>(() => draftDocumentsFrom(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setError(null);
    setBusy(true);
    try {
      const picked = await pickDocuments();
      setDocuments((current) => [...current, ...picked]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add the PDF.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (key: string) => setDocuments((current) => current.filter((document) => document.key !== key));

  const changed =
    documents.length !== initial.length ||
    documents.some((document, index) => document.key !== initial[index].id);

  const save = (db: SQLiteDatabase, ownerType: OwnerType, ownerId: string) =>
    saveDocumentChanges(db, ownerType, ownerId, initial, documents);

  return { documents, add, remove, changed, save, busy, error };
}

export type DraftDocuments = ReturnType<typeof useDraftDocuments>;
