import { Product, ProductVariant } from '../types';
import {
  findProductSkuMatch,
  normalizeSkuCompact,
  normalizeSkuToken,
} from './globalSearchHelpers';

export const RECENT_SKU_SEARCHES_STORAGE_KEY = 'arnaout_recent_sku_searches_v1';
export const MAX_RECENT_SKU_SEARCHES = 5;
export const RECENT_SKU_UPDATED_EVENT = 'arnaout-recent-sku-searches-updated';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RecentSkuSearchEntry {
  sku: string;
  productId?: string;
  productName?: string;
  productNameAr?: string;
  variantId?: string;
  variantName?: string;
  price?: number;
  searchedAt: string;
}

export interface RecordRecentSkuInput {
  sku: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface ResolvedRecentSkuLookup {
  entry: RecentSkuSearchEntry;
  product?: Product;
  variant?: ProductVariant;
  displaySku: string;
  displayTitle: string;
  displayTitleAr: string;
  displayPrice?: number;
  displayImage?: string;
  inStock: boolean;
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

function notifyRecentSkuListeners(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(RECENT_SKU_UPDATED_EVENT));
  }
}

function getSkuDedupKey(sku: string): string {
  const compact = normalizeSkuCompact(sku);
  if (compact) return compact;
  return normalizeSkuToken(sku);
}

function sanitizeSkuEntries(
  rawList: unknown,
  maxItems: number
): RecentSkuSearchEntry[] {
  if (!Array.isArray(rawList)) return [];

  const seen = new Set<string>();
  const cleaned: RecentSkuSearchEntry[] = [];

  for (const item of rawList) {
    let candidate: Partial<RecentSkuSearchEntry> | null = null;
    if (typeof item === 'string') {
      candidate = { sku: item };
    } else if (item && typeof item === 'object') {
      candidate = item as Partial<RecentSkuSearchEntry>;
    }

    if (!candidate || typeof candidate.sku !== 'string') continue;

    const cleanSku = candidate.sku.trim().replace(/\s+/g, ' ');
    if (!cleanSku) continue;

    const dedupKey = getSkuDedupKey(cleanSku);
    if (!dedupKey || seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const trimmedName =
      typeof candidate.productName === 'string' ? candidate.productName.trim() : '';
    const trimmedNameAr =
      typeof candidate.productNameAr === 'string' ? candidate.productNameAr.trim() : '';

    cleaned.push({
      sku: cleanSku,
      productId: typeof candidate.productId === 'string' ? candidate.productId : undefined,
      productName: trimmedName || undefined,
      productNameAr: trimmedNameAr || undefined,
      variantId: typeof candidate.variantId === 'string' ? candidate.variantId : undefined,
      variantName:
        typeof candidate.variantName === 'string' && candidate.variantName.trim()
          ? candidate.variantName.trim()
          : undefined,
      price:
        typeof candidate.price === 'number' && Number.isFinite(candidate.price)
          ? candidate.price
          : undefined,
      searchedAt:
        typeof candidate.searchedAt === 'string' && candidate.searchedAt
          ? candidate.searchedAt
          : new Date().toISOString(),
    });

    if (cleaned.length >= maxItems) break;
  }

  return cleaned;
}

/**
 * Reads up to `maxItems` (default 5) recently searched SKU entries from local storage.
 */
export function getRecentSkuSearches(
  storage?: StorageLike,
  maxItems: number = MAX_RECENT_SKU_SEARCHES
): RecentSkuSearchEntry[] {
  const store = resolveStorage(storage);
  if (!store) return [];

  try {
    const raw = store.getItem(RECENT_SKU_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeSkuEntries(parsed, maxItems);
  } catch {
    return [];
  }
}

/**
 * Saves or promotes a SKU code (capped at the last 5 distinct SKUs) in local storage.
 */
export function recordRecentSkuSearch(
  input: RecordRecentSkuInput,
  storage?: StorageLike,
  maxItems: number = MAX_RECENT_SKU_SEARCHES
): RecentSkuSearchEntry[] {
  const cleanSku = (input.sku || '').trim().replace(/^#+/, '').replace(/\s+/g, ' ');
  const existing = getRecentSkuSearches(storage, maxItems);
  if (!cleanSku) return existing;

  const dedupKey = getSkuDedupKey(cleanSku);
  if (!dedupKey) return existing;

  const previous = existing.find((entry) => getSkuDedupKey(entry.sku) === dedupKey);
  const filtered = existing.filter((entry) => getSkuDedupKey(entry.sku) !== dedupKey);

  const product = input.product;
  const variant = input.variant;

  const nextEntry: RecentSkuSearchEntry = {
    sku: cleanSku,
    productId: product?.id ?? previous?.productId,
    productName: (product?.name || '').trim() || previous?.productName,
    productNameAr: (product?.nameAr || '').trim() || previous?.productNameAr,
    variantId: variant?.id ?? previous?.variantId,
    variantName: (variant?.name || '').trim() || previous?.variantName,
    price:
      variant && Number.isFinite(variant.price)
        ? variant.price
        : product && Number.isFinite(product.price)
        ? product.price
        : previous?.price,
    searchedAt: new Date().toISOString(),
  };

  const next = [nextEntry, ...filtered].slice(0, maxItems);

  const store = resolveStorage(storage);
  if (store) {
    try {
      store.setItem(RECENT_SKU_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      if (!storage) notifyRecentSkuListeners();
    } catch {
      // Ignore storage quota errors gracefully
    }
  }

  return next;
}

/**
 * Removes a single SKU code from the recent SKU searches list.
 */
export function removeRecentSkuSearch(
  sku: string,
  storage?: StorageLike,
  maxItems: number = MAX_RECENT_SKU_SEARCHES
): RecentSkuSearchEntry[] {
  const targetKey = getSkuDedupKey(sku);
  const existing = getRecentSkuSearches(storage, maxItems);
  if (!targetKey) return existing;

  const next = existing.filter((entry) => getSkuDedupKey(entry.sku) !== targetKey);

  const store = resolveStorage(storage);
  if (store) {
    try {
      if (next.length === 0) {
        store.removeItem(RECENT_SKU_SEARCHES_STORAGE_KEY);
      } else {
        store.setItem(RECENT_SKU_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      }
      if (!storage) notifyRecentSkuListeners();
    } catch {
      // Ignore storage errors gracefully
    }
  }

  return next;
}

/**
 * Clears all stored recent SKU searches.
 */
export function clearRecentSkuSearches(storage?: StorageLike): RecentSkuSearchEntry[] {
  const store = resolveStorage(storage);
  if (store) {
    try {
      store.removeItem(RECENT_SKU_SEARCHES_STORAGE_KEY);
      if (!storage) notifyRecentSkuListeners();
    } catch {
      // Ignore storage errors gracefully
    }
  }
  return [];
}

/**
 * Resolves a stored recent SKU entry against the live storefront catalog so labels,
 * prices, variants, and stock status reflect current data.
 */
export function resolveRecentSkuLookup(
  entry: RecentSkuSearchEntry,
  products: Product[] = []
): ResolvedRecentSkuLookup {
  let matchedProduct: Product | undefined;
  let matchedVariant: ProductVariant | undefined;

  for (const product of products) {
    if (product.isPublished === false) continue;
    const hit = findProductSkuMatch(product, entry.sku);
    if (hit && hit.matchKind === 'exact') {
      matchedProduct = hit.product;
      matchedVariant = hit.matchedVariant;
      break;
    }
  }

  if (!matchedProduct && entry.productId) {
    const byId = products.find(
      (p) => p.id === entry.productId && p.isPublished !== false
    );
    if (byId) {
      matchedProduct = byId;
      if (entry.variantId && Array.isArray(byId.variants)) {
        matchedVariant = byId.variants.find((v) => v.id === entry.variantId);
      }
    }
  }

  const displaySku =
    matchedVariant?.sku?.trim() || matchedProduct?.sku?.trim() || entry.sku;

  const fallbackMetaLabel = [
    matchedProduct?.brand?.trim(),
    matchedProduct?.category?.trim(),
  ]
    .filter(Boolean)
    .join(' · ');

  const trimmedEn =
    matchedProduct?.name?.trim() || entry.productName?.trim() || '';
  const trimmedAr =
    matchedProduct?.nameAr?.trim() || entry.productNameAr?.trim() || '';

  const baseTitleEn =
    trimmedEn || trimmedAr || fallbackMetaLabel || displaySku;
  const baseTitleAr =
    trimmedAr || trimmedEn || fallbackMetaLabel || displaySku;
  const variantSuffix =
    matchedVariant?.name?.trim() || entry.variantName?.trim() || '';

  const displayTitle =
    variantSuffix && baseTitleEn !== displaySku
      ? `${baseTitleEn} · ${variantSuffix}`
      : baseTitleEn;
  const displayTitleAr =
    variantSuffix && baseTitleAr !== displaySku
      ? `${baseTitleAr} · ${variantSuffix}`
      : baseTitleAr;

  const displayPrice =
    matchedVariant && Number.isFinite(matchedVariant.price)
      ? matchedVariant.price
      : matchedProduct && Number.isFinite(matchedProduct.price)
      ? matchedProduct.price
      : entry.price;

  const displayImage =
    matchedVariant?.image || matchedProduct?.images?.[0];

  const stockCount =
    matchedVariant && typeof matchedVariant.stock === 'number'
      ? matchedVariant.stock
      : matchedProduct?.stock;

  return {
    entry,
    product: matchedProduct,
    variant: matchedVariant,
    displaySku,
    displayTitle,
    displayTitleAr,
    displayPrice,
    displayImage,
    inStock: stockCount === undefined ? true : stockCount > 0,
  };
}
