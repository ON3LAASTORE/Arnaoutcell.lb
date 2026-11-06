/**
 * Utility functions for IntersectionObserver image lazy loading and critical above-the-fold prioritization.
 */

export interface AboveTheFoldOptions {
  /**
   * The item's 0-based index in a grid/list.
   */
  index: number;
  /**
   * The number of items typically visible in the initial viewport before user scrolls.
   * Default is 2 for mobile 2-col grids, 4 for desktop 4-col grids.
   */
  viewportItemLimit?: number;
}

/**
 * Determines whether a product or media card is critical above-the-fold content
 * that should bypass IntersectionObserver and load immediately with high fetchPriority.
 */
export function isAboveTheFold(options: AboveTheFoldOptions): boolean {
  const limit = options.viewportItemLimit ?? 2;
  return options.index < limit;
}

/**
 * Normalizes an image source and provides a reliable high-availability fallback if empty.
 */
export function resolveImageSource(src: string | undefined | null, fallback: string): string {
  if (!src || typeof src !== 'string' || src.trim().length === 0) {
    return fallback;
  }
  return src.trim();
}

/**
 * Computes optimal IntersectionObserver rootMargin based on connection type or device screen.
 */
export function getRecommendedRootMargin(isMobileDevice: boolean = false): string {
  // Mobile devices benefit from slightly larger rootMargin (300px) to compensate for fast flick scrolling
  return isMobileDevice ? '300px 0px' : '200px 0px';
}
