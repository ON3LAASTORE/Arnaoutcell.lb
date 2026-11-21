import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECENT_SKU_SEARCHES_STORAGE_KEY,
  MAX_RECENT_SKU_SEARCHES,
  StorageLike,
  getRecentSkuSearches,
  recordRecentSkuSearch,
  removeRecentSkuSearch,
  clearRecentSkuSearches,
  resolveRecentSkuLookup,
} from './recentSkuSearches';
import type { Product } from '../types';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

const sampleProducts: Product[] = [
  {
    id: 'p1',
    name: 'iPhone 16 Pro Max',
    nameAr: 'آيفون 16 برو ماكس',
    brand: 'Apple',
    category: 'Smartphones',
    sku: 'APL-IP16PM-256',
    price: 1199,
    originalPrice: 1299,
    stock: 8,
    images: ['https://example.com/iphone.jpg'],
    isPublished: true,
  } as Product,
  {
    id: 'p2',
    name: 'Tecno Spark 50C',
    nameAr: 'تكنو سبارك 50C',
    brand: 'Tecno',
    category: 'Smartphones',
    sku: 'TEC-SPK50C-128',
    price: 190,
    originalPrice: 190,
    stock: 12,
    images: ['https://example.com/tecno.jpg'],
    isPublished: true,
    variants: [
      {
        id: 'v-512',
        name: '512GB',
        sku: 'TEC-SPK50C-512',
        price: 260,
        stock: 4,
      },
    ],
  } as Product,
];

describe('recentSkuSearches', () => {
  it('stores at most the last 5 SKU searches in most-recent-first order', () => {
    const storage = createMemoryStorage();
    assert.equal(MAX_RECENT_SKU_SEARCHES, 5);
    assert.deepEqual(getRecentSkuSearches(storage), []);

    recordRecentSkuSearch({ sku: 'SKU-001' }, storage);
    recordRecentSkuSearch({ sku: 'SKU-002' }, storage);
    recordRecentSkuSearch({ sku: 'SKU-003' }, storage);
    recordRecentSkuSearch({ sku: 'SKU-004' }, storage);
    recordRecentSkuSearch({ sku: 'SKU-005' }, storage);
    const list = recordRecentSkuSearch({ sku: 'SKU-006' }, storage);

    assert.deepEqual(
      list.map((e) => e.sku),
      ['SKU-006', 'SKU-005', 'SKU-004', 'SKU-003', 'SKU-002']
    );
    assert.equal(list.length, 5);
  });

  it('deduplicates SKU codes case-insensitively and compactly and promotes re-searched SKUs to the top', () => {
    const storage = createMemoryStorage();

    recordRecentSkuSearch({ sku: 'APL-IP16PM-256', product: sampleProducts[0] }, storage);
    recordRecentSkuSearch({ sku: 'TEC-SPK50C-512', product: sampleProducts[1] }, storage);

    const promoted = recordRecentSkuSearch({ sku: '  aplip16pm256 ' }, storage);

    assert.equal(promoted.length, 2);
    assert.equal(promoted[0].sku, 'aplip16pm256');
    assert.equal(promoted[0].productId, 'p1');
    assert.equal(promoted[1].sku, 'TEC-SPK50C-512');
  });

  it('ignores blank or invalid SKUs and survives malformed JSON in storage', () => {
    const storage = createMemoryStorage();
    recordRecentSkuSearch({ sku: 'APL-IP16PM-256' }, storage);
    const afterBlank = recordRecentSkuSearch({ sku: '   ' }, storage);
    assert.equal(afterBlank.length, 1);

    storage.setItem(RECENT_SKU_SEARCHES_STORAGE_KEY, '{corrupt json');
    assert.deepEqual(getRecentSkuSearches(storage), []);
  });

  it('removes individual SKUs and clears all stored SKUs cleanly', () => {
    const storage = createMemoryStorage();
    recordRecentSkuSearch({ sku: 'APL-IP16PM-256' }, storage);
    recordRecentSkuSearch({ sku: 'TEC-SPK50C-512' }, storage);

    const afterRemove = removeRecentSkuSearch('apl-ip16pm-256', storage);
    assert.deepEqual(
      afterRemove.map((e) => e.sku),
      ['TEC-SPK50C-512']
    );

    const afterClear = clearRecentSkuSearches(storage);
    assert.deepEqual(afterClear, []);
    assert.equal(storage.getItem(RECENT_SKU_SEARCHES_STORAGE_KEY), null);
  });

  it('resolves stored SKU entries against live catalog products and variants', () => {
    const storage = createMemoryStorage();
    const list = recordRecentSkuSearch({ sku: 'tec-spk50c-512' }, storage);

    const resolved = resolveRecentSkuLookup(list[0], sampleProducts);
    assert.equal(resolved.product?.id, 'p2');
    assert.equal(resolved.variant?.id, 'v-512');
    assert.equal(resolved.displaySku, 'TEC-SPK50C-512');
    assert.equal(resolved.displayTitle, 'Tecno Spark 50C · 512GB');
    assert.equal(resolved.displayPrice, 260);
    assert.equal(resolved.inStock, true);
  });

  it('falls back cleanly when product name is blank or whitespace and omits base64 images from localStorage', () => {
    const storage = createMemoryStorage();
    const blankNameProduct = {
      id: 'p-arn',
      name: '   ',
      nameAr: '',
      brand: 'Oppo',
      category: 'Smartphones',
      sku: 'ARN-8463',
      price: 185,
      originalPrice: 185,
      stock: 5,
      images: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/huge-blob'],
      isPublished: true,
    } as Product;

    const list = recordRecentSkuSearch({ sku: 'ARN-8463', product: blankNameProduct }, storage);
    const rawStored = storage.getItem(RECENT_SKU_SEARCHES_STORAGE_KEY) || '';
    assert.equal(rawStored.includes('data:image'), false);

    const resolved = resolveRecentSkuLookup(list[0], [blankNameProduct]);
    assert.equal(resolved.displayTitle, 'Oppo · Smartphones');
    assert.equal(resolved.displayTitleAr, 'Oppo · Smartphones');
  });
});
