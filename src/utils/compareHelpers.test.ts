import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAddToCompare,
  toggleCompareList,
  assignCompareSlot,
  swapComparePair,
  computePriceComparison,
  extractProductFeatureHighlights,
  buildComparisonFeatureRows,
  extractComparisonSpecLabels,
  getProductSpecValue,
  buildComparisonSpecRows,
  MAX_COMPARE_LIMIT,
} from './compareHelpers.ts';
import type { Product } from '../types/index.ts';

const productA: Product = {
  id: 'phone-a',
  name: 'OPPO Reno 16 5G',
  brand: 'Oppo',
  category: 'Phones',
  sku: 'OPP-R16',
  originalPrice: 699,
  price: 629,
  discountPercentage: 10,
  stock: 10,
  images: ['https://example.com/a.jpg'],
  description: 'Ultra-slim OLED flagship. 80W SuperVOOC fast charge. AI Portrait Camera engine.',
  specifications: [
    { label: 'Processor', value: 'Dimensity 8350' },
    { label: 'Screen', value: '6.7" OLED 120Hz' },
    { label: 'Battery', value: '5000mAh 80W' },
  ],
  colors: ['Midnight Black', 'Moonlight Gold'],
  warrantyMonths: 12,
  isBestSeller: true,
  isPublished: true,
  rating: 4.9,
  reviewCount: 20,
  createdAt: '2026-01-01',
};

const productB: Product = {
  id: 'phone-b',
  name: 'iPhone 16 Pro',
  brand: 'Apple',
  category: 'Phones',
  sku: 'APL-16P',
  originalPrice: 1199,
  price: 1099,
  stock: 5,
  images: ['https://example.com/b.jpg'],
  description: 'Aerospace titanium chassis. Apple A18 Pro neural engine.',
  specifications: [
    { label: 'Processor', value: 'A18 Pro' },
    { label: 'Screen', value: '6.7" OLED 120Hz' },
    { label: 'Camera', value: '48MP Fusion' },
  ],
  colors: ['Desert Titanium'],
  warrantyMonths: 24,
  isPublished: true,
  rating: 4.8,
  reviewCount: 15,
  createdAt: '2026-01-02',
};

const productC: Product = {
  id: 'phone-c',
  name: 'Samsung S25 Ultra',
  brand: 'Samsung',
  category: 'Phones',
  sku: 'SAM-S25',
  originalPrice: 1299,
  price: 1199,
  stock: 8,
  images: ['https://example.com/c.jpg'],
  description: 'Test phone C',
  specifications: [
    { label: 'Processor', value: 'Snapdragon 8 Elite' },
    { label: 'Screen', value: '6.9" Dynamic AMOLED' },
  ],
  warrantyMonths: 12,
  isPublished: true,
  rating: 4.9,
  reviewCount: 30,
  createdAt: '2026-01-03',
};

const productD: Product = {
  id: 'phone-d',
  name: 'Extra Phone D',
  brand: 'Xiaomi',
  category: 'Phones',
  sku: 'XIA-15',
  originalPrice: 899,
  price: 799,
  stock: 4,
  images: [],
  description: 'Extra phone D',
  specifications: [],
  warrantyMonths: 12,
  isPublished: true,
  rating: 4.5,
  reviewCount: 5,
  createdAt: '2026-01-04',
};

test('MAX_COMPARE_LIMIT is 3', () => {
  assert.equal(MAX_COMPARE_LIMIT, 3);
});

test('validateAddToCompare allows adding up to 3 distinct products', () => {
  const result1 = validateAddToCompare([], productA);
  assert.equal(result1.canAdd, true);

  const result2 = validateAddToCompare([productA, productB], productC);
  assert.equal(result2.canAdd, true);
});

test('validateAddToCompare rejects duplicates', () => {
  const result = validateAddToCompare([productA], productA);
  assert.equal(result.canAdd, false);
  assert.equal(result.reason, 'already_exists');
});

test('validateAddToCompare rejects adding 4th product beyond limit of 3', () => {
  const currentList = [productA, productB, productC];
  const result = validateAddToCompare(currentList, productD);
  assert.equal(result.canAdd, false);
  assert.equal(result.reason, 'limit_reached');
});

test('toggleCompareList adds or removes items safely', () => {
  const res1 = toggleCompareList([], productA);
  assert.equal(res1.added, true);
  assert.equal(res1.updatedList.length, 1);
  assert.equal(res1.updatedList[0].id, 'phone-a');

  const res2 = toggleCompareList(res1.updatedList, productA);
  assert.equal(res2.added, false);
  assert.equal(res2.updatedList.length, 0);

  const fullList = [productA, productB, productC];
  const res3 = toggleCompareList(fullList, productD);
  assert.equal(res3.added, false);
  assert.equal(res3.updatedList.length, 3);
  assert.ok(res3.error?.includes('Maximum 3'));
});

test('assignCompareSlot places products into slots 0 and 1 cleanly and swaps without duplicates', () => {
  const afterSlot0 = assignCompareSlot([], 0, productA);
  assert.deepEqual(
    afterSlot0.map((p) => p.id),
    ['phone-a']
  );

  const afterSlot1 = assignCompareSlot(afterSlot0, 1, productB);
  assert.deepEqual(
    afterSlot1.map((p) => p.id),
    ['phone-a', 'phone-b']
  );

  // Assigning productB into slot 0 swaps rather than duplicating
  const swappedViaAssign = assignCompareSlot(afterSlot1, 0, productB);
  assert.deepEqual(
    swappedViaAssign.map((p) => p.id),
    ['phone-b', 'phone-a']
  );

  const replacedSlot1 = assignCompareSlot(swappedViaAssign, 1, productC);
  assert.deepEqual(
    replacedSlot1.map((p) => p.id),
    ['phone-b', 'phone-c']
  );

  const swappedPair = swapComparePair(replacedSlot1);
  assert.deepEqual(
    swappedPair.map((p) => p.id),
    ['phone-c', 'phone-b']
  );
});

test('computePriceComparison calculates exact cash differences, savings, and category leaders', () => {
  const cmp = computePriceComparison(productA, productB);
  assert.equal(cmp.priceA, 629);
  assert.equal(cmp.priceB, 1099);
  assert.equal(cmp.savingsA, 70);
  assert.equal(cmp.savingsB, 100);
  assert.equal(cmp.discountPctA, 10);
  assert.equal(cmp.discountPctB, 8);
  assert.equal(cmp.absoluteDifferenceUsd, 470);
  assert.equal(cmp.signedDifferenceAtoB, -470);
  assert.equal(cmp.cheaperProductId, 'phone-a');
  assert.equal(cmp.higherDiscountProductId, 'phone-a');
  assert.equal(cmp.higherRatedProductId, 'phone-a');
  assert.equal(cmp.longerWarrantyProductId, 'phone-b');
  assert.equal(cmp.percentDifferenceFromHigher, 42.8);
});

test('extractProductFeatureHighlights and buildComparisonFeatureRows surface feature deltas accurately', () => {
  const highlights = extractProductFeatureHighlights(productA, 'en');
  assert.ok(highlights.some((h) => h.includes('Ultra-slim OLED flagship')));
  assert.ok(highlights.some((h) => h.includes('Store Best Seller')));

  const rows = buildComparisonFeatureRows([productA, productB], 'en');
  const warrantyRow = rows.find((r) => r.key === 'warranty');
  assert.ok(warrantyRow);
  assert.equal(warrantyRow.isDifferent, true);
  assert.deepEqual(warrantyRow.values, ['12 Months Official Warranty', '24 Months Official Warranty']);
});

test('extractComparisonSpecLabels and buildComparisonSpecRows detect matching vs differing specs cleanly', () => {
  const labels = extractComparisonSpecLabels([productA, productB]);
  assert.ok(labels.includes('Processor'));
  assert.ok(labels.includes('Screen'));
  assert.ok(labels.includes('Camera'));
  assert.ok(labels.includes('Battery'));

  assert.equal(getProductSpecValue(productA, 'Processor'), 'Dimensity 8350');
  assert.equal(getProductSpecValue(productB, 'Processor'), 'A18 Pro');
  assert.equal(getProductSpecValue(productB, 'Battery'), '—');

  const allRows = buildComparisonSpecRows([productA, productB], false);
  const screenRow = allRows.find((r) => r.label === 'Screen');
  const processorRow = allRows.find((r) => r.label === 'Processor');
  assert.equal(screenRow?.isDifferent, false);
  assert.equal(processorRow?.isDifferent, true);

  const diffOnlyRows = buildComparisonSpecRows([productA, productB], true);
  assert.equal(
    diffOnlyRows.some((r) => r.label === 'Screen'),
    false
  );
  assert.equal(
    diffOnlyRows.some((r) => r.label === 'Processor'),
    true
  );
});
