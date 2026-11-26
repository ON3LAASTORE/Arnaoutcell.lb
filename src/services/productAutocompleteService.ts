import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db, getIsOnline, handleFirestoreError, OperationType } from '../firebase';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { Brand, Category, Product } from '../types';
import {
  classifyFirestoreError,
  isFirestoreInQuotaCooldown,
  markFirestoreQuotaExceeded,
  shouldLogFirestoreQuotaWarning,
} from '../utils/firestoreQuotaHelpers';
import { SearchFilterMode } from '../utils/globalSearchHelpers';
import {
  AutocompleteSearchResult,
  buildAutocompleteCacheKey,
  createAutocompleteQueryCache,
  DEFAULT_AUTOCOMPLETE_MAX_BRANDS,
  DEFAULT_AUTOCOMPLETE_MAX_CATEGORIES,
  DEFAULT_AUTOCOMPLETE_MAX_RESULTS,
  mergeAndRankAutocompleteProducts,
  mergeProductPoolsForAutocomplete,
} from '../utils/productAutocompleteHelpers';
import { normalizeSearchTerm } from '../utils/searchSuggestions';
import { storefrontCache } from '../utils/storefrontCacheHelpers';
import {
  fetchServerCatalogOverlay,
  getCachedServerCatalogOverlay,
  mapFirestoreDocToProduct,
} from './productFirestoreService';
import { mergeCatalogProducts } from '../utils/catalogMergeHelpers';

const PRODUCTS_COLLECTION = 'products';
const LIVE_CLOUD_SYNC_WINDOW_MS = 20_000;
const FIRESTORE_AUTOCOMPLETE_DOC_LIMIT = 150;

const autocompleteQueryCache = createAutocompleteQueryCache();

let lastCloudCatalogFetchAt = 0;
let lastCloudCatalogProducts: Product[] = [];
let inFlightCloudCatalogFetch: Promise<{
  products: Product[];
  fromFirestore: boolean;
  isQuotaLimited: boolean;
  isOfflineFallback: boolean;
}> | null = null;

export interface FetchProductAutocompleteParams {
  query: string;
  filterMode?: SearchFilterMode;
  categorySlug?: string;
  categories?: Category[];
  brands?: Brand[];
  localProducts?: Product[];
  maxResults?: number;
  maxCategories?: number;
  maxBrands?: number;
  forceLive?: boolean;
  signal?: AbortSignal;
}

export function invalidateProductAutocompleteCache(): void {
  autocompleteQueryCache.clear();
  lastCloudCatalogFetchAt = 0;
  lastCloudCatalogProducts = [];
}

async function fetchLiveProductsPool(): Promise<{
  products: Product[];
  fromFirestore: boolean;
  isQuotaLimited: boolean;
  isOfflineFallback: boolean;
}> {
  const cachedEntry = storefrontCache.readEntry<Product[]>('products');
  const cachedOverlay = getCachedServerCatalogOverlay();
  const baseFallback =
    cachedEntry && Array.isArray(cachedEntry.data) && cachedEntry.data.length > 0
      ? cachedEntry.data
      : lastCloudCatalogProducts.length > 0
      ? lastCloudCatalogProducts
      : INITIAL_PRODUCTS;
  const fallbackPool = mergeCatalogProducts({
    cloudProducts: [],
    serverRecords: cachedOverlay.records,
    initialProducts: baseFallback,
    deletedIds: cachedOverlay.deletedIds,
  });

  if (isFirestoreInQuotaCooldown()) {
    const overlay = await fetchServerCatalogOverlay();
    const mergedOffline = mergeCatalogProducts({
      cloudProducts: [],
      serverRecords: overlay.records,
      initialProducts: baseFallback,
      deletedIds: overlay.deletedIds,
    });
    return {
      products: mergedOffline,
      fromFirestore: false,
      isQuotaLimited: true,
      isOfflineFallback: false,
    };
  }

  if (!getIsOnline()) {
    return {
      products: fallbackPool,
      fromFirestore: false,
      isQuotaLimited: false,
      isOfflineFallback: true,
    };
  }

  const now = Date.now();
  if (
    lastCloudCatalogProducts.length > 0 &&
    now - lastCloudCatalogFetchAt < LIVE_CLOUD_SYNC_WINDOW_MS
  ) {
    return {
      products: lastCloudCatalogProducts,
      fromFirestore: false,
      isQuotaLimited: false,
      isOfflineFallback: false,
    };
  }

  if (inFlightCloudCatalogFetch) {
    return inFlightCloudCatalogFetch;
  }

  inFlightCloudCatalogFetch = (async () => {
    const overlayPromise = fetchServerCatalogOverlay(lastCloudCatalogFetchAt === 0);
    try {
      const productsQuery = query(
        collection(db, PRODUCTS_COLLECTION),
        limit(FIRESTORE_AUTOCOMPLETE_DOC_LIMIT)
      );
      const [snapshot, overlay] = await Promise.all([
        getDocs(productsQuery),
        overlayPromise,
      ]);
      const cloudProducts: Product[] = [];

      snapshot.forEach((docSnap) => {
        cloudProducts.push(
          mapFirestoreDocToProduct(docSnap.id, docSnap.data() as Record<string, unknown>)
        );
      });

      const mergedCatalog = mergeCatalogProducts({
        cloudProducts,
        serverRecords: overlay.records,
        initialProducts: mergeProductPoolsForAutocomplete(cloudProducts, baseFallback),
        deletedIds: overlay.deletedIds,
      });

      lastCloudCatalogProducts = mergedCatalog;
      lastCloudCatalogFetchAt = Date.now();
      storefrontCache.setProducts(mergedCatalog, cloudProducts.length > 0 ? 'firestore' : 'local');

      return {
        products: mergedCatalog,
        fromFirestore: cloudProducts.length > 0 && !snapshot.metadata.fromCache,
        isQuotaLimited: false,
        isOfflineFallback: false,
      };
    } catch (error) {
      const category = classifyFirestoreError(error);

      if (category === 'quota') {
        markFirestoreQuotaExceeded();
        if (shouldLogFirestoreQuotaWarning('autocomplete_products')) {
          console.warn(
            'Firestore daily read quota reached; auto-complete using cached storefront products.'
          );
        }
        return {
          products: fallbackPool,
          fromFirestore: false,
          isQuotaLimited: true,
          isOfflineFallback: false,
        };
      }

      if (category === 'network') {
        return {
          products: fallbackPool,
          fromFirestore: false,
          isQuotaLimited: false,
          isOfflineFallback: true,
        };
      }

      if (category === 'permission') {
        handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
      }

      return {
        products: fallbackPool,
        fromFirestore: false,
        isQuotaLimited: false,
        isOfflineFallback: false,
      };
    } finally {
      inFlightCloudCatalogFetch = null;
    }
  })();

  return inFlightCloudCatalogFetch;
}

/**
 * Fetches real-time auto-complete product matches from Firestore as the user types,
 * seamlessly merging live cloud records with local storefront products and returning
 * a compact ranked list with resolved thumbnails.
 */
export async function fetchProductAutocompleteMatches({
  query: searchText,
  filterMode = 'all',
  categorySlug = 'all',
  categories = [],
  brands = [],
  localProducts = [],
  maxResults = DEFAULT_AUTOCOMPLETE_MAX_RESULTS,
  maxCategories = DEFAULT_AUTOCOMPLETE_MAX_CATEGORIES,
  maxBrands = DEFAULT_AUTOCOMPLETE_MAX_BRANDS,
  forceLive = false,
  signal,
}: FetchProductAutocompleteParams): Promise<AutocompleteSearchResult> {
  const normalizedQuery = normalizeSearchTerm(searchText);
  const now = Date.now();

  if (!normalizedQuery) {
    return {
      query: searchText,
      normalizedQuery: '',
      suggestions: [],
      totalMatchedCount: 0,
      categorySuggestions: [],
      totalCategoryMatchCount: 0,
      brandSuggestions: [],
      totalBrandMatchCount: 0,
      source: 'cache',
      fromCache: true,
      isQuotaLimited: isFirestoreInQuotaCooldown(),
      isOfflineFallback: false,
      fetchedAt: now,
    };
  }

  const cacheKey = buildAutocompleteCacheKey(searchText, filterMode, categorySlug);
  if (!forceLive) {
    const cachedHit = autocompleteQueryCache.get(cacheKey);
    if (cachedHit) {
      return {
        ...cachedHit,
        query: searchText,
        fromCache: true,
      };
    }
  }

  const cloudSync = await fetchLiveProductsPool();
  if (signal?.aborted) {
    throw new DOMException('Autocomplete search aborted', 'AbortError');
  }

  const ranked = mergeAndRankAutocompleteProducts({
    cloudProducts: cloudSync.products,
    localProducts,
    query: searchText,
    filterMode,
    categories,
    brands,
    categorySlug,
    maxResults,
    maxCategories,
    maxBrands,
  });

  const result: AutocompleteSearchResult = {
    query: searchText,
    normalizedQuery,
    suggestions: ranked.suggestions,
    totalMatchedCount: ranked.totalMatchedCount,
    categorySuggestions: ranked.categorySuggestions,
    totalCategoryMatchCount: ranked.totalCategoryMatchCount,
    brandSuggestions: ranked.brandSuggestions,
    totalBrandMatchCount: ranked.totalBrandMatchCount,
    source: cloudSync.fromFirestore ? 'firestore' : 'cache',
    fromCache: !cloudSync.fromFirestore,
    isQuotaLimited: cloudSync.isQuotaLimited,
    isOfflineFallback: cloudSync.isOfflineFallback,
    fetchedAt: Date.now(),
  };

  autocompleteQueryCache.set(cacheKey, result);
  return result;
}
