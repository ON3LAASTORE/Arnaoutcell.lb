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
  const maxDataUrlLength = options?.maxDataUrlLength ?? 2_000_000;
  const preserveOriginal = options?.preserveOriginal ?? (options?.maxDataUrlLength ? false : true);

  // Preserve SVGs and explicitly preserved raw uploads untouched
  if (
    preserveOriginal ||
    file.type === 'image/svg+xml' ||
    file.name.toLowerCase().endsWith('.svg') ||
    typeof document === 'undefined'
  ) {
    return rawDataUrl;
  }

  const initialMaxDim = options?.maxDimension ?? FOUR_K_MAX_WIDTH;
  const initialQuality = options?.initialQuality ?? 0.86;

  try {
    const img = await loadImage(rawDataUrl);
    const naturalW = img.width || initialMaxDim;
    const naturalH = img.height || initialMaxDim;

    // Fast path: already fits requested dimension ceiling AND byte budget
    if (naturalW <= initialMaxDim && naturalH <= initialMaxDim && rawDataUrl.length <= maxDataUrlLength) {
      return rawDataUrl;
    }

    const mime =
      options?.preferPng
        ? 'image/png'
        : file.type === 'image/png' && rawDataUrl.length <= maxDataUrlLength
        ? 'image/png'
        : 'image/jpeg';

    const dimensionSteps = [
      initialMaxDim,
      Math.min(initialMaxDim, 1280),
      Math.min(initialMaxDim, 960),
      Math.min(initialMaxDim, 720),
    ].filter((dim, idx, arr) => dim > 0 && arr.indexOf(dim) === idx);

    const qualitySteps = mime === 'image/png' ? [1.0] : [initialQuality, 0.78, 0.66, 0.54, 0.42];

    let bestCandidate = rawDataUrl;

    for (const dimLimit of dimensionSteps) {
      const { width: targetWidth, height: targetHeight } = preserveDimensionsUpToFourK(
        naturalW,
        naturalH,
        dimLimit,
        dimLimit
      );

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return bestCandidate;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (mime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      } else {
        ctx.clearRect(0, 0, targetWidth, targetHeight);
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      for (const q of qualitySteps) {
        const encoded =
          mime === 'image/png'
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL(mime, q);

        if (encoded.length < bestCandidate.length) {
          bestCandidate = encoded;
        }
        if (encoded.length <= maxDataUrlLength) {
          return encoded;
        }
      }
    }

    // Final WebP fallback if JPEG still exceeded maxDataUrlLength
    const { width: finalW, height: finalH } = preserveDimensionsUpToFourK(naturalW, naturalH, 720, 720);
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = finalW;
    fallbackCanvas.height = finalH;
    const fCtx = fallbackCanvas.getContext('2d');
    if (fCtx) {
      fCtx.drawImage(img, 0, 0, finalW, finalH);
      const webpCandidate = fallbackCanvas.toDataURL('image/webp', 0.55);
      if (webpCandidate.length < bestCandidate.length) {
        bestCandidate = webpCandidate;
      }
    }

    return bestCandidate;
  } catch {
    return rawDataUrl;
  }
}
