import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesPriceFilter,
  countProductsPerTier,
} from './priceFilterHelpers.ts';

const SAMPLE_ITEMS = [
  { price: 25, isPublished: true },
  { price: 49, isPublished: true },
  { price: 80, isPublished: true },
  { price: 250, isPublished: true },
  { price: 650, isPublished: true },
  { price: 1199, isPublished: true },
  { price: 1750, isPublished: true },
  { price: 2000, isPublished: false }, // should be ignored in counts
];

test('matchesPriceFilter checks min and max price limits', () => {
  assert.equal(matchesPriceFilter(100, 50, 200), true);
  assert.equal(matchesPriceFilter(40, 50, 200), false);
  assert.equal(matchesPriceFilter(250, 50, 200), false);
});

test('matchesPriceFilter filters by selected budget tier checkboxes', () => {
  // Select 'under-50' ($0-$50) and '800-1500' ($800-$1500)
  const selectedTiers = ['under-50', '800-1500'];

  assert.equal(matchesPriceFilter(25, 0, 3000, selectedTiers), true);
  assert.equal(matchesPriceFilter(1000, 0, 3000, selectedTiers), true);
  assert.equal(matchesPriceFilter(80, 0, 3000, selectedTiers), false);
  assert.equal(matchesPriceFilter(300, 0, 3000, selectedTiers), false);
  assert.equal(matchesPriceFilter(1800, 0, 3000, selectedTiers), false);
});

test('countProductsPerTier computes accurate item counts for each budget range', () => {
  const counts = countProductsPerTier(SAMPLE_ITEMS);
  assert.equal(counts['under-50'], 2); // 25, 49
  assert.equal(counts['50-150'], 1); // 80
  assert.equal(counts['150-400'], 1); // 250
  assert.equal(counts['400-800'], 1); // 650
  assert.equal(counts['800-1500'], 1); // 1199
  assert.equal(counts['1500-plus'], 1); // 1750 (unpublished 2000 ignored)
});
