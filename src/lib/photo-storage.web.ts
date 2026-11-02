import { compressPhoto, type PickedImage, type PreparedPhoto } from './photo-compress';

// Browsers have no app file storage, so on web the compressed picture is kept in the
// database itself as a data: URI. This is for the web preview only; phones store files.

export async function preparePhoto(
  image: PickedImage,
  { maxEdge }: { maxEdge?: number } = {},
): Promise<PreparedPhoto> {
  const result = await compressPhoto(image, { base64: true, maxEdge });
  const base64 = result.base64 ?? '';
  return {
    uri: `data:image/jpeg;base64,${base64}`,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
    byteSize: Math.floor((base64.length * 3) / 4),
  };
}

export async function storePhoto(photo: PreparedPhoto, _id: string): Promise<string> {
  return photo.uri;
}

export function deletePhotoFile(_uri: string) {
  // Nothing to delete: the picture lives in the database row.
}
