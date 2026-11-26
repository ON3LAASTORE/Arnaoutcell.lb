import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAutocompleteCacheKey,
  buildAutocompleteSuggestionItem,
  createAutocompleteQueryCache,
  DEFAULT_AUTOCOMPLETE_MAX_RESULTS,
  isStaleAutocompleteRequest,
  mergeAndRankAutocompleteProducts,
  mergeProductPoolsForAutocomplete,
  resolveAutocompleteBrands,
  resolveAutocompleteCategories,
  shouldFetchLiveAutocomplete,
} from './productAutocompleteHelpers';
import { Brand, Category, Product } from '../types';

function makeProduct(overrides: Partial<Product> & { id: string; name: string }): Product {
  return {
    nameAr: overrides.nameAr ?? overrides.name,
    brand: overrides.brand ?? 'Apple',
    category: overrides.category ?? 'Smartphones',
    subcategory: overrides.subcategory ?? '5G',
    sku: overrides.sku ?? overrides.id.toUpperCase(),
    barcode: overrides.barcode ?? '',
    originalPrice: overrides.originalPrice ?? 999,
    price: overrides.price ?? 899,
    discountPercentage: overrides.discountPercentage ?? 10,
    stock: overrides.stock ?? 5,
    lowStockThreshold: overrides.lowStockThreshold ?? 2,
    images: overrides.images ?? [`https://cdn.example.com/${overrides.id}.jpg`],
    description: overrides.description ?? 'Flagship mobile device.',
    descriptionAr: overrides.descriptionAr ?? 'جهاز ذكي',
    specifications: overrides.specifications ?? [],
    colors: overrides.colors ?? [],
    variants: overrides.variants ?? [],
    warrantyMonths: 12,
    isSpecialOffer: false,
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false,
    isPublished: overrides.isPublished ?? true,
    rating: overrides.rating ?? 4.8,
    reviewCount: 4,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const SAMPLE_CATEGORIES: Category[] = [
  {
    id: 'cat-phones',
    name: 'Smartphones',
    nameAr: 'هواتف ذكية',
    slug: 'smartphones',
    iconName: 'Smartphone',
    displayOrder: 1,
  },
  {
    id: 'cat-chargers',
    name: 'Chargers',
    nameAr: 'شواحن',
    slug: 'chargers',
    iconName: 'Zap',
    displayOrder: 2,
  },
];

test('buildAutocompleteCacheKey normalizes query case, whitespace, and scope', () => {
  assert.equal(
    buildAutocompleteCacheKey('  iPhone   16  ', 'all', 'All'),
    'iphone 16::all::all'
  );
  assert.equal(
    buildAutocompleteCacheKey('آيفون', 'name', 'SmartPhones'),
    buildAutocompleteCacheKey('ايفون', 'name', 'smartphones')
  );
});

test('shouldFetchLiveAutocomplete rejects whitespace and accepts valid partial terms', () => {
  assert.equal(shouldFetchLiveAutocomplete(''), false);
  assert.equal(shouldFetchLiveAutocomplete('   '), false);
  assert.equal(shouldFetchLiveAutocomplete('i'), true);
  assert.equal(shouldFetchLiveAutocomplete('Ank'), true);
  assert.equal(shouldFetchLiveAutocomplete('أيفون'), true);
});

test('isStaleAutocompleteRequest detects outdated async responses', () => {
  assert.equal(isStaleAutocompleteRequest(2, 3), true);
  assert.equal(isStaleAutocompleteRequest(3, 3), false);
});

test('mergeProductPoolsForAutocomplete prioritizes cloud docs while keeping unique local products', () => {
  const local = [
    makeProduct({ id: 'p1', name: 'Local Old Name', price: 900 }),
    makeProduct({ id: 'p2', name: 'Anker Charger', brand: 'Anker', category: 'Chargers' }),
  ];
  const cloud = [
    makeProduct({ id: 'p1', name: 'Cloud Updated iPhone 16', price: 850 }),
    makeProduct({ id: 'p3', name: 'Cloud Only Tecno Camon', brand: 'Tecno' }),
  ];

  const merged = mergeProductPoolsForAutocomplete(cloud, local);
  assert.equal(merged.length, 3);
  assert.equal(merged.find((p) => p.id === 'p1')?.name, 'Cloud Updated iPhone 16');
  assert.equal(merged.find((p) => p.id === 'p1')?.price, 850);
  assert.equal(merged.find((p) => p.id === 'p3')?.name, 'Cloud Only Tecno Camon');
  assert.equal(merged.find((p) => p.id === 'p2')?.name, 'Anker Charger');
});

test('buildAutocompleteSuggestionItem resolves variant thumbnail, price, stock, and discount', () => {
  const prod = makeProduct({
    id: 'tec-1',
    name: 'Tecno Spark 30',
    sku: 'TEC-SPK30',
    price: 180,
    originalPrice: 200,
    images: ['https://cdn.example.com/main.jpg'],
    variants: [
      {
        id: 'var-256',
        name: '256GB Obsidian',
        price: 215,
        stock: 2,
        sku: 'TEC-SPK30-256',
        image: 'https://cdn.example.com/var-256.jpg',
      },
    ],
  });

  const nameHit = buildAutocompleteSuggestionItem(prod, 'Tecno');
  assert.equal(nameHit.thumbnailUrl, 'https://cdn.example.com/main.jpg');
  assert.equal(nameHit.displayPrice, 180);
  assert.equal(nameHit.hasDiscount, true);
  assert.equal(nameHit.isOutOfStock, false);

  const variantSkuHit = buildAutocompleteSuggestionItem(prod, 'TEC-SPK30-256');
  assert.equal(variantSkuHit.thumbnailUrl, 'https://cdn.example.com/var-256.jpg');
  assert.equal(variantSkuHit.displayPrice, 215);
  assert.equal(variantSkuHit.isLowStock, true);
  assert.equal(variantSkuHit.isExactSku, true);
});

test('mergeAndRankAutocompleteProducts caps compact list, excludes unpublished docs, and tracks totalMatchedCount', () => {
  const manyPhones: Product[] = Array.from({ length: 9 }, (_, i) =>
    makeProduct({
      id: `phone-${i + 1}`,
      name: `Galaxy Phone Model ${i + 1}`,
      nameAr: `هاتف جالاكسي ${i + 1}`,
      brand: 'Samsung',
      category: 'Smartphones',
      rating: 4 + (i % 5) * 0.1,
    })
  );
  manyPhones.push(
    makeProduct({
      id: 'unpublished-galaxy',
      name: 'Hidden Galaxy Prototype',
      brand: 'Samsung',
      isPublished: false,
    })
  );

  const { suggestions, totalMatchedCount } = mergeAndRankAutocompleteProducts({
    cloudProducts: manyPhones,
    localProducts: [],
    query: 'Galaxy',
    categories: SAMPLE_CATEGORIES,
  });

  assert.equal(totalMatchedCount, 9);
  assert.equal(suggestions.length, DEFAULT_AUTOCOMPLETE_MAX_RESULTS);
  assert.ok(suggestions.every((s) => Boolean(s.thumbnailUrl)));
  assert.ok(suggestions.every((s) => s.product.id !== 'unpublished-galaxy'));
});

test('mergeAndRankAutocompleteProducts enforces selected category scope and supports Arabic search', () => {
  const products = [
    makeProduct({
      id: 'cable-1',
      name: 'Anker PowerLine Cable',
      nameAr: 'كابل شحن أنكر سريع',
      brand: 'Anker',
      category: 'Chargers',
    }),
    makeProduct({
      id: 'phone-1',
      name: 'iPhone 16 Pro',
      nameAr: 'هاتف ذكي متطور',
      brand: 'Apple',
      category: 'Smartphones',
    }),
  ];

  const scopedChargers = mergeAndRankAutocompleteProducts({
    cloudProducts: products,
    query: 'Anker',
    categorySlug: 'chargers',
    categories: SAMPLE_CATEGORIES,
  });
  assert.equal(scopedChargers.suggestions.length, 1);
  assert.equal(scopedChargers.suggestions[0].product.id, 'cable-1');

  const arabicMatch = mergeAndRankAutocompleteProducts({
    cloudProducts: products,
    query: 'أنكر',
    categories: SAMPLE_CATEGORIES,
  });
  assert.equal(arabicMatch.suggestions.length, 1);
  assert.equal(arabicMatch.suggestions[0].product.id, 'cable-1');
});

test('createAutocompleteQueryCache honors TTL expiration and LRU eviction', () => {
  let fakeNow = 1000;
  const cache = createAutocompleteQueryCache({
    ttlMs: 1000,
    maxEntries: 2,
    now: () => fakeNow,
  });

  const makeRes = (q: string) => ({
    query: q,
    normalizedQuery: q.toLowerCase(),
    suggestions: [],
    totalMatchedCount: 0,
    source: 'firestore' as const,
    fromCache: false,
    isQuotaLimited: false,
    isOfflineFallback: false,
    fetchedAt: fakeNow,
  });

  cache.set('a::all::all', makeRes('a'));
  cache.set('b::all::all', makeRes('b'));
  assert.ok(cache.get('a::all::all')); // refresh 'a' recency
  cache.set('c::all::all', makeRes('c')); // should evict 'b'

  assert.equal(cache.get('b::all::all'), null);
  assert.ok(cache.get('a::all::all'));
  assert.ok(cache.get('c::all::all'));

  fakeNow += 1500; // expire TTL
  assert.equal(cache.get('a::all::all'), null);
  assert.equal(cache.size(), 0);
});

const SAMPLE_BRANDS: Brand[] = [
  {
    id: 'b-apple',
    name: 'Apple',
    logo: 'https://cdn.example.com/apple-logo.png',
    description: 'iPhones, MacBooks, and AirPods',
    featured: true,
    productCount: 3,
  },
  {
    id: 'b-anker',
    name: 'Anker',
    logo: 'https://cdn.example.com/anker-logo.png',
    description: 'GaN chargers and power banks',
    featured: true,
    productCount: 2,
  },
  {
    id: 'b-tecno',
    name: 'Tecno',
    logo: '',
    description: 'Smartphones with long battery life',
    featured: false,
    productCount: 1,
  },
];

test('mergeAndRankAutocompleteProducts suggests direct and product-inferred categories and brands', () => {
  const catalog = [
    makeProduct({
      id: 'ip-16',
      name: 'Apple iPhone 16 Pro Max',
      brand: 'Apple',
      category: 'Smartphones',
    }),
    makeProduct({
      id: 'app-2',
      name: 'Apple AirPods Pro 2',
      brand: 'Apple',
      category: 'Chargers',
    }),
    makeProduct({
      id: 'tec-50c',
      name: 'Tecno Spark 50C',
      brand: 'Tecno',
      category: 'Smartphones',
      images: ['https://cdn.example.com/spark-50c.jpg'],
    }),
    makeProduct({
      id: 'ank-cable',
      name: 'Anker 240W Braided Charger',
      brand: 'Anker',
      category: 'Chargers',
    }),
  ];

  // 1. Typing a device model ("Spark") surfaces the product plus its related category ("Smartphones") and brand ("Tecno")
  const sparkResult = mergeAndRankAutocompleteProducts({
    cloudProducts: catalog,
    query: 'Spark',
    categories: SAMPLE_CATEGORIES,
    brands: SAMPLE_BRANDS,
  });
  assert.equal(sparkResult.suggestions.length, 1);
  assert.equal(sparkResult.categorySuggestions[0]?.slug, 'smartphones');
  assert.equal(sparkResult.categorySuggestions[0]?.matchKind, 'related');
  assert.equal(sparkResult.brandSuggestions[0]?.name, 'Tecno');
  assert.equal(sparkResult.brandSuggestions[0]?.matchKind, 'related');
  // Missing explicit brand logo falls back to the brand's product thumbnail
  assert.equal(sparkResult.brandSuggestions[0]?.logo, 'https://cdn.example.com/spark-50c.jpg');

  // 2. Typing a brand ("Apple") surfaces direct brand match plus related categories containing Apple products
  const appleResult = mergeAndRankAutocompleteProducts({
    cloudProducts: catalog,
    query: 'Apple',
    categories: SAMPLE_CATEGORIES,
    brands: SAMPLE_BRANDS,
  });
  assert.equal(appleResult.brandSuggestions[0]?.name, 'Apple');
  assert.equal(appleResult.brandSuggestions[0]?.matchKind, 'direct');
  assert.ok(appleResult.categorySuggestions.some((c) => c.slug === 'smartphones' && c.matchKind === 'related'));
  assert.ok(appleResult.categorySuggestions.some((c) => c.slug === 'chargers' && c.matchKind === 'related'));

  // 3. Typing a direct category ("Chargers") ranks direct category match ahead of anything related, plus matching brands
  const chargerResult = mergeAndRankAutocompleteProducts({
    cloudProducts: catalog,
    query: 'Chargers',
    categories: SAMPLE_CATEGORIES,
    brands: SAMPLE_BRANDS,
  });
  assert.equal(chargerResult.categorySuggestions[0]?.slug, 'chargers');
  assert.equal(chargerResult.categorySuggestions[0]?.matchKind, 'direct');
  assert.ok(chargerResult.brandSuggestions.some((b) => b.name === 'Anker'));
});

test('resolveAutocompleteCategories and resolveAutocompleteBrands respect filterMode isolation', () => {
  const catalog = [
    makeProduct({
      id: 'ank-1',
      name: 'Anker GaNPrime 100W',
      brand: 'Anker',
      category: 'Chargers',
    }),
  ];

  // 'name' mode keeps results strictly to products (no category or brand suggestions)
  const nameMode = mergeAndRankAutocompleteProducts({
    cloudProducts: catalog,
    query: 'Anker',
    filterMode: 'name',
    categories: SAMPLE_CATEGORIES,
    brands: SAMPLE_BRANDS,
  });
  assert.equal(nameMode.categorySuggestions.length, 0);
  assert.equal(nameMode.brandSuggestions.length, 0);

  // 'brand' mode suggests brands only, not categories
  const brandOnly = resolveAutocompleteCategories({
    products: catalog,
    rankedProducts: catalog,
    categories: SAMPLE_CATEGORIES,
    query: 'Anker',
    filterMode: 'brand',
  });
  assert.equal(brandOnly.suggestions.length, 0);

  // 'category' mode suggests categories only, not brands
  const categoryOnly = resolveAutocompleteBrands({
    products: catalog,
    rankedProducts: catalog,
    brands: SAMPLE_BRANDS,
    query: 'Chargers',
    filterMode: 'category',
  });
  assert.equal(categoryOnly.suggestions.length, 0);

  // 'sku' mode omits both categories and brands
  const skuMode = mergeAndRankAutocompleteProducts({
    cloudProducts: catalog,
    query: 'ANK-1',
    filterMode: 'sku',
    categories: SAMPLE_CATEGORIES,
    brands: SAMPLE_BRANDS,
  });
  assert.equal(skuMode.categorySuggestions.length, 0);
  assert.equal(skuMode.brandSuggestions.length, 0);
  assert.equal(skuMode.suggestions.length, 1);
});

