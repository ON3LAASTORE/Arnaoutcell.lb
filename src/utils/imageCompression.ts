export interface ImageCompressionOptions {
  maxDimension?: number;
  maxDataUrlLength?: number;
  initialQuality?: number;
  preferPng?: boolean;
}

function readRawDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode uploaded image'));
    img.src = src;
  });
}

/**
 * Optimizes large raster image uploads (PNG/JPG/WebP) using an HTML5 canvas so
 * browser localStorage quota (~5MB total across origin) is never exhausted.
 */
export async function optimizeUploadedImage(
  file: File,
  options?: ImageCompressionOptions
): Promise<string> {
  const rawDataUrl = await readRawDataUrl(file);

  // Preserve SVGs and already-lightweight files untouched
  if (
    file.type === 'image/svg+xml' ||
    file.name.toLowerCase().endsWith('.svg') ||
    typeof document === 'undefined' ||
    rawDataUrl.length <= (options?.maxDataUrlLength ?? 220_000)
  ) {
    return rawDataUrl;
  }

  const maxDimension = options?.maxDimension ?? 1024;
  const maxDataUrlLength = options?.maxDataUrlLength ?? 280_000;
  let quality = options?.initialQuality ?? 0.86;

  try {
    const img = await loadImage(rawDataUrl);
    const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
    const targetWidth = Math.max(1, Math.round((img.width || maxDimension) * scale));
    const targetHeight = Math.max(1, Math.round((img.height || maxDimension) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return rawDataUrl;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // WebP preserves alpha transparency at a fraction of PNG file size
    const mimeCandidates = options?.preferPng
      ? ['image/webp', 'image/png', 'image/jpeg']
      : ['image/webp', 'image/jpeg'];

    for (const mime of mimeCandidates) {
      if (mime === 'image/png') {
        const pngData = canvas.toDataURL('image/png');
        if (pngData.length <= maxDataUrlLength) {
          return pngData;
        }
        continue;
      }

      let currentQ = quality;
      for (let attempt = 0; attempt < 4; attempt++) {
        const encoded = canvas.toDataURL(mime, currentQ);
        if (encoded.startsWith(`data:${mime}`) && encoded.length <= maxDataUrlLength) {
          return encoded;
        }
        currentQ = Math.max(0.45, Number((currentQ - 0.14).toFixed(2)));
      }
    }

    // Last resort: scaled-down WebP/JPEG at 0.65 quality
    const fallbackEncoded = canvas.toDataURL('image/webp', 0.65);
    return fallbackEncoded.length < rawDataUrl.length ? fallbackEncoded : rawDataUrl;
  } catch {
    return rawDataUrl;
  }
}
