import { Directory, File, Paths } from 'expo-file-system';

import { compressPhoto, type PickedImage, type PreparedPhoto } from './photo-compress';

// Pictures are JPEG files in the app's private documents folder, named by attachment id.
// See photo-storage.web.ts for the browser version.

function photosDirectory() {
  const directory = new Directory(Paths.document, 'attachments');
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/** Compresses into a temporary file; nothing is kept until `storePhoto` is called. */
export async function preparePhoto(image: PickedImage): Promise<PreparedPhoto> {
  const result = await compressPhoto(image, { base64: false });
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
    byteSize: new File(result.uri).size,
  };
}

/** Moves a prepared picture into permanent storage and returns its new URI. */
export async function storePhoto(photo: PreparedPhoto, id: string): Promise<string> {
  const destination = new File(photosDirectory(), `${id}.jpg`);
  await new File(photo.uri).copy(destination);
  deletePhotoFile(photo.uri);
  return destination.uri;
}

/** Best effort: a missing file is fine. */
export function deletePhotoFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone, or not a file URI.
  }
}
