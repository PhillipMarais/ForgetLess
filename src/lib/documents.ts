import * as DocumentPicker from 'expo-document-picker';
import type { SQLiteDatabase } from 'expo-sqlite';

import { addAttachment, deleteAttachment, PDF_MIME, type Attachment, type OwnerType } from '@/db/attachments';
import { newId } from '@/db/ids';

import { storeDocument } from './document-storage';
import { deletePhotoFile } from './photo-storage';

/** A PDF in an editor: saved already (`attachment`) or picked and not yet saved. */
export type DraftDocument = {
  key: string;
  uri: string;
  name: string;
  size: number | null;
  attachment?: Attachment;
};

export function draftDocumentsFrom(attachments: readonly Attachment[]): DraftDocument[] {
  return attachments.map((attachment) => ({
    key: attachment.id,
    uri: attachment.uri,
    name: attachment.fileName ?? 'Document.pdf',
    size: attachment.byteSize,
    attachment,
  }));
}

/** Lets the user choose PDFs from the phone. Returns [] if they cancel. */
export async function pickDocuments(): Promise<DraftDocument[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: PDF_MIME,
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    key: newId(),
    uri: asset.uri,
    name: asset.name,
    size: asset.size ?? null,
  }));
}

/** Saves an editor's PDF changes: removes dropped ones and stores new ones. */
export async function saveDocumentChanges(
  db: SQLiteDatabase,
  ownerType: OwnerType,
  ownerId: string,
  initial: readonly Attachment[],
  documents: readonly DraftDocument[],
) {
  const kept = new Set(documents.flatMap((document) => (document.attachment ? [document.attachment.id] : [])));
  for (const attachment of initial) {
    if (kept.has(attachment.id)) continue;
    await deleteAttachment(db, attachment.id);
    deletePhotoFile(attachment.uri);
  }
  for (const document of documents) {
    if (document.attachment) continue;
    const id = newId();
    const uri = await storeDocument(document.uri, id);
    await addAttachment(db, {
      id,
      ownerType,
      ownerId,
      uri,
      mimeType: PDF_MIME,
      width: null,
      height: null,
      byteSize: document.size,
      fileName: document.name,
    });
  }
}

/** "2.4 MB", "830 KB". */
export function formatFileSize(bytes: number | null) {
  if (bytes === null) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
