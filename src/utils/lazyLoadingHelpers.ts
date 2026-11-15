import { resolveFullResolutionImageUrl } from './imageResolutionHelpers';

/**
 * Utility functions for IntersectionObserver image lazy loading and critical above-the-fold prioritization.
 */

export const DEFAULT_VIEWPORT_ROOT_MARGIN = '0px';
export const DEFAULT_INTERSECTION_THRESHOLD = 0.01;

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

export interface ViewportObserverOptions {
  rootMargin?: string;
  threshold?: number | number[];
}

interface SharedObserverEntry {
  observer: IntersectionObserver;
  callbacks: WeakMap<Element, () => void>;
  observedElements: Set<Element>;
}

const sharedObservers = new Map<string, SharedObserverEntry>();

function getObserverPoolKey(rootMargin: string, threshold: number | number[]): string {
  return `${rootMargin}::${Array.isArray(threshold) ? threshold.join(',') : String(threshold)}`;
}

/**
 * Lazily subscribes an element to a shared IntersectionObserver so product images
 * only load once they enter the viewport. Triggers at most once per element,
 * then automatically un-observes and cleans up empty observers.
 */
export function observeElementInViewport(
  element: Element,
  options: ViewportObserverOptions,
  onEnterViewport: () => void,
  ObserverCtor: typeof IntersectionObserver | undefined = typeof window !== 'undefined' &&
  'IntersectionObserver' in window
    ? window.IntersectionObserver
    : undefined
): () => void {
  if (!ObserverCtor) {
    onEnterViewport();
    return () => {};
  }

  const rootMargin = options.rootMargin ?? DEFAULT_VIEWPORT_ROOT_MARGIN;
  const threshold = options.threshold ?? DEFAULT_INTERSECTION_THRESHOLD;
  const key = getObserverPoolKey(rootMargin, threshold);

  let poolEntry = sharedObservers.get(key);
  if (!poolEntry) {
    const callbacks = new WeakMap<Element, () => void>();
    const observedElements = new Set<Element>();

    const observer = new ObserverCtor(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            const cb = callbacks.get(entry.target);
            callbacks.delete(entry.target);
            observedElements.delete(entry.target);
            observer.unobserve(entry.target);
            if (cb) {
              cb();
            }
          }
        }
        if (observedElements.size === 0) {
          observer.disconnect();
          sharedObservers.delete(key);
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    poolEntry = { observer, callbacks, observedElements };
    sharedObservers.set(key, poolEntry);
  }

  poolEntry.callbacks.set(element, onEnterViewport);
  poolEntry.observedElements.add(element);
  poolEntry.observer.observe(element);

  return () => {
    const currentEntry = sharedObservers.get(key);
    if (!currentEntry) return;
    currentEntry.callbacks.delete(element);
    currentEntry.observedElements.delete(element);
    currentEntry.observer.unobserve(element);
    if (currentEntry.observedElements.size === 0) {
      currentEntry.observer.disconnect();
      sharedObservers.delete(key);
    }
  };
}

export function getActiveObserverPoolSize(): number {
  return sharedObservers.size;
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
 * Normalizes an image source to its full-resolution original file and provides a reliable fallback if empty.
 */
export function resolveImageSource(src: string | undefined | null, fallback: string): string {
  const resolved = resolveFullResolutionImageUrl(src);
  if (!resolved) {
    return resolveFullResolutionImageUrl(fallback) || fallback;
  }
  return resolved;
}

/**
 * Computes optimal IntersectionObserver rootMargin based on connection type or device screen.
 */
export function getRecommendedRootMargin(isMobileDevice: boolean = false): string {
  // Mobile devices benefit from slightly larger rootMargin (300px) to compensate for fast flick scrolling
  return isMobileDevice ? '300px 0px' : '200px 0px';
}
