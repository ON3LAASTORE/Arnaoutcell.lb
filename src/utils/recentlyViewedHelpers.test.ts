import test from 'node:test';
import assert from 'node:assert/strict';
import { Product } from '../types';
import {
  MAX_RECENTLY_VIEWED,
  recordRecentlyViewedId,
  parseStoredRecentlyViewedIds,
  resolveRecentlyViewedProducts,
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
