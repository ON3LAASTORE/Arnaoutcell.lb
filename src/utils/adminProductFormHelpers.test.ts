import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminProductRecord,
  sanitizeProductId,
  validateAdminProductForm,
} from './adminProductFormHelpers';
import type { Product } from '../types';

test('sanitizeProductId generates firestore-safe IDs', () => {
  assert.equal(sanitizeProductId('prod-1732600000'), 'prod-1732600000');
  assert.equal(sanitizeProductId('  iPhone 17 / Pro Max! '), 'iPhone-17-Pro-Max');
  assert.match(sanitizeProductId('   ', 12345), /^prod-12345$/);
});

test('validateAdminProductForm rejects missing required fields and invalid numbers', () => {
  const missingResult = validateAdminProductForm({
    name: '   ',
    brand: '',
    category: 'Phones',
    sku: '  ',
    price: -10,
    originalPrice: 100,
    stock: 'abc',
  });

  assert.equal(missingResult.valid, false);
  if (!missingResult.valid) {
    assert.ok(missingResult.errors.some((e) => e.includes('Product name')));
    assert.ok(missingResult.errors.some((e) => e.includes('SKU')));
    assert.ok(missingResult.errors.some((e) => e.includes('Brand')));
    assert.ok(missingResult.errors.some((e) => e.includes('Selling price')));
    assert.ok(missingResult.errors.some((e) => e.includes('Stock quantity')));
  }
});

test('buildAdminProductRecord coerces numeric fields, computes discount, and preserves existing metadata', () => {
  const existing: Product = {
    id: 'prod-existing-1',
    name: 'Old Name',
    brand: 'Apple',
    category: 'Phones',
    sku: 'SKU-OLD',
    originalPrice: 1200,
    price: 1000,
    stock: 4,
    images: ['https://example.com/old.jpg'],
    description: 'Old description',
    specifications: [],
    warrantyMonths: 12,
    isPublished: true,
    rating: 4.8,
    reviewCount: 14,
    soldCount: 22,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const built = buildAdminProductRecord(
    {
      name: '  iPhone 17 Pro  ',
      brand: 'Apple',
      category: 'Phones',
      sku: 'OAA-IP17P',
      price: '999',
      originalPrice: '1249',
      stock: '15.4',
      lowStockThreshold: '4',
      warrantyMonths: '24',
      isSpecialOffer: true,
      isFeatured: true,
      isPublished: true,
    },
    { existingProduct: existing, nowMs: 1_750_000_000_000 }
  );

  assert.equal(built.ok, true);
  if (built.ok) {
    assert.equal(built.product.id, 'prod-existing-1');
    assert.equal(built.product.name, 'iPhone 17 Pro');
    assert.equal(built.product.price, 999);
    assert.equal(built.product.originalPrice, 1249);
    assert.equal(built.product.discountPercentage, 20);
    assert.equal(built.product.stock, 15);
    assert.equal(built.product.lowStockThreshold, 4);
    assert.equal(built.product.warrantyMonths, 24);
    assert.equal(built.product.rating, 4.8);
    assert.equal(built.product.reviewCount, 14);
    assert.equal(built.product.soldCount, 22);
    assert.equal(built.product.createdAt, '2026-01-01T00:00:00.000Z');
    assert.equal(built.product.isSpecialOffer, true);
    assert.equal(built.product.isFeatured, true);
    assert.equal(built.product.isPublished, true);
  }
});
