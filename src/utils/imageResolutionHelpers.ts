export const FOUR_K_MAX_WIDTH = 3840;
export const FOUR_K_MAX_HEIGHT = 2160;

export const DEFAULT_FULL_RES_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1598327105666-5b89351aff97';

const LEGACY_BROKEN_UNSPLASH_REPLACEMENTS: Record<string, string> = {
  '/photo-1511707171634-5f897ff02597': 'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
  '/photo-1612287233215-d419b10904ef': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
};

const THUMBNAIL_DOWNSAMPLING_PARAMS = new Set([
  'w',
  'h',
  'width',
  'height',
  'q',
  'quality',
  'fit',
  'crop',
  'auto',
  'dpr',
  'fm',
]);

/**
 * Resolves an image source URL to its original full-resolution source file,
 * stripping thumbnail sizing and lossy compression parameters from CDN URLs
 * (such as Unsplash's ?w=800&auto=format&fit=crop&q=80) while leaving local
 * assets, data URLs, and blob URLs completely intact.
 */
export function resolveFullResolutionImageUrl(src: string | undefined | null): string {
  if (typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname === 'images.unsplash.com' || hostname.endsWith('.unsplash.com')) {
      const replacement = LEGACY_BROKEN_UNSPLASH_REPLACEMENTS[parsed.pathname];
      if (replacement) {
        return replacement;
      }
      for (const param of Array.from(parsed.searchParams.keys())) {
        if (THUMBNAIL_DOWNSAMPLING_PARAMS.has(param.toLowerCase())) {
          parsed.searchParams.delete(param);
        }
      }
      return parsed.toString();
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Strips restrictive responsive image attributes (srcSet / srcset / sizes) so
 * browsers never pick a lower-resolution thumbnail candidate on 4K/large displays.
 */
export function stripRestrictiveImageAttributes<T extends Record<string, unknown>>(
  attrs: T
): Omit<T, 'srcSet' | 'srcset' | 'sizes'> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const lower = key.toLowerCase();
    if (lower === 'srcset' || lower === 'sizes') {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned as Omit<T, 'srcSet' | 'srcset' | 'sizes'>;
}

/**
 * Computes target dimensions preserving original resolution up to full 4K UHD (3840x2160)
 * without downscaling images that are already 4K or smaller.
 */
export function preserveDimensionsUpToFourK(
  width: number,
  height: number,
  maxWidth: number = FOUR_K_MAX_WIDTH,
  maxHeight: number = FOUR_K_MAX_HEIGHT
): { width: number; height: number } {
  const safeW = Math.max(1, Math.round(width || maxWidth));
  const safeH = Math.max(1, Math.round(height || maxHeight));

  if (safeW <= maxWidth && safeH <= maxHeight) {
    return { width: safeW, height: safeH };
  }

  const scale = Math.min(maxWidth / safeW, maxHeight / safeH);
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
  };
}
