import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductQrPayload,
  findProductByQrPayload,
  parseProductQrPayload,
} from './productQrLookupHelpers';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { Product } from '../types';

test('buildProductQrPayload formats canonical URL or app scheme', () => {
  const sample = INITIAL_PRODUCTS[0];
  assert.equal(
    buildProductQrPayload(sample, 'https://onalaastore.com/'),
    `https://onalaastore.com/?product=${encodeURIComponent(sample.id)}`
  );
  assert.equal(
    buildProductQrPayload(sample),
    `onalaa://product/${encodeURIComponent(sample.id)}`
  );
});

test('parseProductQrPayload extracts Product IDs, SKUs, barcodes, JSON payloads, and URLs', () => {
  const urlQuery = parseProductQrPayload('https://onalaastore.com/?product=prod-iphone16promax');
  assert.equal(urlQuery?.lookupValue, 'prod-iphone16promax');
  assert.equal(urlQuery?.detectedField, 'product_id');

  const hashUrl = parseProductQrPayload('https://onalaastore.com/#/product/prod-anker737');
  assert.equal(hashUrl?.lookupValue, 'prod-anker737');
  assert.equal(hashUrl?.detectedField, 'product_id');

  const jsonPayload = parseProductQrPayload('{"sku":"APL-IP16PM-256","store":"ON ALAA STORE"}');
  assert.equal(jsonPayload?.lookupValue, 'APL-IP16PM-256');
  assert.equal(jsonPayload?.detectedField, 'sku');

  const barcode = parseProductQrPayload('195949038221');
  assert.equal(barcode?.lookupValue, '195949038221');
  assert.equal(barcode?.detectedField, 'barcode');

  const labeled = parseProductQrPayload('ON ALAA STORE\nSKU: GL-ULT2-49\nWarranty: 12M');
  assert.equal(labeled?.lookupValue, 'GL-ULT2-49');
  assert.equal(labeled?.detectedField, 'sku');

  assert.equal(parseProductQrPayload('   '), null);
});

test('findProductByQrPayload resolves store products by ID URL, SKU, variant SKU, and barcode', () => {
  const fixtureProducts: Product[] = [
    {
      ...INITIAL_PRODUCTS[0],
      id: 'prod-iphone16promax',
      sku: 'APL-IP16PM-256',
      barcode: '195949038221',
      variants: [
        { id: 'v-512', name: '512GB', price: 1399, stock: 4, sku: 'APL-IP16PM-512' },
      ],
      isPublished: true,
    },
    {
      ...INITIAL_PRODUCTS[1],
      id: 'prod-anker737',
      sku: 'ANK-737-24K',
      barcode: '194644109929',
      isPublished: true,
    },
  ];

  // Match via URL query parameter
  const byUrl = findProductByQrPayload('https://onalaastore.com/?product=prod-iphone16promax', fixtureProducts);
  assert.equal(byUrl.matchedProduct?.id, 'prod-iphone16promax');
  assert.equal(byUrl.matchReason, 'product_id');

  // Match via SKU (case-insensitive)
  const bySku = findProductByQrPayload('ank-737-24k', fixtureProducts);
  assert.equal(bySku.matchedProduct?.id, 'prod-anker737');
  assert.equal(bySku.matchReason, 'sku');

  // Match via Variant SKU
  const byVariant = findProductByQrPayload('{"sku":"APL-IP16PM-512"}', fixtureProducts);
  assert.equal(byVariant.matchedProduct?.id, 'prod-iphone16promax');
  assert.equal(byVariant.matchReason, 'variant_sku');

  // Match via Barcode
  const byBarcode = findProductByQrPayload('194644109929', fixtureProducts);
  assert.equal(byBarcode.matchedProduct?.id, 'prod-anker737');
  assert.equal(byBarcode.matchReason, 'barcode');

  // Unmatched QR code cleanly returns null matchedProduct with parsed metadata
  const missed = findProductByQrPayload('https://example.com/?sku=DOES-NOT-EXIST-999', fixtureProducts);
  assert.equal(missed.matchedProduct, null);
  assert.equal(missed.parsed?.lookupValue, 'DOES-NOT-EXIST-999');
});
