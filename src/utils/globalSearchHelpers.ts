import { Product, Brand } from '../types';
import { normalizeSearchTerm, matchesSearch } from './searchSuggestions';

export type SearchFilterMode = 'all' | 'name' | 'brand';

export interface ScoredProductMatch {
  product: Product;
  score: number;
  matchedBy: 'name' | 'brand' | 'both';
}

export interface MatchedBrandInfo {
  name: string;
  count: number;
  logo?: string;
  isExact: boolean;
}

/**
 * Filters and ranks products strictly by name or brand based on query and filter mode.
 */
export function filterProductsByNameOrBrand(
  products: Product[],
  query: string,
  mode: SearchFilterMode = 'all'
): Product[] {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return [];

  const searchWords = normalizedQuery.split(/\s+/).filter(Boolean);

  const scoredMatches: ScoredProductMatch[] = [];

  for (const product of products) {
    if (product.isPublished === false) continue;

    const nameEn = normalizeSearchTerm(product.name);
    const nameAr = normalizeSearchTerm(product.nameAr || '');
    const brand = normalizeSearchTerm(product.brand);

    const nameMatches =
      nameEn.includes(normalizedQuery) ||
      nameAr.includes(normalizedQuery) ||
      matchesSearch(product.name, searchWords) ||
      (product.nameAr ? matchesSearch(product.nameAr, searchWords) : false);

    const brandMatches =
      brand.includes(normalizedQuery) ||
      matchesSearch(product.brand, searchWords);

    let matchType: 'name' | 'brand' | 'both' | null = null;

    if (mode === 'name' && nameMatches) {
      matchType = 'name';
    } else if (mode === 'brand' && brandMatches) {
      matchType = 'brand';
    } else if (mode === 'all') {
      if (nameMatches && brandMatches) matchType = 'both';
      else if (nameMatches) matchType = 'name';
      else if (brandMatches) matchType = 'brand';
    }

    if (!matchType) continue;

    let score = 0;

    // High relevance scoring
    if (nameEn === normalizedQuery || nameAr === normalizedQuery || brand === normalizedQuery) {
      score += 100;
    } else if (nameEn.startsWith(normalizedQuery) || nameAr.startsWith(normalizedQuery)) {
      score += 80;
    } else if (brand.startsWith(normalizedQuery)) {
      score += 75;
    } else if (nameMatches) {
      score += 60;
    } else if (brandMatches) {
      score += 55;
    }

    // Boost in-stock products so customers find available devices first
    if (product.stock > 0) {
      score += 15;
    }

    // Rating boost
    if (product.rating) {
      score += Math.min(product.rating, 5);
    }

    scoredMatches.push({
      product,
      score,
      matchedBy: matchType,
    });
  }

  return scoredMatches
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}

/**
 * Extracts and aggregates unique brands matching query or brand filter.
 */
export function getUniqueMatchingBrands(
  products: Product[],
  brands: Brand[],
  query: string
): MatchedBrandInfo[] {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return [];

  const searchWords = normalizedQuery.split(/\s+/).filter(Boolean);

  // Compute product counts for each brand from published products
  const countMap = new Map<string, number>();
  for (const p of products) {
    if (p.isPublished === false) continue;
    const bName = p.brand?.trim();
    if (!bName) continue;
    const key = bName.toLowerCase();
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  // Create brand metadata lookup
  const brandMetaMap = new Map<string, Brand>();
  for (const b of brands) {
    brandMetaMap.set(b.name.toLowerCase(), b);
  }

  const seenBrands = new Set<string>();
  const results: MatchedBrandInfo[] = [];

  // 1. Check configured brands list
  for (const b of brands) {
    const normBrandName = normalizeSearchTerm(b.name);
    const matches =
      normBrandName.includes(normalizedQuery) ||
      matchesSearch(b.name, searchWords) ||
      (b.description && matchesSearch(b.description, searchWords));

    if (matches && !seenBrands.has(normBrandName)) {
      seenBrands.add(normBrandName);
      results.push({
        name: b.name,
        count: countMap.get(b.name.toLowerCase()) || b.productCount || 0,
        logo: b.logo,
        isExact: normBrandName === normalizedQuery,
      });
    }
  }

  // 2. Check any brand present in products not in brands table
  for (const p of products) {
    if (!p.brand) continue;
    const normBrand = normalizeSearchTerm(p.brand);
    if (seenBrands.has(normBrand)) continue;

    if (normBrand.includes(normalizedQuery) || matchesSearch(p.brand, searchWords)) {
      seenBrands.add(normBrand);
      const meta = brandMetaMap.get(p.brand.toLowerCase());
      results.push({
        name: p.brand,
        count: countMap.get(p.brand.toLowerCase()) || 0,
        logo: meta?.logo,
        isExact: normBrand === normalizedQuery,
      });
    }
  }

  return results.sort((a, b) => {
    if (a.isExact !== b.isExact) return a.isExact ? -1 : 1;
    return b.count - a.count;
  });
}

/**
 * Filter mode tab labels for multi-lingual UI
 */
export function getFilterModeLabels(lang: 'en' | 'ar') {
  if (lang === 'ar') {
    return [
      { mode: 'all' as SearchFilterMode, label: 'الكل' },
      { mode: 'name' as SearchFilterMode, label: 'بالاسم' },
      { mode: 'brand' as SearchFilterMode, label: 'بالماركة' },
    ];
  }
  return [
    { mode: 'all' as SearchFilterMode, label: 'All' },
    { mode: 'name' as SearchFilterMode, label: 'By Name' },
    { mode: 'brand' as SearchFilterMode, label: 'By Brand' },
  ];
}
