import { Brand, Category, Product } from '../types';
import {
  filterProductsByCategorySlug,
  filterProductsGlobally,
  findProductSkuMatch,
  getUniqueMatchingBrands,
  getUniqueMatchingCategories,
  MatchedBrandInfo,
  MatchedCategoryInfo,
  resolveCategoryThumbnailImage,
  resolveProductThumbnailUrl,
  SearchFilterMode,
  SkuMatchDetails,
} from './globalSearchHelpers';
import { normalizeSearchTerm } from './searchSuggestions';

export const DEFAULT_AUTOCOMPLETE_DEBOUNCE_MS = 180;
export const DEFAULT_AUTOCOMPLETE_MAX_RESULTS = 5;
export const DEFAULT_AUTOCOMPLETE_MAX_CATEGORIES = 4;
export const DEFAULT_AUTOCOMPLETE_MAX_BRANDS = 4;
export const DEFAULT_AUTOCOMPLETE_CACHE_TTL_MS = 45_000;
export const DEFAULT_AUTOCOMPLETE_CACHE_MAX_ENTRIES = 60;

export type AutocompleteDataSource = 'firestore' | 'cache' | 'merged';

export interface AutocompleteCategorySuggestion extends MatchedCategoryInfo {
  matchKind: 'direct' | 'related';
  matchedProductCount?: number;
}

export interface AutocompleteBrandSuggestion extends MatchedBrandInfo {
  matchKind: 'direct' | 'related';
  matchedProductCount?: number;
}

export interface AutocompleteProductSuggestion {
  product: Product;
  thumbnailUrl?: string;
  displayPrice: number;
  originalPrice: number;
  hasDiscount: boolean;
  displayStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  skuMatch: SkuMatchDetails | null;
  displaySku: string;
  isExactSku: boolean;
}

export interface AutocompleteSearchResult {
  query: string;
  normalizedQuery: string;
  suggestions: AutocompleteProductSuggestion[];
  totalMatchedCount: number;
  categorySuggestions?: AutocompleteCategorySuggestion[];
  totalCategoryMatchCount?: number;
  brandSuggestions?: AutocompleteBrandSuggestion[];
  totalBrandMatchCount?: number;
  source: AutocompleteDataSource;
  fromCache: boolean;
  isQuotaLimited: boolean;
  isOfflineFallback: boolean;
  fetchedAt: number;
}

export function buildAutocompleteCacheKey(
  query: string,
  filterMode: SearchFilterMode = 'all',
  categorySlug: string = 'all'
): string {
  const normQuery = normalizeSearchTerm(query).replace(/\s+/g, ' ').trim();
  const normSlug = (categorySlug || 'all').trim().toLowerCase() || 'all';
  return `${normQuery}::${filterMode}::${normSlug}`;
}

export function shouldFetchLiveAutocomplete(query: string): boolean {
  return normalizeSearchTerm(query).length >= 1;
}

export function isStaleAutocompleteRequest(
  requestSeq: number,
  activeRequestSeq: number
): boolean {
  return requestSeq !== activeRequestSeq;
}

/**
 * Merges live Firestore catalog documents with local/in-memory storefront products.
 * Cloud records override local records with matching IDs while preserving unique local entries.
 */
export function mergeProductPoolsForAutocomplete(
  cloudProducts: Product[],
  localProducts: Product[]
): Product[] {
  if (!Array.isArray(cloudProducts) || cloudProducts.length === 0) {
    return Array.isArray(localProducts) ? [...localProducts] : [];
  }
  if (!Array.isArray(localProducts) || localProducts.length === 0) {
    return [...cloudProducts];
  }

  const byId = new Map<string, Product>();
  for (const prod of localProducts) {
    if (prod && prod.id) {
      byId.set(prod.id, prod);
    }
  }
  for (const cloudProd of cloudProducts) {
    if (cloudProd && cloudProd.id) {
      byId.set(cloudProd.id, cloudProd);
    }
  }
  return Array.from(byId.values());
}

/**
 * Projects a matched Product into an auto-complete row item with resolved thumbnail,
 * pricing, variant/SKU match details, and stock indicator flags.
 */
export function buildAutocompleteSuggestionItem(
  product: Product,
  query: string
): AutocompleteProductSuggestion {
  const skuMatch = findProductSkuMatch(product, query);
  const displayPrice =
    skuMatch?.matchedVariant && Number.isFinite(skuMatch.matchedVariant.price)
      ? skuMatch.matchedVariant.price
      : product.price;
  const displayStock =
    skuMatch?.matchedVariant && typeof skuMatch.matchedVariant.stock === 'number'
      ? skuMatch.matchedVariant.stock
      : product.stock;
  const displaySku = skuMatch ? skuMatch.matchedSku : product.sku;
  const isExactSku = skuMatch?.matchKind === 'exact';
  const hasDiscount = !skuMatch?.matchedVariant && product.originalPrice > product.price;
  const isLowStock = displayStock > 0 && displayStock <= (product.lowStockThreshold || 3);
  const isOutOfStock = displayStock === 0;
  const thumbnailUrl =
    skuMatch?.matchedVariant?.image?.trim() || resolveProductThumbnailUrl(product);

  return {
    product,
    thumbnailUrl,
    displayPrice,
    originalPrice: product.originalPrice,
    hasDiscount,
    displayStock,
    isLowStock,
    isOutOfStock,
    skuMatch,
    displaySku,
    isExactSku,
  };
}

function findCategoryForProduct(product: Product, categories: Category[]): Category | undefined {
  const prodCatNorm = normalizeSearchTerm(product.category || '');
  if (!prodCatNorm) return undefined;
  const prodCatSlug = prodCatNorm.replace(/[^a-z0-9]+/g, '-');
  return categories.find((cat) => {
    const cName = normalizeSearchTerm(cat.name);
    const cSlug = normalizeSearchTerm(cat.slug);
    return cName === prodCatNorm || cSlug === prodCatNorm || cSlug === prodCatSlug;
  });
}

/**
 * Resolves suggested categories for auto-complete:
 * 1) Direct name/Arabic/slug/subcategory matches first (`matchKind: 'direct'`)
 * 2) In 'all' mode, related categories inferred from matched products (`matchKind: 'related'`)
 *    so typing e.g. "iPhone" or "Galaxy" also suggests "Phones" for one-click browsing.
 */
export function resolveAutocompleteCategories(options: {
  products: Product[];
  rankedProducts?: Product[];
  categories: Category[];
  query: string;
  filterMode?: SearchFilterMode;
  maxResults?: number;
}): {
  suggestions: AutocompleteCategorySuggestion[];
  totalMatchedCount: number;
} {
  const {
    products,
    rankedProducts = [],
    categories,
    query,
    filterMode = 'all',
    maxResults = DEFAULT_AUTOCOMPLETE_MAX_CATEGORIES,
  } = options;

  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery || filterMode === 'name' || filterMode === 'brand' || filterMode === 'sku') {
    return { suggestions: [], totalMatchedCount: 0 };
  }

  const matchedCountBySlug = new Map<string, number>();
  for (const prod of rankedProducts) {
    if (prod.isPublished === false) continue;
    const cat = findCategoryForProduct(prod, categories);
    if (!cat) continue;
    matchedCountBySlug.set(cat.slug, (matchedCountBySlug.get(cat.slug) || 0) + 1);
  }

  const directMatches: AutocompleteCategorySuggestion[] = getUniqueMatchingCategories(
    products,
    categories,
    query
  ).map((cat) => ({
    ...cat,
    matchKind: 'direct' as const,
    matchedProductCount: matchedCountBySlug.get(cat.slug),
  }));

  const seenSlugs = new Set(directMatches.map((c) => c.slug));
  const relatedMatches: AutocompleteCategorySuggestion[] = [];

  if (filterMode === 'all' && rankedProducts.length > 0) {
    // Count total published products per category slug
    const totalCountBySlug = new Map<string, number>();
    for (const prod of products) {
      if (prod.isPublished === false) continue;
      const cat = findCategoryForProduct(prod, categories);
      if (!cat) continue;
      totalCountBySlug.set(cat.slug, (totalCountBySlug.get(cat.slug) || 0) + 1);
    }

    for (const prod of rankedProducts) {
      if (prod.isPublished === false) continue;
      const cat = findCategoryForProduct(prod, categories);
      if (!cat || seenSlugs.has(cat.slug)) continue;
      seenSlugs.add(cat.slug);

      const resolvedThumb = resolveCategoryThumbnailImage(cat, products);
      relatedMatches.push({
        id: cat.id,
        name: cat.name,
        nameAr: cat.nameAr,
        slug: cat.slug,
        iconName: cat.iconName,
        image: resolvedThumb.image,
        topProductName: resolvedThumb.topProductName || prod.name,
        subcategories: cat.subcategories,
        count: totalCountBySlug.get(cat.slug) || matchedCountBySlug.get(cat.slug) || 1,
        isExact: false,
        matchKind: 'related',
        matchedProductCount: matchedCountBySlug.get(cat.slug) || 1,
      });
    }

    relatedMatches.sort(
      (a, b) =>
        (b.matchedProductCount || 0) - (a.matchedProductCount || 0) || b.count - a.count
    );
  }

  const combined = [...directMatches, ...relatedMatches];
  const safeLimit = Math.max(1, Math.min(8, Math.round(maxResults)));
  return {
    suggestions: combined.slice(0, safeLimit),
    totalMatchedCount: combined.length,
  };
}

/**
 * Resolves suggested brands for auto-complete:
 * 1) Direct brand name/description/synonym matches first (`matchKind: 'direct'`)
 * 2) In 'all' mode, related brands inferred from matched products (`matchKind: 'related'`)
 *    so searching for a device model also surfaces its brand for 1-click filtering.
 */
export function resolveAutocompleteBrands(options: {
  products: Product[];
  rankedProducts?: Product[];
  brands: Brand[];
  query: string;
  filterMode?: SearchFilterMode;
  maxResults?: number;
}): {
  suggestions: AutocompleteBrandSuggestion[];
  totalMatchedCount: number;
} {
  const {
    products,
    rankedProducts = [],
    brands,
    query,
    filterMode = 'all',
    maxResults = DEFAULT_AUTOCOMPLETE_MAX_BRANDS,
  } = options;

  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery || filterMode === 'name' || filterMode === 'category' || filterMode === 'sku') {
    return { suggestions: [], totalMatchedCount: 0 };
  }

  // Fallback product thumbnail and total published count per normalized brand
  const totalCountByBrand = new Map<string, number>();
  const thumbByBrand = new Map<string, string>();
  const matchedCountByBrand = new Map<string, number>();

  for (const prod of products) {
    if (prod.isPublished === false || !prod.brand?.trim()) continue;
    const bKey = prod.brand.trim().toLowerCase();
    totalCountByBrand.set(bKey, (totalCountByBrand.get(bKey) || 0) + 1);
    if (!thumbByBrand.has(bKey)) {
      const thumb = resolveProductThumbnailUrl(prod);
      if (thumb) thumbByBrand.set(bKey, thumb);
    }
  }

  for (const prod of rankedProducts) {
    if (prod.isPublished === false || !prod.brand?.trim()) continue;
    const bKey = prod.brand.trim().toLowerCase();
    matchedCountByBrand.set(bKey, (matchedCountByBrand.get(bKey) || 0) + 1);
  }

  const brandMetaByKey = new Map<string, Brand>();
  for (const b of brands) {
    if (b?.name?.trim()) {
      brandMetaByKey.set(b.name.trim().toLowerCase(), b);
    }
  }

  const directMatches: AutocompleteBrandSuggestion[] = getUniqueMatchingBrands(
    products,
    brands,
    query
  ).map((b) => {
    const key = b.name.trim().toLowerCase();
    return {
      ...b,
      logo: b.logo?.trim() || thumbByBrand.get(key),
      matchKind: 'direct' as const,
      matchedProductCount: matchedCountByBrand.get(key),
    };
  });

  const seenBrands = new Set(directMatches.map((b) => b.name.trim().toLowerCase()));
  const relatedMatches: AutocompleteBrandSuggestion[] = [];

  if (filterMode === 'all' && rankedProducts.length > 0) {
    for (const prod of rankedProducts) {
      if (prod.isPublished === false || !prod.brand?.trim()) continue;
      const rawBrand = prod.brand.trim();
      const key = rawBrand.toLowerCase();
      if (seenBrands.has(key)) continue;
      seenBrands.add(key);

      const meta = brandMetaByKey.get(key);
      relatedMatches.push({
        name: meta?.name || rawBrand,
        count: totalCountByBrand.get(key) || matchedCountByBrand.get(key) || 1,
        logo: meta?.logo?.trim() || thumbByBrand.get(key),
        isExact: false,
        matchKind: 'related',
        matchedProductCount: matchedCountByBrand.get(key) || 1,
      });
    }

    relatedMatches.sort(
      (a, b) =>
        (b.matchedProductCount || 0) - (a.matchedProductCount || 0) || b.count - a.count
    );
  }

  const combined = [...directMatches, ...relatedMatches];
  const safeLimit = Math.max(1, Math.min(8, Math.round(maxResults)));
  return {
    suggestions: combined.slice(0, safeLimit),
    totalMatchedCount: combined.length,
  };
}

export interface MergeAndRankAutocompleteOptions {
  cloudProducts?: Product[];
  localProducts?: Product[];
  query: string;
  filterMode?: SearchFilterMode;
  categories?: Category[];
  brands?: Brand[];
  categorySlug?: string;
  maxResults?: number;
  maxCategories?: number;
  maxBrands?: number;
}

/**
 * Merges live Firestore products with local products, scopes by category if set,
 * filters/ranks matches across name, brand, category, and SKU, and returns a
 * bounded compact list of product, category, and brand suggestions with thumbnails.
 */
export function mergeAndRankAutocompleteProducts({
  cloudProducts = [],
  localProducts = [],
  query,
  filterMode = 'all',
  categories = [],
  brands = [],
  categorySlug = 'all',
  maxResults = DEFAULT_AUTOCOMPLETE_MAX_RESULTS,
  maxCategories = DEFAULT_AUTOCOMPLETE_MAX_CATEGORIES,
  maxBrands = DEFAULT_AUTOCOMPLETE_MAX_BRANDS,
}: MergeAndRankAutocompleteOptions): {
  suggestions: AutocompleteProductSuggestion[];
  totalMatchedCount: number;
  categorySuggestions: AutocompleteCategorySuggestion[];
  totalCategoryMatchCount: number;
  brandSuggestions: AutocompleteBrandSuggestion[];
  totalBrandMatchCount: number;
} {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) {
    return {
      suggestions: [],
      totalMatchedCount: 0,
      categorySuggestions: [],
      totalCategoryMatchCount: 0,
      brandSuggestions: [],
      totalBrandMatchCount: 0,
    };
  }

  const mergedPool = mergeProductPoolsForAutocomplete(cloudProducts, localProducts);
  const scopedPool = filterProductsByCategorySlug(mergedPool, categories, categorySlug);
  const rankedProducts = filterProductsGlobally(scopedPool, query, filterMode, categories);
  const safeLimit = Math.max(1, Math.min(10, Math.round(maxResults)));

  const scopedCategories =
    categorySlug && categorySlug !== 'all'
      ? categories.filter(
          (c) => normalizeSearchTerm(c.slug) === normalizeSearchTerm(categorySlug)
        )
      : categories;

  const scopedBrands =
    categorySlug && categorySlug !== 'all'
      ? brands.filter((b) =>
          scopedPool.some(
            (p) =>
              p.isPublished !== false &&
              p.brand &&
              p.brand.trim().toLowerCase() === b.name.trim().toLowerCase()
          )
        )
      : brands;

  const productSuggestions = rankedProducts
    .slice(0, safeLimit)
    .map((product) => buildAutocompleteSuggestionItem(product, query));

  const categoryLimit = productSuggestions.length > 0 ? Math.min(maxCategories, 3) : maxCategories;
  const brandLimit = productSuggestions.length > 0 ? Math.min(maxBrands, 3) : maxBrands;

  const catResult = resolveAutocompleteCategories({
    products: scopedPool,
    rankedProducts,
    categories: scopedCategories,
    query,
    filterMode,
    maxResults: categoryLimit,
  });

  const brandResult = resolveAutocompleteBrands({
    products: scopedPool,
    rankedProducts,
    brands: scopedBrands,
    query,
    filterMode,
    maxResults: brandLimit,
  });

  return {
    suggestions: productSuggestions,
    totalMatchedCount: rankedProducts.length,
    categorySuggestions: catResult.suggestions,
    totalCategoryMatchCount: catResult.totalMatchedCount,
    brandSuggestions: brandResult.suggestions,
    totalBrandMatchCount: brandResult.totalMatchedCount,
  };
}

interface QueryCacheEntry {
  result: AutocompleteSearchResult;
  expiresAt: number;
}

export interface AutocompleteQueryCache {
  get: (key: string) => AutocompleteSearchResult | null;
  set: (key: string, result: AutocompleteSearchResult) => void;
  clear: () => void;
  size: () => number;
}

export function createAutocompleteQueryCache(options?: {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}): AutocompleteQueryCache {
  const ttlMs = Math.max(500, options?.ttlMs ?? DEFAULT_AUTOCOMPLETE_CACHE_TTL_MS);
  const maxEntries = Math.max(1, options?.maxEntries ?? DEFAULT_AUTOCOMPLETE_CACHE_MAX_ENTRIES);
  const nowFn = options?.now ?? (() => Date.now());
  const store = new Map<string, QueryCacheEntry>();

  const pruneExpired = (nowMs: number) => {
    for (const [k, entry] of store.entries()) {
      if (entry.expiresAt <= nowMs) {
        store.delete(k);
      }
    }
  };

  return {
    get(key: string): AutocompleteSearchResult | null {
      const nowMs = nowFn();
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= nowMs) {
        store.delete(key);
        return null;
      }
      // Refresh LRU insertion order
      store.delete(key);
      store.set(key, entry);
      return entry.result;
    },
    set(key: string, result: AutocompleteSearchResult): void {
      const nowMs = nowFn();
      pruneExpired(nowMs);
      if (store.has(key)) {
        store.delete(key);
      } else if (store.size >= maxEntries) {
        const oldestKey = store.keys().next().value;
        if (oldestKey !== undefined) {
          store.delete(oldestKey);
        }
      }
      store.set(key, {
        result,
        expiresAt: nowMs + ttlMs,
      });
    },
    clear(): void {
      store.clear();
    },
    size(): number {
      pruneExpired(nowFn());
      return store.size;
    },
  };
}
