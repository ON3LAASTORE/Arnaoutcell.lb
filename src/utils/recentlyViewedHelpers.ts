import { Product } from '../types';

export const RECENTLY_VIEWED_STORAGE_KEY = 'arnaout_recently_viewed_v1';
export const MAX_RECENTLY_VIEWED = 5;

/**
 * Adds a clicked/viewed product ID to the front of the list, deduplicating
 * previous occurrences and capping the list at `limit` (default 5).
 */
export function recordRecentlyViewedId(
  currentIds: readonly string[],
  productId: string,
  limit = MAX_RECENTLY_VIEWED
): string[] {
  const normalizedId = typeof productId === 'string' ? productId.trim() : '';
  if (!normalizedId || limit <= 0) {
    return currentIds.slice(0, Math.max(0, limit));
  }

  const deduped = currentIds.filter((id) => typeof id === 'string' && id.trim() !== '' && id !== normalizedId);
  return [normalizedId, ...deduped].slice(0, limit);
}

/**
 * Safely parses a JSON-serialized string array of product IDs from localStorage.
 */
export function parseStoredRecentlyViewedIds(
  raw: string | null | undefined,
  limit = MAX_RECENTLY_VIEWED
): string[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== 'string') continue;
      const trimmed = entry.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      result.push(trimmed);
      if (result.length >= limit) break;
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * Resolves stored IDs against the live catalog in most-recently-viewed order,
 * dropping unknown or unpublished items and clamping to `limit` (default 5).
 */
export function resolveRecentlyViewedProducts(
  recentIds: readonly string[],
  catalog: readonly Product[],
  limit = MAX_RECENTLY_VIEWED
): Product[] {
  if (!recentIds.length || !catalog.length || limit <= 0) return [];
  const byId = new Map<string, Product>();
  for (const product of catalog) {
    if (product && product.id && product.isPublished !== false) {
      byId.set(product.id, product);
    }
  }

  const resolved: Product[] = [];
  const seen = new Set<string>();
  for (const id of recentIds) {
    if (seen.has(id)) continue;
    const match = byId.get(id);
    if (match) {
      seen.add(id);
      resolved.push(match);
      if (resolved.length >= limit) break;
    }
  }
  return resolved;
}
