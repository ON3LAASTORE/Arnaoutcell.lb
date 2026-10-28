import type { Product, Category, Brand } from '../types';

export interface CategorySuggestion extends Category {
  productCount: number;
}

export interface BrandSuggestion extends Brand {
  productCount: number;
}

export interface SearchSuggestionsResult {
  query: string;
  brands: BrandSuggestion[];
  categories: CategorySuggestion[];
  products: Product[];
  totalBrandMatches: number;
  totalCategoryMatches: number;
  totalProductMatches: number;
}

/**
 * Common Arabic tech terms singular/plural equivalents
 */
const ARABIC_SYNONYMS: Record<string, string[]> = {
  شاحن: ['شواحن', 'شاحن'],
  شواحن: ['شاحن', 'شواحن'],
  هاتف: ['هواتف', 'هاتف', 'موبايل', 'تلفون'],
  هواتف: ['هاتف', 'هواتف', 'موبايلات'],
  موبايل: ['هاتف', 'هواتف', 'موبايل'],
  سماعة: ['سماعات', 'سماعة', 'ايربودز'],
  سماعات: ['سماعة', 'سماعات', 'ايربودز'],
  ساعة: ['ساعات', 'ساعة'],
  ساعات: ['ساعة', 'ساعات'],
  كفر: ['كفرات', 'غطاء', 'حماية'],
  كفرات: ['كفر', 'كفرات', 'حماية'],
  باوربانك: ['باور بانك', 'بطارية', 'شاحن متنقل'],
  اوبو: ['أوبو', 'oppo'],
  ابل: ['أبل', 'apple', 'ايفون', 'آيفون'],
  سامسونج: ['samsung', 'جالاكسي'],
  انكر: ['anker'],
  سوني: ['sony'],
  شاومي: ['xiaomi'],
};

/**
 * Normalizes strings for robust multi-lingual and case-insensitive matching
 */
export function normalizeSearchTerm(str: string = ''): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[ـَُِّْٰ]/g, '') // Strip common Arabic diacritics
    .replace(/[أإآ]/g, 'ا') // Normalize Alef
    .replace(/ة/g, 'ه') // Normalize Taa Marbuta
    .replace(/ى/g, 'ي'); // Normalize Alef Maqsura
}

/**
 * Checks if search text matches target text, considering Arabic variations
 */
export function matchesSearch(targetText: string, searchWords: string[]): boolean {
  const normalizedTarget = normalizeSearchTerm(targetText);
  if (!normalizedTarget) return false;

  return searchWords.every((word) => {
    if (normalizedTarget.includes(word)) return true;

    // Check Arabic synonym variants if applicable
    const variants = ARABIC_SYNONYMS[word];
    if (variants && variants.some((v) => normalizedTarget.includes(normalizeSearchTerm(v)))) {
      return true;
    }

    return false;
  });
}

/**
 * Pure search function querying products, categories, and brands
 */
export function querySearchSuggestions(
  rawQuery: string,
  products: Product[] = [],
  categories: Category[] = [],
  brands: Brand[] = [],
  options: { maxProducts?: number; maxCategories?: number; maxBrands?: number } = {}
): SearchSuggestionsResult {
  const maxProducts = options.maxProducts ?? 6;
  const maxCategories = options.maxCategories ?? 4;
  const maxBrands = options.maxBrands ?? 3;
  const cleanQuery = rawQuery.trim();
  const normalizedQuery = normalizeSearchTerm(cleanQuery);

  if (!normalizedQuery) {
    return {
      query: '',
      brands: [],
      categories: [],
      products: [],
      totalBrandMatches: 0,
      totalCategoryMatches: 0,
      totalProductMatches: 0,
    };
  }

  const searchWords = normalizedQuery.split(/\s+/).filter(Boolean);

  // Pre-calculate product counts per category and brand for published products
  const categoryCountMap = new Map<string, number>();
  const brandCountMap = new Map<string, number>();

  for (const p of products) {
    if (p.isPublished === false) continue;
    const catKey = (p.category || '').toLowerCase();
    categoryCountMap.set(catKey, (categoryCountMap.get(catKey) || 0) + 1);

    const brandKey = (p.brand || '').toLowerCase();
    brandCountMap.set(brandKey, (brandCountMap.get(brandKey) || 0) + 1);
  }

  // 1. Filter and rank Brands
  const matchedBrandsWithScore = brands
    .map((b) => {
      const name = normalizeSearchTerm(b.name);
      const desc = normalizeSearchTerm(b.description || '');

      let score = 0;
      if (name === normalizedQuery) {
        score = 100;
      } else if (name.startsWith(normalizedQuery)) {
        score = 85;
      } else if (matchesSearch(b.name, searchWords)) {
        score = 70;
      } else if (desc && matchesSearch(b.description || '', searchWords)) {
        score = 45;
      }

      // Check Arabic synonyms for brand
      for (const word of searchWords) {
        const variants = ARABIC_SYNONYMS[word] || [];
        if (variants.some((v) => name.includes(normalizeSearchTerm(v)))) {
          score = Math.max(score, 80);
        }
      }

      const count = brandCountMap.get(b.name.toLowerCase()) || b.productCount || 0;

      return {
        brand: {
          ...b,
          productCount: count,
        },
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.brand.productCount - a.brand.productCount);

  // 2. Filter and rank Categories
  const matchedCategoriesWithScore = categories
    .map((cat) => {
      const nameEn = normalizeSearchTerm(cat.name);
      const nameAr = normalizeSearchTerm(cat.nameAr || '');
      const slug = normalizeSearchTerm(cat.slug);
      const subcategories = (cat.subcategories || []).map((s) => normalizeSearchTerm(s));

      let score = 0;
      if (nameEn === normalizedQuery || nameAr === normalizedQuery) {
        score = 100;
      } else if (nameEn.startsWith(normalizedQuery) || nameAr.startsWith(normalizedQuery)) {
        score = 80;
      } else if (matchesSearch(cat.name, searchWords) || matchesSearch(cat.nameAr || '', searchWords)) {
        score = 65;
      } else if (slug.includes(normalizedQuery)) {
        score = 50;
      } else if (subcategories.some((s) => matchesSearch(s, searchWords))) {
        score = 40;
      }

      // Deduplicate slug & name when calculating product count
      const keys = new Set([cat.slug.toLowerCase(), cat.name.toLowerCase()]);
      let pCount = 0;
      for (const k of keys) {
        pCount += categoryCountMap.get(k) || 0;
      }

      return {
        category: {
          ...cat,
          productCount: pCount,
        },
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.category.productCount - a.category.productCount);

  // 3. Filter and rank Products
  const matchedProductsWithScore = products
    .filter((p) => p.isPublished !== false)
    .map((p) => {
      const nameEn = normalizeSearchTerm(p.name);
      const nameAr = normalizeSearchTerm(p.nameAr || '');
      const brand = normalizeSearchTerm(p.brand);
      const sku = normalizeSearchTerm(p.sku);

      let score = 0;
      if (nameEn.startsWith(normalizedQuery) || nameAr.startsWith(normalizedQuery)) {
        score = 100;
      } else if (matchesSearch(p.name, searchWords) || matchesSearch(p.nameAr || '', searchWords)) {
        score = 80;
      } else if (brand.startsWith(normalizedQuery)) {
        score = 75;
      } else if (matchesSearch(p.brand, searchWords)) {
        score = 60;
      } else if (matchesSearch(p.category, searchWords) || (p.subcategory && matchesSearch(p.subcategory, searchWords))) {
        score = 50;
      } else if (sku.includes(normalizedQuery)) {
        score = 45;
      } else if (p.specifications?.some((spec) => matchesSearch(spec.value, searchWords))) {
        score = 30;
      }

      return {
        product: p,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // In-stock products rank higher
      if ((b.product.stock > 0 ? 1 : 0) !== (a.product.stock > 0 ? 1 : 0)) {
        return b.product.stock > 0 ? 1 : -1;
      }
      return (b.product.rating || 0) - (a.product.rating || 0);
    });

  return {
    query: cleanQuery,
    brands: matchedBrandsWithScore.slice(0, maxBrands).map((item) => item.brand),
    categories: matchedCategoriesWithScore.slice(0, maxCategories).map((item) => item.category),
    products: matchedProductsWithScore.slice(0, maxProducts).map((item) => item.product),
    totalBrandMatches: matchedBrandsWithScore.length,
    totalCategoryMatches: matchedCategoriesWithScore.length,
    totalProductMatches: matchedProductsWithScore.length,
  };
}

export const POPULAR_SEARCH_TERMS = [
  'OPPO Find X8',
  'iPhone 16 Pro',
  'Samsung Galaxy S25',
  'AirPods',
  'Anker Power Bank',
  'OPPO Reno',
  'Smartwatch',
  'Fast Charger',
  'Green Lion',
  'Sony Headphones',
];
