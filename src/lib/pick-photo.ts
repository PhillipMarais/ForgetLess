import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { PickedImage } from './photo-compress';

export type PhotoSource = 'camera' | 'library';

/** Thrown when the user has refused camera access. */
export class CameraPermissionError extends Error {
  constructor() {
    super('Camera access is off for Forgetless. You can turn it on in your phone settings.');
  }
}

const MAX_PICK = 10;

/**
 * Lets the user take a picture or choose some from the gallery. Returns [] if they cancel.
 * The gallery uses Android's photo picker, which needs no storage permission.
 */
export async function pickImages(source: PhotoSource): Promise<PickedImage[]> {
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new CameraPermissionError();
    }
    result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  } else {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PICK,
      quality: 1,
    });
  }
  if (result.canceled) return [];
  return result.assets.map((asset) => ({ uri: asset.uri, width: asset.width, height: asset.height }));
}
