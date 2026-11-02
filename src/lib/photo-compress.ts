import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Longest edge of a stored picture. Plenty for a phone screen, ~200–400 KB as JPEG. */
export const MAX_PHOTO_EDGE = 1600;
export const PHOTO_QUALITY = 0.7;

/** An image as returned by the picker or camera, before compression. */
export type PickedImage = { uri: string; width: number; height: number };

/** A compressed picture ready to be stored. `uri` is temporary until stored. */
export type PreparedPhoto = {
  uri: string;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
  byteSize: number | null;
};

/** The resize to apply so the longest edge is at most `maxEdge`, or null if it already fits. */
export function resizeToFit(width: number, height: number, maxEdge = MAX_PHOTO_EDGE) {
  if (Math.max(width, height) <= maxEdge) return null;
  return width >= height ? { width: maxEdge } : { height: maxEdge };
}

/** Longest edge for small pictures such as folder icons. */
export const ICON_EDGE = 384;

export type CompressOptions = { base64: boolean; maxEdge?: number };

/** Downscales and re-encodes as JPEG. Also strips location and other EXIF data. */
export async function compressPhoto(image: PickedImage, { base64, maxEdge }: CompressOptions) {
  const context = ImageManipulator.manipulate(image.uri);
  const size = resizeToFit(image.width, image.height, maxEdge);
  if (size) context.resize(size);
  const rendered = await context.renderAsync();
  try {
    return await rendered.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG, base64 });
  } finally {
    rendered.release();
    context.release();
  }
}
