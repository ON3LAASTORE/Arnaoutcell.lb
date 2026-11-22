import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCapacityVariantConfigs,
  buildColorVariantConfigs,
  calculateVariantUnitPrice,
  extractProductColorData,
  extractStructuredProductVariantsAndColors,
  findVariantForColor,
  getProductColorNames,
  getProductColorOptions,
  isCapacityAvailableForColor,
  resolveAllowedCapacityForColor,
  resolveColorShowcaseImage,
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

test('resolveColorShowcaseImage maps multi-image gallery products automatically when explicit colorImages is empty', () => {
  const liveHashedGalleryProduct: Pick<Product, 'images' | 'colors' | 'colorImages' | 'variants'> = {
    images: [
      'https://i.ibb.co/aaa111/photo1.jpg',
      'https://i.ibb.co/bbb222/photo2.jpg',
      'https://i.ibb.co/ccc333/photo3.jpg',
    ],
    colors: ['Pop Planet White', 'Cosmic Purple'],
    colorImages: {},
    variants: [],
  };

  assert.equal(
    resolveColorShowcaseImage(liveHashedGalleryProduct, 'Pop Planet White'),
    'https://i.ibb.co/aaa111/photo1.jpg'
  );
  assert.equal(
    resolveColorShowcaseImage(liveHashedGalleryProduct, 'Cosmic Purple'),
    'https://i.ibb.co/bbb222/photo2.jpg'
  );

  const keywordMatchedProduct: Pick<Product, 'images' | 'colors' | 'colorImages' | 'variants'> = {
    images: [
      'https://example.com/reno-planet-silver.jpg',
      'https://example.com/reno-planet-white.jpg',
      'https://example.com/reno-planet-purple.jpg',
    ],
    colors: ['Pop Planet White', 'Cosmic Purple'],
    colorImages: {},
  };

  // Discriminating token "white" / "purple" wins cleanly despite shared "planet" token
  assert.equal(
    resolveColorShowcaseImage(keywordMatchedProduct, 'Pop Planet White'),
    'https://example.com/reno-planet-white.jpg'
  );
  assert.equal(
    resolveColorShowcaseImage(keywordMatchedProduct, 'Cosmic Purple'),
    'https://example.com/reno-planet-purple.jpg'
  );

  // Explicit partial map still wins and leaves unmapped colors undefined for default primary image fallback
  assert.equal(resolveColorShowcaseImage(SAMPLE_PRODUCT, 'Natural Titanium'), undefined);
  assert.equal(
    resolveColorShowcaseImage(SAMPLE_PRODUCT, 'White Titanium'),
    'https://example.com/white-titanium.jpg'
  );
});

test('getProductColorOptions and structured capacity/price helpers work seamlessly across legacy and structured colors', () => {
  const structuredProduct: Pick<Product, 'images' | 'colors' | 'colorImages' | 'variants' | 'price' | 'sku' | 'stock'> = {
    images: ['https://example.com/main.jpg'],
    price: 190,
    sku: 'TEC-50C',
    stock: 15,
    colors: [
      {
        id: 'color-black',
        name: 'Obsidian Black',
        hex: '#111827',
        imageUrl: 'https://example.com/black.jpg',
      },
      {
        id: 'color-gold',
        name: 'Titanium Gold',
        hex: '#D4AF37',
        imageUrl: 'https://example.com/gold.jpg',
        priceAdjustment: 20,
        availableCapacities: ['var-cap-256'],
      },
    ],
    colorImages: {},
    variants: [
      { id: 'var-cap-128', name: '128GB', price: 190, stock: 8, sku: 'TEC-128' },
      { id: 'var-cap-256', name: '256GB', price: 230, stock: 7, sku: 'TEC-256' },
    ],
  };

  assert.deepEqual(getProductColorNames(structuredProduct), ['Obsidian Black', 'Titanium Gold']);
  const opts = getProductColorOptions(structuredProduct);
  assert.equal(opts.length, 2);
  assert.equal(opts[0].imageUrl, 'https://example.com/black.jpg');
  assert.equal(opts[1].priceAdjustment, 20);
  assert.deepEqual(opts[1].availableCapacities, ['var-cap-256']);

  // Capacity restriction checks + auto-fallback
  assert.equal(isCapacityAvailableForColor('var-cap-128', opts[0]), true);
  assert.equal(isCapacityAvailableForColor('var-cap-128', opts[1]), false);
  assert.equal(isCapacityAvailableForColor('var-cap-256', opts[1]), true);

  const capacities = buildCapacityVariantConfigs(structuredProduct);
  assert.equal(capacities.length, 2);
  const autoSwitched = resolveAllowedCapacityForColor(capacities, 'var-cap-128', opts[1]);
  assert.equal(autoSwitched?.id, 'var-cap-256');

  // Price adjustment math
  assert.equal(calculateVariantUnitPrice(190, opts[0]), 190);
  assert.equal(calculateVariantUnitPrice(230, opts[1]), 250);
  assert.equal(calculateVariantUnitPrice(10, { priceAdjustment: -25 }), 0);

  // Admin round-trip hydration -> edit -> extract
  const hydratedColors = buildColorVariantConfigs(structuredProduct);
  assert.equal(hydratedColors[1].priceAdjustment, 20);
  assert.deepEqual(hydratedColors[1].availableCapacities, ['var-cap-256']);

  const extracted = extractStructuredProductVariantsAndColors(
    hydratedColors,
    capacities,
    { price: 190, sku: 'TEC-50C', stock: 15 }
  );
  assert.equal(extracted.colors.length, 2);
  assert.equal(extracted.colors[1].priceAdjustment, 20);
  assert.deepEqual(extracted.colors[1].availableCapacities, ['var-cap-256']);
  assert.equal(extracted.colorImages['Titanium Gold'], 'https://example.com/gold.jpg');
  assert.equal(extracted.variants.length, 2);
  assert.equal(extracted.variants[1].name, '256GB');
});


