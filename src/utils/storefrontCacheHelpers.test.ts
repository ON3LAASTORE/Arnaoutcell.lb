import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStorefrontCacheManager,
  deriveSpecialOfferProducts,
  STOREFRONT_CACHE_STORAGE_KEYS,
} from './storefrontCacheHelpers';
import { Product, Category, Brand } from '../types';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: overrides.id || 'prod-1',
    name: overrides.name || 'iPhone 16 Pro',
    nameAr: overrides.nameAr || 'آيفون 16 برو',
    brand: overrides.brand || 'Apple',
    category: overrides.category || 'Phones',
    sku: overrides.sku || 'OAA-IP16P',
    barcode: overrides.barcode || '1234567890123',
    originalPrice: overrides.originalPrice ?? 1199,
    price: overrides.price ?? 1099,
    discountPercentage: overrides.discountPercentage ?? 8,
    stock: overrides.stock ?? 5,
    lowStockThreshold: 2,
    images: ['https://example.com/iphone.jpg'],
    description: 'Official genuine phone.',
    specifications: overrides.specifications ?? [],
    warrantyMonths: 12,
    isPublished: overrides.isPublished ?? true,
    isSpecialOffer: overrides.isSpecialOffer ?? false,
    rating: 5,
    reviewCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: overrides.id || 'cat-phones',
    name: overrides.name || 'Phones',
    nameAr: overrides.nameAr || 'هواتف',
    slug: overrides.slug || 'phones',
    iconName: 'Smartphone',
    displayOrder: overrides.displayOrder ?? 1,
    subcategories: [],
    ...overrides,
  };
}

test('TTL cache serves fresh reads from memory and hydrated localStorage without calling fetcher again', async () => {
  let nowMs = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const cache = createStorefrontCacheManager({
    ttlMs: 10 * 60 * 1000,
    storage,
    now: () => nowMs,
    isQuotaLimited: () => false,
  });

  let fetchCalls = 0;
  const sampleProducts = [makeProduct({ id: 'p1', isSpecialOffer: true }), makeProduct({ id: 'p2' })];

  // Cold miss fetches once
  const first = await cache.fetchWithCache('products', async () => {
    fetchCalls += 1;
    return sampleProducts;
  });

  assert.equal(fetchCalls, 1);
  assert.equal(first.fromCache, false);
  assert.equal(first.isStale, false);
  assert.equal(first.data.length, 2);

  // Derived offers cache was populated alongside products
  const offersEntry = cache.readEntry<Product[]>('offers');
  assert.ok(offersEntry);
  assert.equal(offersEntry.data.length, 1);
  assert.equal(offersEntry.data[0].id, 'p1');

  // Within TTL -> zero additional fetcher calls
  nowMs += 4 * 60 * 1000;
  const second = await cache.fetchWithCache('products', async () => {
    fetchCalls += 1;
    return [];
  });
  assert.equal(fetchCalls, 1);
  assert.equal(second.fromCache, true);
  assert.equal(second.isStale, false);

  // New cache instance simulating page reload reads persistent localStorage within TTL
  const reloadedCache = createStorefrontCacheManager({
    ttlMs: 10 * 60 * 1000,
    storage,
    now: () => nowMs,
    isQuotaLimited: () => false,
  });
  const third = await reloadedCache.fetchWithCache('products', async () => {
    fetchCalls += 1;
    return [];
  });
  assert.equal(fetchCalls, 1);
  assert.equal(third.fromCache, true);
  assert.equal(third.data.length, 2);

  // Past TTL -> triggers fresh fetch
  nowMs += 7 * 60 * 1000; // total 11 minutes > 10m TTL
  const fourth = await reloadedCache.fetchWithCache('products', async () => {
    fetchCalls += 1;
    return [makeProduct({ id: 'p3' })];
  });
  assert.equal(fetchCalls, 2);
  assert.equal(fourth.fromCache, false);
  assert.equal(fourth.data[0].id, 'p3');
});

test('in-flight deduplication shares a single fetcher call across concurrent callers', async () => {
  const storage = createMemoryStorage();
  const cache = createStorefrontCacheManager({
    ttlMs: 10 * 60 * 1000,
    storage,
    now: () => 1_700_000_000_000,
    isQuotaLimited: () => false,
  });

  let fetchCalls = 0;
  let resolveFetcher!: (cats: Category[]) => void;
  const fetcher = () =>
    new Promise<Category[]>((resolve) => {
      fetchCalls += 1;
      resolveFetcher = resolve;
    });

  const p1 = cache.fetchWithCache('categories', fetcher);
  const p2 = cache.fetchWithCache('categories', fetcher);
  const p3 = cache.fetchWithCache('categories', fetcher);

  assert.equal(fetchCalls, 1);
  assert.equal(cache.getInFlightCount(), 1);

  resolveFetcher([makeCategory()]);
  const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

  assert.equal(fetchCalls, 1);
  assert.equal(cache.getInFlightCount(), 0);
  assert.equal(r1.deduplicated, false);
  assert.equal(r2.deduplicated, true);
  assert.equal(r3.deduplicated, true);
  assert.equal(r2.data[0].id, 'cat-phones');
});

test('quota cooldown and network errors fall back gracefully to stale cached data without throwing', async () => {
  let nowMs = 1_700_000_000_000;
  let quotaLimited = false;
  const storage = createMemoryStorage();
  const cache = createStorefrontCacheManager({
    ttlMs: 5 * 60 * 1000,
    storage,
    now: () => nowMs,
    isQuotaLimited: () => quotaLimited,
  });

  const seeded = [makeProduct({ id: 'cached-1', sku: 'SKU-CACHE' })];
  await cache.fetchWithCache('products', async () => seeded);

  // Expire TTL and simulate quota exhaustion
  nowMs += 10 * 60 * 1000;
  quotaLimited = true;

  let networkCalls = 0;
  const result = await cache.fetchWithCache<Product[]>('products', async () => {
    networkCalls += 1;
    throw new Error('Quota limit exceeded');
  });

  assert.equal(networkCalls, 0);
  assert.equal(result.fromCache, true);
  assert.equal(result.isStale, true);
  assert.equal(result.data[0].id, 'cached-1');

  // Even when quota flag was false and fetcher throws, stale cache is preserved
  quotaLimited = false;
  const erroredFallback = await cache.fetchWithCache<Product[]>('products', async () => {
    networkCalls += 1;
    throw new Error('Resource exhausted');
  });
  assert.equal(networkCalls, 1);
  assert.equal(erroredFallback.fromCache, true);
  assert.equal(erroredFallback.isStale, true);
  assert.equal(erroredFallback.data[0].id, 'cached-1');

  // Cold miss that throws with fallbackData persists fallback into localStorage cache
  const coldCache = createStorefrontCacheManager({
    ttlMs: 5 * 60 * 1000,
    storage: createMemoryStorage(),
    now: () => nowMs,
    isQuotaLimited: () => false,
  });
  const coldFallback = await coldCache.fetchWithCache<Category[]>(
    'categories',
    async () => {
      throw new Error('Quota limit exceeded');
    },
    { fallbackData: [makeCategory({ id: 'fallback-cat' })], fallbackSource: 'local' }
  );
  assert.equal(coldFallback.fromCache, true);
  assert.equal(coldFallback.isStale, true);
  assert.equal(coldCache.readEntry<Category[]>('categories')?.data[0].id, 'fallback-cat');
});

test('single product lookup checks candidate lists and persistent cache first', () => {
  const storage = createMemoryStorage();
  const cache = createStorefrontCacheManager({
    ttlMs: 10 * 60 * 1000,
    storage,
    now: () => 1_700_000_000_000,
    isQuotaLimited: () => false,
  });

  const prodA = makeProduct({ id: 'prod-alpha', sku: 'OAA-999', barcode: '88001122' });
  cache.setProducts([prodA], 'firestore');

  // Direct candidate match
  const fromCandidate = cache.findProduct('oaa-999', [makeProduct({ id: 'live-1', sku: 'OAA-999' })]);
  assert.equal(fromCandidate?.id, 'live-1');

  // Cache match by ID, SKU (case-insensitive), and barcode
  assert.equal(cache.findProduct('PROD-ALPHA')?.id, 'prod-alpha');
  assert.equal(cache.findProduct('oaa-999')?.id, 'prod-alpha');
  assert.equal(cache.findProduct('88001122')?.id, 'prod-alpha');
  assert.equal(cache.findProduct('missing-id'), null);
});

test('admin cache mutations immediately update products, offers, categories, and brands with fresh TTL', async () => {
  let nowMs = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const cache = createStorefrontCacheManager({
    ttlMs: 5 * 60 * 1000,
    storage,
    now: () => nowMs,
    isQuotaLimited: () => false,
  });

  cache.setProducts([makeProduct({ id: 'p1', isSpecialOffer: false })], 'firestore');
  nowMs += 6 * 60 * 1000; // older than TTL

  // Admin edits p1 to become an active special offer
  cache.upsertProduct(makeProduct({ id: 'p1', price: 799, isSpecialOffer: true }), 'mutation');

  let refetchCount = 0;
  const freshProducts = await cache.fetchWithCache<Product[]>('products', async () => {
    refetchCount += 1;
    return [];
  });
  assert.equal(refetchCount, 0);
  assert.equal(freshProducts.data[0].price, 799);

  const offersEntry = cache.readEntry<Product[]>('offers');
  assert.equal(offersEntry?.data.length, 1);
  assert.equal(offersEntry?.data[0].id, 'p1');

  // Admin removes p1
  cache.removeProduct('p1', 'mutation');
  assert.equal(cache.readEntry<Product[]>('products')?.data.length, 0);
  assert.equal(cache.readEntry<Product[]>('offers')?.data.length, 0);

  // Admin updates categories and brands cleanly
  cache.upsertCategory(makeCategory({ id: 'cat-new', name: 'Gaming' }), 'mutation');
  cache.removeCategory('cat-new', 'mutation');
  assert.equal(cache.readEntry<Category[]>('categories')?.data.length, 0);

  const brands: Brand[] = [
    { id: 'b1', name: 'Apple', logo: 'logo.png', description: '', featured: true, productCount: 5 },
  ];
  cache.setBrands(brands, 'mutation');
  assert.ok(storage.getItem(STOREFRONT_CACHE_STORAGE_KEYS.brands));
  assert.equal(deriveSpecialOfferProducts([makeProduct({ isSpecialOffer: true, isPublished: false })]).length, 0);
});
