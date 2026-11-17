import { Product } from '../types';
import {
  computeSearchAnalyticsSummary,
  getStoredSearchEvents,
  SearchAnalyticsEvent,
} from '../services/searchAnalyticsService';
import { normalizeSearchTerm } from './searchSuggestions';

export const QUICK_SEARCH_HISTORY_STORAGE_KEY = 'arnaout_quick_search_history_v1';
export const DEFAULT_MAX_SEARCH_HISTORY = 8;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PopularKeywordItem {
  term: string;
  isTrending: boolean;
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

function sanitizeHistoryList(rawList: unknown, maxItems: number): string[] {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().replace(/\s+/g, ' ');
    if (!trimmed) continue;
    const norm = normalizeSearchTerm(trimmed);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    cleaned.push(trimmed);
    if (cleaned.length >= maxItems) break;
  }

  return cleaned;
}

/**
 * Reads persisted search history terms, deduplicated and bounded.
 */
export function getSearchHistory(
  storage?: StorageLike,
  maxItems: number = DEFAULT_MAX_SEARCH_HISTORY
): string[] {
  const store = resolveStorage(storage);
  if (!store) return [];

  try {
    const raw = store.getItem(QUICK_SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeHistoryList(parsed, maxItems);
  } catch {
    return [];
  }
}

/**
 * Adds or promotes a search term to the top of persisted search history.
 */
export function addSearchHistoryTerm(
  term: string,
  storage?: StorageLike,
  maxItems: number = DEFAULT_MAX_SEARCH_HISTORY
): string[] {
  const trimmed = term.trim().replace(/\s+/g, ' ');
  const existing = getSearchHistory(storage, maxItems);
  if (!trimmed) return existing;

  const targetNorm = normalizeSearchTerm(trimmed);
  const filtered = existing.filter((entry) => normalizeSearchTerm(entry) !== targetNorm);
  const next = [trimmed, ...filtered].slice(0, maxItems);

  const store = resolveStorage(storage);
  if (store) {
    try {
      store.setItem(QUICK_SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }

  return next;
}

/**
 * Removes a single term from persisted search history.
 */
export function removeSearchHistoryTerm(
  term: string,
  storage?: StorageLike,
  maxItems: number = DEFAULT_MAX_SEARCH_HISTORY
): string[] {
  const targetNorm = normalizeSearchTerm(term);
  const existing = getSearchHistory(storage, maxItems);
  const next = existing.filter((entry) => normalizeSearchTerm(entry) !== targetNorm);

  const store = resolveStorage(storage);
  if (store) {
    try {
      if (next.length === 0) {
        store.removeItem(QUICK_SEARCH_HISTORY_STORAGE_KEY);
      } else {
        store.setItem(QUICK_SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // Ignore storage quota errors cleanly
    }
  }

  return next;
}

/**
 * Clears all persisted search history.
 */
export function clearSearchHistory(storage?: StorageLike): string[] {
  const store = resolveStorage(storage);
  if (store) {
    try {
      store.removeItem(QUICK_SEARCH_HISTORY_STORAGE_KEY);
    } catch {
      // Ignore storage errors cleanly
    }
  }
  return [];
}

const CURATED_POPULAR_KEYWORDS_EN = [
  'iPhone 16 Pro Max',
  'Samsung Galaxy S25 Ultra',
  'Anker Power Bank',
  'AirPods Pro',
  'Fast GaN Charger',
  'Green Lion Massage Gun',
  'Smart Watch',
  'MacBook Pro',
];

const CURATED_POPULAR_KEYWORDS_AR = [
  'iPhone 16 Pro Max',
  'سامسونج S25 Ultra',
  'شاحن سريع GaN',
  'Anker Power Bank',
  'سماعات AirPods',
  'ساعات ذكية',
  'مسدس مساج',
  'MacBook Pro',
];

/**
 * Combines live search analytics top terms with curated storefront keywords
 * matched to the active language and catalog.
 */
export function getPopularSearchKeywords(
  lang: 'en' | 'ar',
  products: Product[] = [],
  events?: SearchAnalyticsEvent[],
  limit: number = 8
): PopularKeywordItem[] {
  const analyticsEvents = events ?? getStoredSearchEvents();
  const summary = computeSearchAnalyticsSummary(analyticsEvents, limit * 2);

  const seen = new Set<string>();
  const keywords: PopularKeywordItem[] = [];

  const pushKeyword = (raw: string, isTrending: boolean) => {
    const clean = raw.trim().replace(/\s+/g, ' ');
    if (!clean || clean.length < 2) return;
    const norm = normalizeSearchTerm(clean);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    keywords.push({ term: clean, isTrending });
  };

  // 1. Live analytics trending terms that returned results
  for (const stat of summary.topTerms) {
    if (!stat.hasResults) continue;
    if (lang === 'en' && /[\u0600-\u06FF]/.test(stat.term)) continue;
    pushKeyword(stat.term, true);
    if (keywords.length >= Math.min(4, limit)) break;
  }

  // 2. Language-appropriate curated keywords
  const curated =
    lang === 'ar' ? CURATED_POPULAR_KEYWORDS_AR : CURATED_POPULAR_KEYWORDS_EN;
  for (const term of curated) {
    if (keywords.length >= limit) break;
    pushKeyword(term, keywords.length < 3);
  }

  // 3. Fallback from featured in-stock products if still under limit
  if (keywords.length < limit && products.length > 0) {
    const featured = products.filter((p) => p.isPublished !== false && p.stock > 0);
    for (const prod of featured) {
      if (keywords.length >= limit) break;
      const label = lang === 'ar' ? prod.nameAr || prod.name : prod.name;
      pushKeyword(label, false);
    }
  }

  return keywords.slice(0, limit);
}
