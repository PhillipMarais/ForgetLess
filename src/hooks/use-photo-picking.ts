import { useState } from 'react';

import type { PickedImage } from '@/lib/photo-compress';
import { pickImages, type PhotoSource } from '@/lib/pick-photo';

/**
 * Runs the picker and hands the chosen images to `onPicked`, tracking a busy flag
 * and a user-facing error message.
 */
export function usePhotoPicking(onPicked: (images: PickedImage[]) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (source: PhotoSource) => {
    setError(null);
    setBusy(true);
    try {
      const images = await pickImages(source);
      if (images.length > 0) await onPicked(images);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add the picture.');
    } finally {
      setBusy(false);
    }
  };

  return { pick, busy, error };
}
