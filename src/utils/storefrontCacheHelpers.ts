import { Brand, Category, Product } from '../types';
import { compactProductsForStorage, safeStorageSetItem } from './storageQuotaHelpers';
import { isFirestoreInQuotaCooldown } from './firestoreQuotaHelpers';

export type StorefrontCollectionKey = 'products' | 'categories' | 'brands' | 'offers';

export type StorefrontCacheSource = 'firestore' | 'local' | 'mutation';

export const DEFAULT_STOREFRONT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes active browsing TTL

export const STOREFRONT_CACHE_STORAGE_KEYS: Record<StorefrontCollectionKey, string> = {
  products: 'arnaout_storefront_cache_v1_products',
  categories: 'arnaout_storefront_cache_v1_categories',
  brands: 'arnaout_storefront_cache_v1_brands',
  offers: 'arnaout_storefront_cache_v1_offers',
};

export interface StorefrontCacheEntry<T> {
  data: T;
  fetchedAt: number;
  source: StorefrontCacheSource;
}

export interface StorefrontCacheReadResult<T> extends StorefrontCacheEntry<T> {
  isFresh: boolean;
}

export interface FetchWithCacheResult<T> {
  data: T;
  fromCache: boolean;
  isStale: boolean;
  fetchedAt: number;
  deduplicated: boolean;
}

export interface StorefrontCacheManagerOptions {
  ttlMs?: number;
  storage?: Storage | null;
  now?: () => number;
  isQuotaLimited?: () => boolean;
}

export interface StorefrontCacheManager {
  getTtlMs: () => number;
  readEntry: <T>(key: StorefrontCollectionKey) => StorefrontCacheReadResult<T> | null;
  writeEntry: <T>(key: StorefrontCollectionKey, data: T, source?: StorefrontCacheSource) => StorefrontCacheEntry<T>;
  invalidate: (key?: StorefrontCollectionKey) => void;
  getInFlightCount: () => number;
  fetchWithCache: <T>(
    key: StorefrontCollectionKey,
    fetcher: () => Promise<T>,
    options?: {
      forceRefresh?: boolean;
      fallbackData?: T;
      fallbackSource?: StorefrontCacheSource;
    }
  ) => Promise<FetchWithCacheResult<T>>;
  findProduct: (identifier: string, candidateProducts?: Product[]) => Product | null;
  setProducts: (products: Product[], source?: StorefrontCacheSource) => Product[];
  upsertProduct: (product: Product, source?: StorefrontCacheSource) => Product[];
  removeProduct: (productId: string, source?: StorefrontCacheSource) => Product[];
  setCategories: (categories: Category[], source?: StorefrontCacheSource) => Category[];
  upsertCategory: (category: Category, source?: StorefrontCacheSource) => Category[];
  removeCategory: (categoryId: string, source?: StorefrontCacheSource) => Category[];
  setBrands: (brands: Brand[], source?: StorefrontCacheSource) => Brand[];
}

export function deriveSpecialOfferProducts(products: Product[]): Product[] {
  return products.filter((p) => Boolean(p && p.isSpecialOffer && p.isPublished !== false));
}

function resolveDefaultStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Restricted storage environment
  }
  return null;
}

function parseEnvelope<T>(raw: string | null): StorefrontCacheEntry<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StorefrontCacheEntry<T>>;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'data' in parsed &&
      typeof parsed.fetchedAt === 'number' &&
      Number.isFinite(parsed.fetchedAt)
    ) {
      return {
        data: parsed.data as T,
        fetchedAt: parsed.fetchedAt,
        source: parsed.source || 'local',
      };
    }
  } catch {
    // Ignore corrupted cache envelope
  }
  return null;
}

export function createStorefrontCacheManager(
  options?: StorefrontCacheManagerOptions
): StorefrontCacheManager {
  const ttlMs = Math.max(1000, options?.ttlMs ?? DEFAULT_STOREFRONT_CACHE_TTL_MS);
  const nowFn = options?.now ?? (() => Date.now());
  const isQuotaLimitedFn = options?.isQuotaLimited ?? (() => isFirestoreInQuotaCooldown());

  const getStorage = (): Storage | null => {
    if (options && 'storage' in options) {
      return options.storage ?? null;
    }
    return resolveDefaultStorage();
  };

  const memoryCache = new Map<StorefrontCollectionKey, StorefrontCacheEntry<unknown>>();
  const inFlightRequests = new Map<string, Promise<FetchWithCacheResult<unknown>>>();

  const isEntryFresh = (entry: StorefrontCacheEntry<unknown>, nowMs: number): boolean => {
    if (entry.fetchedAt <= 0) return false;
    return nowMs - entry.fetchedAt < ttlMs;
  };

  const readEntry = <T,>(key: StorefrontCollectionKey): StorefrontCacheReadResult<T> | null => {
    const nowMs = nowFn();
    const mem = memoryCache.get(key) as StorefrontCacheEntry<T> | undefined;
    if (mem) {
      return {
        ...mem,
        isFresh: isEntryFresh(mem, nowMs),
      };
    }

    const storage = getStorage();
    if (!storage) return null;

    try {
      const storageKey = STOREFRONT_CACHE_STORAGE_KEYS[key];
      const envelope = parseEnvelope<T>(storage.getItem(storageKey));
      if (!envelope) return null;

      // Hydrate memory cache cleanly for subsequent reads in the session
      memoryCache.set(key, envelope as StorefrontCacheEntry<unknown>);
      return {
        ...envelope,
        isFresh: isEntryFresh(envelope, nowMs),
      };
    } catch {
      return null;
    }
  };

  const writeEntry = <T,>(
    key: StorefrontCollectionKey,
    data: T,
    source: StorefrontCacheSource = 'firestore'
  ): StorefrontCacheEntry<T> => {
    const entry: StorefrontCacheEntry<T> = {
      data,
      fetchedAt: nowFn(),
      source,
    };
    memoryCache.set(key, entry as StorefrontCacheEntry<unknown>);

    const storage = getStorage();
    if (storage) {
      const storageKey = STOREFRONT_CACHE_STORAGE_KEYS[key];
      safeStorageSetItem(storage, storageKey, JSON.stringify(entry), {
        onQuotaRecovery: () => {
          if ((key === 'products' || key === 'offers') && Array.isArray(data)) {
            const list = data as unknown as Product[];
            return [120_000, 24_000, 0].map((maxChars) =>
              JSON.stringify({
                ...entry,
                data: compactProductsForStorage(list, maxChars),
              })
            );
          }
          return null;
        },
      });
    }

    return entry;
  };

  const invalidate = (key?: StorefrontCollectionKey): void => {
    const storage = getStorage();
    if (key) {
      memoryCache.delete(key);
      if (storage) {
        try {
          storage.removeItem(STOREFRONT_CACHE_STORAGE_KEYS[key]);
        } catch {
          // ignore
        }
      }
      return;
    }

    memoryCache.clear();
    if (storage) {
      (Object.values(STOREFRONT_CACHE_STORAGE_KEYS) as string[]).forEach((storageKey) => {
        try {
          storage.removeItem(storageKey);
        } catch {
          // ignore
        }
      });
    }
  };

  const fetchWithCache = async <T,>(
    key: StorefrontCollectionKey,
    fetcher: () => Promise<T>,
    fetchOptions?: {
      forceRefresh?: boolean;
      fallbackData?: T;
      fallbackSource?: StorefrontCacheSource;
    }
  ): Promise<FetchWithCacheResult<T>> => {
    const forceRefresh = Boolean(fetchOptions?.forceRefresh);
    const existingEntry = readEntry<T>(key);

    // 1. Fresh cache hit (no network read needed)
    if (!forceRefresh && existingEntry && existingEntry.isFresh) {
      return {
        data: existingEntry.data,
        fromCache: true,
        isStale: false,
        fetchedAt: existingEntry.fetchedAt,
        deduplicated: false,
      };
    }

    // 2. Quota cooldown short-circuit: serve persistent stale cache or fallback cleanly
    if (!forceRefresh && isQuotaLimitedFn()) {
      if (existingEntry) {
        return {
          data: existingEntry.data,
          fromCache: true,
          isStale: true,
          fetchedAt: existingEntry.fetchedAt,
          deduplicated: false,
        };
      }
      if (fetchOptions && 'fallbackData' in fetchOptions && fetchOptions.fallbackData !== undefined) {
        const stored = writeEntry(
          key,
          fetchOptions.fallbackData,
          fetchOptions.fallbackSource ?? 'local'
        );
        return {
          data: stored.data,
          fromCache: true,
          isStale: true,
          fetchedAt: stored.fetchedAt,
          deduplicated: false,
        };
      }
    }

    // 3. In-flight request deduplication (concurrent callers await same promise)
    const inflightKey = forceRefresh ? `${key}:force` : key;
    const existingInFlight =
      inFlightRequests.get(inflightKey) ||
      (!forceRefresh ? inFlightRequests.get(`${key}:force`) : undefined);

    if (existingInFlight) {
      const result = (await existingInFlight) as FetchWithCacheResult<T>;
      return {
        ...result,
        deduplicated: true,
      };
    }

    const requestPromise = (async (): Promise<FetchWithCacheResult<T>> => {
      try {
        const freshData = await fetcher();
        const saved = writeEntry(key, freshData, 'firestore');
        if (key === 'products' && Array.isArray(freshData)) {
          writeEntry('offers', deriveSpecialOfferProducts(freshData as unknown as Product[]), 'firestore');
        }
        return {
          data: saved.data,
          fromCache: false,
          isStale: false,
          fetchedAt: saved.fetchedAt,
          deduplicated: false,
        };
      } catch (err) {
        if (existingEntry) {
          return {
            data: existingEntry.data,
            fromCache: true,
            isStale: true,
            fetchedAt: existingEntry.fetchedAt,
            deduplicated: false,
          };
        }
        if (fetchOptions && 'fallbackData' in fetchOptions && fetchOptions.fallbackData !== undefined) {
          const storedFallback = writeEntry(
            key,
            fetchOptions.fallbackData,
            fetchOptions.fallbackSource ?? 'local'
          );
          if (key === 'products' && Array.isArray(storedFallback.data)) {
            writeEntry(
              'offers',
              deriveSpecialOfferProducts(storedFallback.data as unknown as Product[]),
              fetchOptions.fallbackSource ?? 'local'
            );
          }
          return {
            data: storedFallback.data,
            fromCache: true,
            isStale: true,
            fetchedAt: storedFallback.fetchedAt,
            deduplicated: false,
          };
        }
        throw err;
      } finally {
        inFlightRequests.delete(inflightKey);
      }
    })();

    inFlightRequests.set(inflightKey, requestPromise as Promise<FetchWithCacheResult<unknown>>);
    return requestPromise;
  };

  const findProduct = (identifier: string, candidateProducts?: Product[]): Product | null => {
    const trimmed = typeof identifier === 'string' ? identifier.trim() : '';
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    const upper = trimmed.toUpperCase();

    const searchPool = (list: Product[] | undefined): Product | null => {
      if (!Array.isArray(list) || list.length === 0) return null;
      return (
        list.find(
          (p) =>
            p.id.trim().toLowerCase() === lower ||
            (p.sku && p.sku.trim().toUpperCase() === upper) ||
            (p.barcode && p.barcode.trim().toLowerCase() === lower)
        ) ?? null
      );
    };

    const directMatch = searchPool(candidateProducts);
    if (directMatch) return directMatch;

    const cached = readEntry<Product[]>('products');
    if (cached && Array.isArray(cached.data)) {
      return searchPool(cached.data);
    }
    return null;
  };

  const setProducts = (
    products: Product[],
    source: StorefrontCacheSource = 'mutation'
  ): Product[] => {
    writeEntry('products', products, source);
    writeEntry('offers', deriveSpecialOfferProducts(products), source);
    return products;
  };

  const upsertProduct = (
    product: Product,
    source: StorefrontCacheSource = 'mutation'
  ): Product[] => {
    const cached = readEntry<Product[]>('products');
    const current = Array.isArray(cached?.data) ? [...cached.data] : [];
    const idx = current.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      current[idx] = product;
    } else {
      current.unshift(product);
    }
    return setProducts(current, source);
  };

  const removeProduct = (
    productId: string,
    source: StorefrontCacheSource = 'mutation'
  ): Product[] => {
    const cached = readEntry<Product[]>('products');
    const current = Array.isArray(cached?.data) ? cached.data : [];
    const next = current.filter((p) => p.id !== productId);
    return setProducts(next, source);
  };

  const setCategories = (
    categories: Category[],
    source: StorefrontCacheSource = 'mutation'
  ): Category[] => {
    writeEntry('categories', categories, source);
    return categories;
  };

  const upsertCategory = (
    category: Category,
    source: StorefrontCacheSource = 'mutation'
  ): Category[] => {
    const cached = readEntry<Category[]>('categories');
    const current = Array.isArray(cached?.data) ? [...cached.data] : [];
    const idx = current.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      current[idx] = category;
    } else {
      current.push(category);
    }
    return setCategories(current, source);
  };

  const removeCategory = (
    categoryId: string,
    source: StorefrontCacheSource = 'mutation'
  ): Category[] => {
    const cached = readEntry<Category[]>('categories');
    const current = Array.isArray(cached?.data) ? cached.data : [];
    const next = current.filter((c) => c.id !== categoryId);
    return setCategories(next, source);
  };

  const setBrands = (
    brands: Brand[],
    source: StorefrontCacheSource = 'mutation'
  ): Brand[] => {
    writeEntry('brands', brands, source);
    return brands;
  };

  return {
    getTtlMs: () => ttlMs,
    readEntry,
    writeEntry,
    invalidate,
    getInFlightCount: () => inFlightRequests.size,
    fetchWithCache,
    findProduct,
    setProducts,
    upsertProduct,
    removeProduct,
    setCategories,
    upsertCategory,
    removeCategory,
    setBrands,
  };
}

export const storefrontCache = createStorefrontCacheManager();
