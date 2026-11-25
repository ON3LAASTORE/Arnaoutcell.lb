import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProductForFirestore, mapFirestoreDocToProduct } from './productFirestoreService';
import { cleanCategoryForFirestore } from './categoryFirestoreService';
import type { Category, Product } from '../types';

test('cleanProductForFirestore preserves warrantyMonths: 0 and enforces firestore.rules bounds', () => {
  const dirtyProduct: Product = {
    id: 'prod-test-1',
    name: '  ' + 'X'.repeat(300) + '  ',
    brand: '   ',
    category: '  ' + 'C'.repeat(90) + ' ',
    sku: '',
    price: -25,
    originalPrice: 5_000_000,
    discountPercentage: 150,
    stock: Number.NaN,
    lowStockThreshold: -4,
    images: [],
    description: '',
    specifications: [],
    colors: [],
    warrantyMonths: 0,
    isSpecialOffer: false,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: false,
    isPublished: true,
    rating: 9,
    reviewCount: -2,
    createdAt: '',
  };

  const cleaned = cleanProductForFirestore(dirtyProduct);
  assert.equal(cleaned.warrantyMonths, 0);
  assert.equal(String(cleaned.name).length, 255);
  assert.equal(cleaned.brand, 'ON ALAA STORE');
  assert.equal(String(cleaned.category).length, 64);
  assert.equal(cleaned.sku, 'prod-test-1');
  assert.equal(cleaned.price, 0);
  assert.equal(cleaned.originalPrice, 1_000_000);
  assert.equal(cleaned.discountPercentage, 100);
  assert.equal(cleaned.stock, 0);
  assert.equal(cleaned.lowStockThreshold, 0);
  assert.equal(cleaned.rating, 5);
  assert.equal(cleaned.reviewCount, 0);
  assert.ok(Array.isArray(cleaned.images) && cleaned.images.length === 1);

  const roundTripped = mapFirestoreDocToProduct('prod-test-1', cleaned);
  assert.equal(roundTripped.warrantyMonths, 0);
});

test('cleanCategoryForFirestore generates non-empty valid slug for Arabic-only category names', () => {
  const arabicCategory: Category = {
    id: 'cat-arabic-1',
    name: 'هواتف ذكية',
    nameAr: 'هواتف ذكية',
    slug: '',
    iconName: 'Smartphone',
    displayOrder: 1,
    subcategories: ['أندرويد'],
  };

  const cleaned = cleanCategoryForFirestore(arabicCategory);
  assert.equal(cleaned.id, 'cat-arabic-1');
  assert.equal(cleaned.slug, 'cat-arabic-1');
  assert.equal(cleaned.name, 'هواتف ذكية');
});
