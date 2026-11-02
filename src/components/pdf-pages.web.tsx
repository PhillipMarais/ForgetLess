import { useEffect, useState } from 'react';

/** The browser's own PDF viewer, for the web preview. */
export function PdfPages({ uri }: { uri: string }) {
  // Browsers block data: URLs in frames, so show the PDF from a blob URL.
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let active = true;
    fetch(uri)
      .then((response) => response.blob())
      .then((blob) => {
        url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        if (active) setSrc(url);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [uri]);

  return src ? (
    <iframe title="PDF" src={src} style={{ flex: 1, width: '100%', height: '100%', border: 'none' }} />
  ) : null;
}
