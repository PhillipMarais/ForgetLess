import { Directory, File, Paths } from 'expo-file-system';

// PDFs are kept in the app's private documents folder next to pictures, named by attachment
// id. See document-storage.web.ts for the browser version.

function documentsDirectory() {
  const directory = new Directory(Paths.document, 'attachments');
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/** Copies a picked PDF into permanent storage and returns its new URI. */
export async function storeDocument(uri: string, id: string): Promise<string> {
  const destination = new File(documentsDirectory(), `${id}.pdf`);
  await new File(uri).copy(destination);
  return destination.uri;
}
