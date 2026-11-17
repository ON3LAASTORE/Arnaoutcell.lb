import test from 'node:test';
import assert from 'node:assert/strict';
import { Product } from '../types';
import {
  MAX_RECENTLY_VIEWED,
  recordRecentlyViewedId,
  parseStoredRecentlyViewedIds,
  resolveRecentlyViewedProducts,
  filterRecentlyViewedProducts,
  computeCarouselScrollOffset,
  getCarouselScrollState,
} from './recentlyViewedHelpers';

const makeProduct = (id: string, isPublished = true): Product => ({
  id,
  name: `Product ${id}`,
  nameAr: `منتج ${id}`,
  brand: 'Apple',
  category: 'Smartphones',
  price: 100,
  originalPrice: 120,
  stock: 5,
  warrantyMonths: 12,
  description: 'Sample',
  descriptionAr: 'نموذج',
  specifications: [],
  images: [],
  colors: [],
  variants: [],
  rating: 4.9,
  reviewCount: 0,
  reviews: [],
  isNewArrival: false,
  isBestSeller: false,
  isSpecialOffer: false,
  isPublished,
  sku: `SKU-${id}`,
  barcode: `1000${id}`,
  createdAt: '2026-01-01T00:00:00Z',
});

test('recordRecentlyViewedId caps history at 5 and keeps most recent first', () => {
  let ids: string[] = [];
  for (let i = 1; i <= 7; i += 1) {
    ids = recordRecentlyViewedId(ids, `p${i}`);
  }
  assert.equal(ids.length, MAX_RECENTLY_VIEWED);
  assert.deepEqual(ids, ['p7', 'p6', 'p5', 'p4', 'p3']);
});

test('recordRecentlyViewedId promotes re-clicked product to the front without duplication', () => {
  const initial = ['p5', 'p4', 'p3', 'p2', 'p1'];
  const updated = recordRecentlyViewedId(initial, 'p2');
  assert.deepEqual(updated, ['p2', 'p5', 'p4', 'p3', 'p1']);
});

test('recordRecentlyViewedId ignores blank or whitespace IDs', () => {
  const initial = ['p1', 'p2'];
  assert.deepEqual(recordRecentlyViewedId(initial, '   '), ['p1', 'p2']);
});

test('parseStoredRecentlyViewedIds safely handles invalid JSON, duplicates, and oversized arrays', () => {
  assert.deepEqual(parseStoredRecentlyViewedIds(null), []);
  assert.deepEqual(parseStoredRecentlyViewedIds('{bad json'), []);
  assert.deepEqual(parseStoredRecentlyViewedIds('{"not":"array"}'), []);
  assert.deepEqual(
    parseStoredRecentlyViewedIds(JSON.stringify(['a', 'b', 'a', '', 123, 'c', 'd', 'e', 'f'])),
    ['a', 'b', 'c', 'd', 'e']
  );
});

test('resolveRecentlyViewedProducts filters missing/unpublished items and preserves viewed order', () => {
  const catalog = [
    makeProduct('p1', true),
    makeProduct('p2', false),
    makeProduct('p3', true),
    makeProduct('p4', true),
  ];
  const resolved = resolveRecentlyViewedProducts(['p4', 'missing', 'p2', 'p1', 'p3'], catalog);
  assert.deepEqual(
    resolved.map((p) => p.id),
    ['p4', 'p1', 'p3']
  );
});

test('filterRecentlyViewedProducts excludes the active product detail item without mutating input', () => {
  const items = [makeProduct('p3'), makeProduct('p2'), makeProduct('p1')];
  const filtered = filterRecentlyViewedProducts(items, 'p2');
  assert.deepEqual(
    filtered.map((p) => p.id),
    ['p3', 'p1']
  );
  assert.equal(items.length, 3);
  assert.deepEqual(
    filterRecentlyViewedProducts(items, null).map((p) => p.id),
    ['p3', 'p2', 'p1']
  );
});

test('localStorage serialization round-trip preserves order and excludes active PDP product', () => {
  const catalog = [makeProduct('p1'), makeProduct('p2'), makeProduct('p3')];
  let ids: string[] = [];
  ids = recordRecentlyViewedId(ids, 'p1');
  ids = recordRecentlyViewedId(ids, 'p2');
  ids = recordRecentlyViewedId(ids, 'p3');

  const serialized = JSON.stringify(ids);
  const rehydratedIds = parseStoredRecentlyViewedIds(serialized);
  const resolved = resolveRecentlyViewedProducts(rehydratedIds, catalog);
  const carouselItems = filterRecentlyViewedProducts(resolved, 'p3');

  assert.deepEqual(
    carouselItems.map((p) => p.id),
    ['p2', 'p1']
  );
});

test('computeCarouselScrollOffset respects LTR and RTL scroll direction with minimum step', () => {
  assert.equal(computeCarouselScrollOffset(1000, 'next', false), 780);
  assert.equal(computeCarouselScrollOffset(1000, 'prev', false), -780);
  assert.equal(computeCarouselScrollOffset(1000, 'next', true), -780);
  assert.equal(computeCarouselScrollOffset(1000, 'prev', true), 780);
  assert.equal(computeCarouselScrollOffset(200, 'next', false), 260);
});

test('getCarouselScrollState accurately reports scroll boundaries in LTR and RTL', () => {
  assert.deepEqual(getCarouselScrollState(0, 1000, 1000), {
    canScrollPrev: false,
    canScrollNext: false,
    isScrollable: false,
  });
  assert.deepEqual(getCarouselScrollState(0, 800, 1400), {
    canScrollPrev: false,
    canScrollNext: true,
    isScrollable: true,
  });
  assert.deepEqual(getCarouselScrollState(250, 800, 1400), {
    canScrollPrev: true,
    canScrollNext: true,
    isScrollable: true,
  });
  assert.deepEqual(getCarouselScrollState(-600, 800, 1400), {
    canScrollPrev: true,
    canScrollNext: false,
    isScrollable: true,
  });
});

