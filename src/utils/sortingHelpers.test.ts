import test from 'node:test';
import assert from 'node:assert/strict';
import { sortProducts } from './sortingHelpers.ts';
import type { SortableProduct } from './sortingHelpers.ts';

const SAMPLE_PRODUCTS: SortableProduct[] = [
  { id: 'p1', price: 1200, rating: 4.8, reviewCount: 20, discountPercentage: 10, createdAt: '2026-09-01' },
  { id: 'p2', price: 45, rating: 4.9, reviewCount: 50, discountPercentage: 25, createdAt: '2026-10-10', isNewArrival: true },
  { id: 'p3', price: 350, rating: 4.5, reviewCount: 15, discountPercentage: 15, createdAt: '2026-08-15' },
  { id: 'p4', price: 1500, rating: 4.9, reviewCount: 80, discountPercentage: 5, createdAt: '2026-10-15', isNewArrival: true },
];

test('sortProducts sorts price: low to high correctly', () => {
  const sorted = sortProducts(SAMPLE_PRODUCTS, 'price_asc');
  assert.equal(sorted[0].id, 'p2'); // 45
  assert.equal(sorted[1].id, 'p3'); // 350
  assert.equal(sorted[2].id, 'p1'); // 1200
  assert.equal(sorted[3].id, 'p4'); // 1500
});

test('sortProducts sorts price: high to low correctly', () => {
  const sorted = sortProducts(SAMPLE_PRODUCTS, 'price_desc');
  assert.equal(sorted[0].id, 'p4'); // 1500
  assert.equal(sorted[1].id, 'p1'); // 1200
  assert.equal(sorted[2].id, 'p3'); // 350
  assert.equal(sorted[3].id, 'p2'); // 45
});

test('sortProducts sorts newest arrivals correctly', () => {
  const sorted = sortProducts(SAMPLE_PRODUCTS, 'newest');
  assert.equal(sorted[0].id, 'p4'); // 2026-10-15
  assert.equal(sorted[1].id, 'p2'); // 2026-10-10
  assert.equal(sorted[2].id, 'p1'); // 2026-09-01
  assert.equal(sorted[3].id, 'p3'); // 2026-08-15
});

test('sortProducts sorts biggest discount correctly', () => {
  const sorted = sortProducts(SAMPLE_PRODUCTS, 'discount');
  assert.equal(sorted[0].id, 'p2'); // 25%
  assert.equal(sorted[1].id, 'p3'); // 15%
  assert.equal(sorted[2].id, 'p1'); // 10%
  assert.equal(sorted[3].id, 'p4'); // 5%
});
