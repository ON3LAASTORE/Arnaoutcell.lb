import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCatalogProducts } from './catalogMergeHelpers';
import type { Product } from '../types';

function makeProduct(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: `Product ${id}`,
    brand: 'Apple',
    category: 'Phones',
    sku: `SKU-${id}`,
    originalPrice: 500,
    price: 450,
    stock: 10,
    images: ['https://example.com/p.jpg'],
    description: 'Test device',
    specifications: [],
    warrantyMonths: 12,
    isPublished: true,
    rating: 5,
    reviewCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('mergeCatalogProducts keeps newly added server products when Firestore snapshot only has existing products', () => {
  const merged = mergeCatalogProducts({
    cloudProducts: [makeProduct('cloud-1', { price: 800 })],
    serverRecords: [
      {
        product: makeProduct('prod-new-1', { name: 'iPhone 17 Test', price: 1299 }),
        updatedAtMs: 2000,
        syncedToFirestore: false,
      },
    ],
    initialProducts: [makeProduct('seed-1')],
  });

  assert.deepEqual(
    merged.map((p) => p.id),
    ['prod-new-1', 'cloud-1', 'seed-1']
  );
  assert.equal(merged[0].price, 1299);
});

test('mergeCatalogProducts prefers un-synced server edit over stale cloud version and respects synced cloud version', () => {
  const merged = mergeCatalogProducts({
    cloudProducts: [
      makeProduct('p-unsynced', { price: 500, stock: 5 }),
      makeProduct('p-synced', { price: 900, stock: 9 }),
    ],
    serverRecords: [
      {
        product: makeProduct('p-unsynced', { price: 650, stock: 20 }),
        updatedAtMs: 5000,
        syncedToFirestore: false,
      },
      {
        product: makeProduct('p-synced', { price: 750, stock: 3 }),
        updatedAtMs: 4000,
        syncedToFirestore: true,
      },
    ],
    initialProducts: [],
  });

  const unsynced = merged.find((p) => p.id === 'p-unsynced');
  const synced = merged.find((p) => p.id === 'p-synced');
  assert.equal(unsynced?.price, 650);
  assert.equal(unsynced?.stock, 20);
  assert.equal(synced?.price, 900);
  assert.equal(synced?.stock, 9);
});

test('mergeCatalogProducts excludes explicitly deleted products from cloud, server, and initial seed pools', () => {
  const merged = mergeCatalogProducts({
    cloudProducts: [makeProduct('cloud-1'), makeProduct('deleted-cloud')],
    serverRecords: [
      {
        product: makeProduct('deleted-server'),
        updatedAtMs: 3000,
        syncedToFirestore: false,
      },
    ],
    initialProducts: [makeProduct('seed-keep'), makeProduct('deleted-seed')],
    deletedIds: ['deleted-cloud', 'deleted-server', 'deleted-seed'],
  });

  assert.deepEqual(
    merged.map((p) => p.id),
    ['cloud-1', 'seed-keep']
  );
});

test('mergeCatalogProducts preserves locally added custom products when cloud snapshot omits them and server overlay is empty', () => {
  const merged = mergeCatalogProducts({
    cloudProducts: [makeProduct('cloud-1')],
    serverRecords: [],
    localProducts: [makeProduct('prod-local-new', { name: 'Local Custom Watch' }), makeProduct('seed-1')],
    initialProducts: [makeProduct('seed-1')],
    deletedIds: [],
  });

  assert.deepEqual(
    merged.map((p) => p.id),
    ['prod-local-new', 'cloud-1', 'seed-1']
  );
});

test('mergeCatalogProducts preserves locally edited seed products when cloud snapshot is empty or quota-limited', () => {
  const merged = mergeCatalogProducts({
    cloudProducts: [],
    serverRecords: [],
    localProducts: [makeProduct('seed-1', { price: 299, stock: 42 })],
    initialProducts: [makeProduct('seed-1', { price: 500, stock: 10 }), makeProduct('seed-2')],
    deletedIds: [],
  });

  const seed1 = merged.find((p) => p.id === 'seed-1');
  assert.equal(seed1?.price, 299);
  assert.equal(seed1?.stock, 42);
  assert.equal(merged.length, 2);
});

test('mergeCatalogProducts respects deletedIds even if product still exists in localProducts', () => {
  const merged = mergeCatalogProducts({
    cloudProducts: [],
    serverRecords: [],
    localProducts: [makeProduct('prod-removed')],
    initialProducts: [makeProduct('seed-1')],
    deletedIds: ['prod-removed'],
  });

  assert.deepEqual(
    merged.map((p) => p.id),
    ['seed-1']
  );
});
