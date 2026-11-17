import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUICK_SEARCH_HISTORY_STORAGE_KEY,
  StorageLike,
  getSearchHistory,
  addSearchHistoryTerm,
  removeSearchHistoryTerm,
  clearSearchHistory,
  getPopularSearchKeywords,
} from './quickSearchOverlayHelpers';
import type { SearchAnalyticsEvent } from '../services/searchAnalyticsService';
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

describe('quickSearchOverlayHelpers', () => {
  it('adds, deduplicates case-insensitively, and promotes recent search terms', () => {
    const storage = createMemoryStorage();

    assert.deepEqual(getSearchHistory(storage), []);

    addSearchHistoryTerm('iPhone 16 Pro Max', storage);
    addSearchHistoryTerm('Anker 737', storage);
    const updated = addSearchHistoryTerm('  iphone 16 pro max ', storage);

    assert.deepEqual(updated, ['iphone 16 pro max', 'Anker 737']);
    assert.deepEqual(getSearchHistory(storage), ['iphone 16 pro max', 'Anker 737']);
  });

  it('caps history at maxItems and ignores blank inputs', () => {
    const storage = createMemoryStorage();

    addSearchHistoryTerm('One', storage, 3);
    addSearchHistoryTerm('Two', storage, 3);
    addSearchHistoryTerm('Three', storage, 3);
    const capped = addSearchHistoryTerm('Four', storage, 3);

    assert.deepEqual(capped, ['Four', 'Three', 'Two']);

    const unchanged = addSearchHistoryTerm('   ', storage, 3);
    assert.deepEqual(unchanged, ['Four', 'Three', 'Two']);
  });

  it('removes individual history terms and clears all cleanly', () => {
    const storage = createMemoryStorage();

    addSearchHistoryTerm('AirPods Pro', storage);
    addSearchHistoryTerm('Galaxy S25', storage);
    addSearchHistoryTerm('MacBook M4', storage);

    const afterRemove = removeSearchHistoryTerm('galaxy s25', storage);
    assert.deepEqual(afterRemove, ['MacBook M4', 'AirPods Pro']);

    const afterClear = clearSearchHistory(storage);
    assert.deepEqual(afterClear, []);
    assert.equal(storage.getItem(QUICK_SEARCH_HISTORY_STORAGE_KEY), null);
  });

  it('handles corrupted storage JSON gracefully', () => {
    const storage = createMemoryStorage();
    storage.setItem(QUICK_SEARCH_HISTORY_STORAGE_KEY, '{invalid-json');
    assert.deepEqual(getSearchHistory(storage), []);
  });

  it('aggregates trending analytics keywords with localized fallbacks without duplicates', () => {
    const events: SearchAnalyticsEvent[] = [
      {
        id: '1',
        term: 'Anker Power Bank',
        normalizedTerm: 'anker power bank',
        timestamp: new Date().toISOString(),
        source: 'desktop_input_submit',
        intentPattern: 'charging_and_power',
        categoryMatchesCount: 1,
        productMatchesCount: 4,
        hasResults: true,
      },
      {
        id: '2',
        term: 'NoMatchQuery',
        normalizedTerm: 'nomatchquery',
        timestamp: new Date().toISOString(),
        source: 'desktop_input_submit',
        intentPattern: 'general_discovery',
        categoryMatchesCount: 0,
        productMatchesCount: 0,
        hasResults: false,
      },
      {
        id: '3',
        term: 'شاحن سريع GaN',
        normalizedTerm: 'شاحن سريع gan',
        timestamp: new Date().toISOString(),
        source: 'mobile_input_submit',
        intentPattern: 'charging_and_power',
        categoryMatchesCount: 1,
        productMatchesCount: 3,
        hasResults: true,
      },
    ];

    const products = [
      {
        id: 'p1',
        name: 'Green Lion Massage Gun',
        nameAr: 'مسدس مساج',
        brand: 'Green Lion',
        category: 'Self Care',
        price: 25,
        originalPrice: 40,
        stock: 5,
        images: [],
      } as unknown as Product,
    ];

    const enKeywords = getPopularSearchKeywords('en', products, events, 6);
    assert.equal(enKeywords.length, 6);
    assert.equal(enKeywords[0].term, 'Anker Power Bank');
    assert.equal(enKeywords[0].isTrending, true);
    assert.equal(
      enKeywords.some((k) => k.term === 'NoMatchQuery'),
      false
    );
    assert.equal(
      enKeywords.some((k) => /[\u0600-\u06FF]/.test(k.term)),
      false
    );

    const norms = enKeywords.map((k) => k.term.toLowerCase());
    assert.equal(new Set(norms).size, norms.length);

    const arKeywords = getPopularSearchKeywords('ar', products, events, 6);
    assert.equal(arKeywords.length, 6);
    assert.equal(
      arKeywords.some((k) => /[\u0600-\u06FF]/.test(k.term)),
      true
    );
  });
});
