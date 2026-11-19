import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildColorVariantConfigs,
  extractProductColorData,
  findVariantForColor,
  resolveExplicitColorImage,
  resolveProductImageForColor,
} from './colorVariantHelpers';
import { Product } from '../types';

const SAMPLE_PRODUCT: Pick<Product, 'images' | 'colors' | 'colorImages' | 'variants'> = {
  images: ['https://example.com/desert-burgundy.jpg', 'https://example.com/side.jpg'],
  colors: ['Desert Titanium', 'Natural Titanium', 'White Titanium', 'Black Titanium'],
  colorImages: {
    'White Titanium': 'https://example.com/white-titanium.jpg',
    'Black Titanium': 'https://example.com/black-titanium.jpg',
  },
  variants: [
    {
      id: 'var-color-white-titanium',
      name: 'White Titanium',
      color: 'White Titanium',
      price: 1299,
      stock: 4,
      sku: 'APL-16PM-WHT',
      image: 'https://example.com/white-titanium.jpg',
    },
  ],
};

test('resolveExplicitColorImage matches configured color images case-insensitively and returns undefined when absent', () => {
  assert.equal(
    resolveExplicitColorImage(SAMPLE_PRODUCT, 'White Titanium'),
    'https://example.com/white-titanium.jpg'
  );
  assert.equal(
    resolveExplicitColorImage(SAMPLE_PRODUCT, '  white titanium '),
    'https://example.com/white-titanium.jpg'
  );
  assert.equal(resolveExplicitColorImage(SAMPLE_PRODUCT, 'Natural Titanium'), undefined);
});

test('resolveProductImageForColor returns per-color image when set and falls back to main product image otherwise', () => {
  assert.equal(
    resolveProductImageForColor(SAMPLE_PRODUCT, 'White Titanium'),
    'https://example.com/white-titanium.jpg'
  );
  assert.equal(
    resolveProductImageForColor(SAMPLE_PRODUCT, 'Natural Titanium'),
    'https://example.com/desert-burgundy.jpg'
  );
});

test('findVariantForColor matches color-specific pricing, SKU, and stock overrides', () => {
  const variant = findVariantForColor(SAMPLE_PRODUCT, 'White Titanium');
  assert.ok(variant);
  assert.equal(variant.price, 1299);
  assert.equal(variant.sku, 'APL-16PM-WHT');
  assert.equal(variant.stock, 4);
  assert.equal(findVariantForColor(SAMPLE_PRODUCT, 'Desert Titanium'), undefined);
});

test('buildColorVariantConfigs merges legacy colors, colorImages, and variants cleanly for Admin editing', () => {
  const rows = buildColorVariantConfigs(SAMPLE_PRODUCT);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { color: 'Desert Titanium' });
  assert.deepEqual(rows[2], {
    color: 'White Titanium',
    image: 'https://example.com/white-titanium.jpg',
    price: 1299,
    sku: 'APL-16PM-WHT',
    stock: 4,
  });
});

test('extractProductColorData persists per-color images, sparse variant overrides, and preserves non-color storage variants', () => {
  const existingStorageVariant = {
    id: 'var-512gb',
    name: '512GB Storage',
    price: 1399,
    stock: 3,
    sku: 'APL-16PM-512',
  };

  const result = extractProductColorData(
    [
      { color: 'Desert Titanium', image: 'https://example.com/desert.jpg' },
      { color: 'White Titanium', image: 'https://example.com/white.jpg', price: 1289, sku: 'APL-WHT', stock: 6 },
      { color: 'Natural Titanium' },
    ],
    { price: 1249, sku: 'APL-BASE', stock: 10 },
    [existingStorageVariant]
  );

  assert.deepEqual(result.colors, ['Desert Titanium', 'White Titanium', 'Natural Titanium']);
  assert.deepEqual(result.colorImages, {
    'Desert Titanium': 'https://example.com/desert.jpg',
    'White Titanium': 'https://example.com/white.jpg',
  });
  assert.equal(result.variants.length, 2);
  assert.equal(result.variants[0].id, 'var-512gb');
  assert.equal(result.variants[1].color, 'White Titanium');
  assert.equal(result.variants[1].price, 1289);
  assert.equal(result.variants[1].image, 'https://example.com/white.jpg');
});
