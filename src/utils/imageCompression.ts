import { FOUR_K_MAX_WIDTH, preserveDimensionsUpToFourK } from './imageResolutionHelpers';

export interface ImageCompressionOptions {
  maxDimension?: number;
  maxDataUrlLength?: number;
  initialQuality?: number;
  preferPng?: boolean;
  preserveOriginal?: boolean;
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
 * Reads uploaded images at full original resolution (preserving up to 4K 3840x2160
 * without downscaling or lossy compression by default). Explicit callers that opt out
 * of preserveOriginal retain up to 4K dimensions at high quality.
 */
export async function optimizeUploadedImage(
  file: File,
  options?: ImageCompressionOptions
): Promise<string> {
  const rawDataUrl = await readRawDataUrl(file);
  const preserveOriginal = options?.preserveOriginal !== false;

  // Preserve SVGs and original raster uploads untouched (no downscaling or compression)
  if (
    preserveOriginal ||
    file.type === 'image/svg+xml' ||
    file.name.toLowerCase().endsWith('.svg') ||
    typeof document === 'undefined'
  ) {
    return rawDataUrl;
  }

  const maxDimension = options?.maxDimension ?? FOUR_K_MAX_WIDTH;
  const maxDataUrlLength = options?.maxDataUrlLength ?? 2_000_000;
  const quality = options?.initialQuality ?? 1.0;

  try {
    const img = await loadImage(rawDataUrl);
    const { width: targetWidth, height: targetHeight } = preserveDimensionsUpToFourK(
      img.width || maxDimension,
      img.height || maxDimension,
      maxDimension,
      maxDimension
    );

    if (targetWidth === img.width && targetHeight === img.height) {
      return rawDataUrl;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return rawDataUrl;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const mime = options?.preferPng ? 'image/png' : file.type || 'image/png';
    const encoded = mime === 'image/png' ? canvas.toDataURL('image/png') : canvas.toDataURL(mime, quality);
    if (encoded.length <= maxDataUrlLength) {
      return encoded;
    }
    return rawDataUrl;
  } catch {
    return rawDataUrl;
  }
}
