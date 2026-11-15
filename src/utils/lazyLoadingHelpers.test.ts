import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VIEWPORT_ROOT_MARGIN,
  DEFAULT_INTERSECTION_THRESHOLD,
  observeElementInViewport,
  getActiveObserverPoolSize,
  isAboveTheFold,
  resolveImageSource,
  getRecommendedRootMargin,
} from './lazyLoadingHelpers';

test('strict viewport constants default to 0px rootMargin and 0.01 threshold', () => {
  assert.equal(DEFAULT_VIEWPORT_ROOT_MARGIN, '0px');
  assert.equal(DEFAULT_INTERSECTION_THRESHOLD, 0.01);
});

test('isAboveTheFold correctly flags critical initial items', () => {
  // Default limit = 2
  assert.equal(isAboveTheFold({ index: 0 }), true);
  assert.equal(isAboveTheFold({ index: 1 }), true);
  assert.equal(isAboveTheFold({ index: 2 }), false);
  assert.equal(isAboveTheFold({ index: 5 }), false);

  // Custom limit = 4 (e.g. desktop hero grid)
  assert.equal(isAboveTheFold({ index: 3, viewportItemLimit: 4 }), true);
  assert.equal(isAboveTheFold({ index: 4, viewportItemLimit: 4 }), false);
});

test('resolveImageSource strips Unsplash thumbnail params and handles empty strings cleanly', () => {
  const fallback = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97';

  assert.equal(
    resolveImageSource('https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80', fallback),
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569'
  );
  assert.equal(resolveImageSource('', fallback), fallback);
  assert.equal(resolveImageSource('   ', fallback), fallback);
  assert.equal(resolveImageSource(null, fallback), fallback);
  assert.equal(resolveImageSource(undefined, fallback), fallback);
});

test('getRecommendedRootMargin adjusts margin for mobile flick scroll', () => {
  assert.equal(getRecommendedRootMargin(false), '200px 0px');
  assert.equal(getRecommendedRootMargin(true), '300px 0px');
});

test('observeElementInViewport defers loading until element intersects viewport and shares observer pool', () => {
  const instances: Array<{
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
    observed: Set<Element>;
    unobserved: Element[];
    disconnected: boolean;
  }> = [];

  class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
    observed = new Set<Element>();
    unobserved: Element[] = [];
    disconnected = false;

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.callback = callback;
      this.options = options;
      instances.push(this);
    }
    observe(el: Element) {
      this.observed.add(el);
    }
    unobserve(el: Element) {
      this.observed.delete(el);
      this.unobserved.push(el);
    }
    disconnect() {
      this.disconnected = true;
      this.observed.clear();
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    get root() {
      return this.options?.root ?? null;
    }
    get rootMargin() {
      return this.options?.rootMargin ?? '0px';
    }
    get thresholds() {
      return [0.01];
    }
  }

  const elA = { id: 'card-a' } as unknown as Element;
  const elB = { id: 'card-b' } as unknown as Element;
  let loadedA = 0;
  let loadedB = 0;

  const cleanupA = observeElementInViewport(
    elA,
    { rootMargin: '0px', threshold: 0.01 },
    () => {
      loadedA += 1;
    },
    MockIntersectionObserver as unknown as typeof IntersectionObserver
  );
  const cleanupB = observeElementInViewport(
    elB,
    { rootMargin: '0px', threshold: 0.01 },
    () => {
      loadedB += 1;
    },
    MockIntersectionObserver as unknown as typeof IntersectionObserver
  );

  // Shares a single IntersectionObserver instance across elements with matching config
  assert.equal(instances.length, 1);
  assert.equal(getActiveObserverPoolSize(), 1);
  assert.equal(instances[0].options?.rootMargin, '0px');

  // Non-intersecting entry does not trigger loading
  instances[0].callback(
    [{ target: elA, isIntersecting: false, intersectionRatio: 0 } as IntersectionObserverEntry],
    instances[0] as unknown as IntersectionObserver
  );
  assert.equal(loadedA, 0);
  assert.equal(loadedB, 0);

  // Intersecting entry triggers elA once and un-observes it
  instances[0].callback(
    [{ target: elA, isIntersecting: true, intersectionRatio: 0.5 } as IntersectionObserverEntry],
    instances[0] as unknown as IntersectionObserver
  );
  assert.equal(loadedA, 1);
  assert.equal(loadedB, 0);
  assert.equal(instances[0].unobserved.includes(elA), true);
  assert.equal(instances[0].disconnected, false);

  // Unmounting elB cleans up the shared observer completely
  cleanupA();
  cleanupB();
  assert.equal(instances[0].disconnected, true);
  assert.equal(getActiveObserverPoolSize(), 0);
});

test('observeElementInViewport invokes callback immediately when IntersectionObserver is unavailable', () => {
  const el = { id: 'fallback-el' } as unknown as Element;
  let calls = 0;
  const cleanup = observeElementInViewport(el, {}, () => {
    calls += 1;
  }, undefined);
  assert.equal(calls, 1);
  assert.doesNotThrow(() => cleanup());
});
