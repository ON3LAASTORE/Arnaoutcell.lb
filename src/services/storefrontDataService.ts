import { Brand, Category, Product } from '../types';
import { getBrands, getCategories, getProducts } from './storageService';
import { fetchStorefrontProducts } from './productFirestoreService';
import { fetchDynamicCategoriesWithMeta } from './categoryFirestoreService';
import { deriveSpecialOfferProducts, storefrontCache } from '../utils/storefrontCacheHelpers';

export interface StorefrontInitSnapshot {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  offers: Product[];
  isLoading: boolean;
  isStale: boolean;
  fromCache: boolean;
  error: string | null;
  lastInitializedAt: number | null;
}

let inFlightStorefrontInit: Map<string, Promise<StorefrontInitSnapshot>> = new Map();

/**
 * Fetches storefront brands through the shared TTL cache + deduplication layer.
 */
export async function fetchStorefrontBrands(options?: {
  forceRefresh?: boolean;
}): Promise<{ brands: Brand[]; fromCache: boolean; isStale: boolean }> {
  const localBrands = getBrands();
  const result = await storefrontCache.fetchWithCache<Brand[]>(
    'brands',
    async () => getBrands(),
    {
      forceRefresh: options?.forceRefresh,
      fallbackData: localBrands,
      fallbackSource: 'local',
    }
  );

  return {
    brands: result.data,
    fromCache: result.fromCache,
    isStale: result.isStale,
  };
}

/**
 * Coordinates initialization of all core storefront collections (`products`, `categories`,
 * `brands`, and `offers`) in a single deduplicated batched pass so components share
 * fetched data without issuing independent cold Firestore reads.
 */
export async function initializeStorefrontData(options?: {
  forceRefresh?: boolean;
}): Promise<StorefrontInitSnapshot> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const initKey = forceRefresh ? 'force' : 'default';

  const existing = inFlightStorefrontInit.get(initKey) || (!forceRefresh ? inFlightStorefrontInit.get('force') : undefined);
  if (existing) {
    return existing;
  }

  const runPromise = (async (): Promise<StorefrontInitSnapshot> => {
    const localProducts = getProducts();
    const localCategories = getCategories();

    try {
      const [productsResult, categoriesResult, brandsResult] = await Promise.all([
        fetchStorefrontProducts({
          forceRefresh,
          fallbackProducts: localProducts,
        }),
        fetchDynamicCategoriesWithMeta({
          forceRefresh,
        }),
        fetchStorefrontBrands({
          forceRefresh,
        }),
      ]);

      const offers = deriveSpecialOfferProducts(productsResult.products);
      storefrontCache.writeEntry(
        'offers',
        offers,
        productsResult.fromCache ? 'local' : 'firestore'
      );

      return {
        products: productsResult.products,
        categories:
          categoriesResult.categories.length > 0
            ? categoriesResult.categories
            : localCategories,
        brands: brandsResult.brands,
        offers,
        isLoading: false,
        isStale: productsResult.isStale || categoriesResult.isStale,
        fromCache: productsResult.fromCache && categoriesResult.fromCache,
        error: null,
        lastInitializedAt: Date.now(),
      };
    } catch (err) {
      const fallbackOffers = deriveSpecialOfferProducts(localProducts);
      return {
        products: localProducts,
        categories: localCategories,
        brands: getBrands(),
        offers: fallbackOffers,
        isLoading: false,
        isStale: true,
        fromCache: true,
        error: err instanceof Error ? err.message : 'Unable to initialize storefront catalog.',
        lastInitializedAt: Date.now(),
      };
    } finally {
      inFlightStorefrontInit.delete(initKey);
    }
  })();

  inFlightStorefrontInit.set(initKey, runPromise);
  return runPromise;
}
