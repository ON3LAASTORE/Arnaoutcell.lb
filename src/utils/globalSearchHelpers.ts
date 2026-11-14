import { Product, Brand, Category } from '../types';
import { normalizeSearchTerm, matchesSearch } from './searchSuggestions';

export type SearchFilterMode = 'all' | 'name' | 'brand' | 'category';

export interface ScoredProductMatch {
  product: Product;
  score: number;
  matchedBy: 'name' | 'brand' | 'category' | 'multiple';
}

export interface MatchedBrandInfo {
  name: string;
  count: number;
  logo?: string;
  isExact: boolean;
}

export interface MatchedCategoryInfo {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  iconName: string;
  count: number;
  isExact: boolean;
  subcategories?: string[];
}

function resolveProductCategoryRecords(product: Product, categories: Category[]): Category[] {
  if (!categories.length || !product.category) return [];
  const normProdCat = normalizeSearchTerm(product.category);
  return categories.filter((c) => {
    const normName = normalizeSearchTerm(c.name);
    const normSlug = normalizeSearchTerm(c.slug);
    return normName === normProdCat || normSlug === normProdCat;
  });
}

function doesProductMatchCategory(
  product: Product,
  normalizedQuery: string,
  searchWords: string[],
  categories: Category[] = []
): { matches: boolean; exact: boolean; startsWith: boolean } {
  const catText = normalizeSearchTerm(product.category || '');
  const subcatText = normalizeSearchTerm(product.subcategory || '');
  const linkedCats = resolveProductCategoryRecords(product, categories);

  const exact =
    catText === normalizedQuery ||
    subcatText === normalizedQuery ||
    linkedCats.some(
      (c) =>
        normalizeSearchTerm(c.name) === normalizedQuery ||
        normalizeSearchTerm(c.nameAr || '') === normalizedQuery ||
        normalizeSearchTerm(c.slug) === normalizedQuery
    );

  const startsWith =
    catText.startsWith(normalizedQuery) ||
    subcatText.startsWith(normalizedQuery) ||
    linkedCats.some(
      (c) =>
        normalizeSearchTerm(c.name).startsWith(normalizedQuery) ||
        normalizeSearchTerm(c.nameAr || '').startsWith(normalizedQuery)
    );

  const matches =
    exact ||
    startsWith ||
    catText.includes(normalizedQuery) ||
    subcatText.includes(normalizedQuery) ||
    matchesSearch(product.category || '', searchWords) ||
    (product.subcategory ? matchesSearch(product.subcategory, searchWords) : false) ||
    linkedCats.some(
      (c) =>
        normalizeSearchTerm(c.name).includes(normalizedQuery) ||
        normalizeSearchTerm(c.nameAr || '').includes(normalizedQuery) ||
        normalizeSearchTerm(c.slug).includes(normalizedQuery) ||
        matchesSearch(c.name, searchWords) ||
        (c.nameAr ? matchesSearch(c.nameAr, searchWords) : false) ||
        (c.subcategories || []).some((sub) => matchesSearch(sub, searchWords))
    );

  return { matches, exact, startsWith };
}

/**
 * Filters and ranks products by name, brand, or category based on query and filter mode.
 */
export function filterProductsGlobally(
  products: Product[],
  query: string,
  mode: SearchFilterMode = 'all',
  categories: Category[] = []
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
    const sku = normalizeSearchTerm(product.sku || '');

    const nameMatches =
      nameEn.includes(normalizedQuery) ||
      nameAr.includes(normalizedQuery) ||
      matchesSearch(product.name, searchWords) ||
      (product.nameAr ? matchesSearch(product.nameAr, searchWords) : false);

    const brandMatches =
      brand.includes(normalizedQuery) ||
      matchesSearch(product.brand, searchWords);

    const categoryMatchInfo = doesProductMatchCategory(
      product,
      normalizedQuery,
      searchWords,
      categories
    );
    const categoryMatches = categoryMatchInfo.matches;

    const skuMatches = mode === 'all' && sku.length > 0 && sku.includes(normalizedQuery);

    let matchType: 'name' | 'brand' | 'category' | 'multiple' | null = null;

    if (mode === 'name' && nameMatches) {
      matchType = 'name';
    } else if (mode === 'brand' && brandMatches) {
      matchType = 'brand';
    } else if (mode === 'category' && categoryMatches) {
      matchType = 'category';
    } else if (mode === 'all') {
      const hitCount =
        (nameMatches ? 1 : 0) +
        (brandMatches ? 1 : 0) +
        (categoryMatches ? 1 : 0) +
        (skuMatches ? 1 : 0);

      if (hitCount > 1) matchType = 'multiple';
      else if (nameMatches) matchType = 'name';
      else if (brandMatches) matchType = 'brand';
      else if (categoryMatches) matchType = 'category';
      else if (skuMatches) matchType = 'name';
    }

    if (!matchType) continue;

    let score = 0;

    if (nameEn === normalizedQuery || nameAr === normalizedQuery || brand === normalizedQuery) {
      score += 100;
    } else if (nameEn.startsWith(normalizedQuery) || nameAr.startsWith(normalizedQuery)) {
      score += 85;
    } else if (brand.startsWith(normalizedQuery)) {
      score += 78;
    } else if (categoryMatchInfo.exact) {
      score += 74;
    } else if (nameMatches) {
      score += 65;
    } else if (brandMatches) {
      score += 58;
    } else if (categoryMatchInfo.startsWith) {
      score += 54;
    } else if (categoryMatches) {
      score += 48;
    } else if (skuMatches) {
      score += 45;
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
 * Checks whether a single product matches a catalog search query across name, brand, category, or SKU.
 */
export function matchesProductSearchQuery(
  product: Product,
  query: string,
  categories: Category[] = [],
  mode: SearchFilterMode = 'all'
): boolean {
  if (!query.trim()) return true;
  return filterProductsGlobally([product], query, mode, categories).length > 0;
}

/**
 * Backwards-compatible helper preserved for name/brand filtering calls
 */
export function filterProductsByNameOrBrand(
  products: Product[],
  query: string,
  mode: SearchFilterMode = 'all',
  categories: Category[] = []
): Product[] {
  return filterProductsGlobally(products, query, mode, categories);
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
    if (p.isPublished === false || !p.brand) continue;
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
 * Extracts and ranks matching categories from the store taxonomy + published products.
 */
export function getUniqueMatchingCategories(
  products: Product[],
  categories: Category[],
  query: string
): MatchedCategoryInfo[] {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return [];

  const searchWords = normalizedQuery.split(/\s+/).filter(Boolean);

  // Count published products per category name / slug
  const countMap = new Map<string, number>();
  for (const p of products) {
    if (p.isPublished === false) continue;
    const catKey = normalizeSearchTerm(p.category || '');
    if (!catKey) continue;
    countMap.set(catKey, (countMap.get(catKey) || 0) + 1);
  }

  const seenSlugs = new Set<string>();
  const scored: Array<MatchedCategoryInfo & { score: number }> = [];

  for (const cat of categories) {
    const nameEn = normalizeSearchTerm(cat.name);
    const nameAr = normalizeSearchTerm(cat.nameAr || '');
    const slug = normalizeSearchTerm(cat.slug);
    const subcats = (cat.subcategories || []).map((s) => normalizeSearchTerm(s));

    let score = 0;
    const isExact =
      nameEn === normalizedQuery ||
      nameAr === normalizedQuery ||
      slug === normalizedQuery;

    if (isExact) {
      score = 100;
    } else if (nameEn.startsWith(normalizedQuery) || nameAr.startsWith(normalizedQuery)) {
      score = 85;
    } else if (
      nameEn.includes(normalizedQuery) ||
      nameAr.includes(normalizedQuery) ||
      matchesSearch(cat.name, searchWords) ||
      (cat.nameAr && matchesSearch(cat.nameAr, searchWords))
    ) {
      score = 70;
    } else if (slug.includes(normalizedQuery)) {
      score = 55;
    } else if (subcats.some((s) => s.includes(normalizedQuery) || matchesSearch(s, searchWords))) {
      score = 45;
    }

    if (score === 0 || seenSlugs.has(cat.slug)) continue;
    seenSlugs.add(cat.slug);

    const countKeys = new Set([normalizeSearchTerm(cat.name), normalizeSearchTerm(cat.slug)]);
    let count = 0;
    for (const k of countKeys) {
      count += countMap.get(k) || 0;
    }

    // Prioritize categories that currently contain published inventory unless exact match
    if (count > 0) {
      score += 20;
    }

    scored.push({
      id: cat.id,
      name: cat.name,
      nameAr: cat.nameAr,
      slug: cat.slug,
      iconName: cat.iconName,
      subcategories: cat.subcategories,
      count,
      isExact,
      score,
    });
  }

  return scored
    .sort((a, b) => {
      if (a.isExact !== b.isExact) return a.isExact ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return b.count - a.count;
    })
    .map(({ score: _score, ...rest }) => rest);
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
      { mode: 'category' as SearchFilterMode, label: 'بالقسم' },
    ];
  }
  return [
    { mode: 'all' as SearchFilterMode, label: 'All' },
    { mode: 'name' as SearchFilterMode, label: 'By Name' },
    { mode: 'brand' as SearchFilterMode, label: 'By Brand' },
    { mode: 'category' as SearchFilterMode, label: 'By Category' },
  ];
}
