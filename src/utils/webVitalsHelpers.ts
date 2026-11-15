export const RESPONSIVE_IMAGE_WIDTHS = [640, 1280, 1920, 3840] as const;

export const DEFAULT_RESPONSIVE_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 100vw';

export interface NextGenResponsiveSources {
  isResponsiveSupported: boolean;
  avifSrcSet: string;
  webpSrcSet: string;
  fallbackSrcSet: string;
  sizes: string;
}

export interface ExplicitImageDimensions {
  width: number;
  height: number;
  aspectRatio: string;
}

function getQualityForWidth(width: number): number {
  if (width >= 3840) return 92;
  if (width >= 1920) return 90;
  return 85;
}

function isNextGenCdnUrl(src: string): boolean {
  if (!src || src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/')) {
    return false;
  }

  try {
    const parsed = new URL(src);
    const host = parsed.hostname.toLowerCase();
    return host === 'images.unsplash.com' || host.endsWith('.unsplash.com');
  } catch {
    return false;
  }
}

function buildSizedCdnUrl(baseUrl: string, width: number, format?: 'avif' | 'webp'): string {
  const parsed = new URL(baseUrl);
  parsed.searchParams.set('w', String(width));
  parsed.searchParams.set('fit', 'max');
  parsed.searchParams.set('q', String(getQualityForWidth(width)));
  if (format) {
    parsed.searchParams.set('fm', format);
  } else {
    parsed.searchParams.delete('fm');
  }
  return parsed.toString();
}

/**
 * Generates next-generation AVIF & WebP <picture> srcSet candidates plus responsive
 * fallback srcSet widths up to full 4K UHD (3840w), ensuring mobile viewports load
 * compact modern payloads while 4K screens still receive crisp full-resolution assets.
 */
export function buildNextGenResponsiveSources(
  resolvedSrc: string,
  customSizes?: string
): NextGenResponsiveSources {
  const trimmed = typeof resolvedSrc === 'string' ? resolvedSrc.trim() : '';
  const sizes = customSizes?.trim() || DEFAULT_RESPONSIVE_SIZES;

  if (!isNextGenCdnUrl(trimmed)) {
    return {
      isResponsiveSupported: false,
      avifSrcSet: '',
      webpSrcSet: '',
      fallbackSrcSet: '',
      sizes,
    };
  }

  const avifSrcSet = RESPONSIVE_IMAGE_WIDTHS.map(
    (w) => `${buildSizedCdnUrl(trimmed, w, 'avif')} ${w}w`
  ).join(', ');

  const webpSrcSet = RESPONSIVE_IMAGE_WIDTHS.map(
    (w) => `${buildSizedCdnUrl(trimmed, w, 'webp')} ${w}w`
  ).join(', ');

  const fallbackSrcSet = RESPONSIVE_IMAGE_WIDTHS.map(
    (w) => `${buildSizedCdnUrl(trimmed, w)} ${w}w`
  ).join(', ');

  return {
    isResponsiveSupported: true,
    avifSrcSet,
    webpSrcSet,
    fallbackSrcSet,
    sizes,
  };
}

function parsePositiveDimension(value: number | string | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  }
  return null;
}

/**
 * Resolves explicit numeric HTML width and height attributes along with a valid
 * CSS aspectRatio reservation to prevent Cumulative Layout Shift (CLS) while images decode.
 */
export function resolveExplicitImageDimensions(
  width?: number | string,
  height?: number | string,
  fallbackWidth = 800,
  fallbackHeight = 800
): ExplicitImageDimensions {
  const parsedW = parsePositiveDimension(width);
  const parsedH = parsePositiveDimension(height);

  const safeFallbackW = Math.max(1, Math.round(fallbackWidth || 800));
  const safeFallbackH = Math.max(1, Math.round(fallbackHeight || 800));

  const finalW = parsedW ?? safeFallbackW;
  const finalH = parsedH ?? (parsedW ? Math.round((parsedW * safeFallbackH) / safeFallbackW) : safeFallbackH);

  return {
    width: finalW,
    height: finalH,
    aspectRatio: `${finalW} / ${finalH}`,
  };
}

/**
 * Determines whether heavy media elements (offscreen videos or lower-page embeds)
 * should defer network buffering until intersecting the viewport.
 */
export function shouldDeferMediaDownload(priority: boolean, isInView: boolean): boolean {
  return !priority && !isInView;
}
