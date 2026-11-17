import { Brand, Language, Product } from '../types';

export interface BrandShowcaseProductVisual {
  id: string;
  title: string;
  imageUrl: string;
}

export interface BrandShowcaseBannerItem {
  brand: Brand;
  displayName: string;
  itemCount: number;
  productVisuals: BrandShowcaseProductVisual[];
  ariaLabel: string;
}

export const BRAND_SHOWCASE_FALLBACK_VISUALS: Record<string, string[]> = {
  apple: [
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12',
  ],
  samsung: [
    'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
  ],
  xiaomi: [
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df',
  ],
  redmi: [
    'https://images.unsplash.com/photo-1580910051074-3eb694886505',
    'https://images.unsplash.com/photo-1567581935884-3349723552ca',
    'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd',
  ],
  oppo: [
    'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd',
    'https://images.unsplash.com/photo-1565849904461-04a58ad377e0',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f',
  ],
  sony: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
    'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3',
  ],
  anker: [
    'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf',
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df',
  ],
  jbl: [
    'https://images.unsplash.com/photo-1545454675-3531b543be5d',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
  ],
  'green lion': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df',
  ],
  porodo: [
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
  ],
  ugreen: [
    'https://images.unsplash.com/photo-1622434641406-a158123450f9',
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0',
    'https://images.unsplash.com/photo-1618424181497-157f25b6ddd5',
  ],
  baseus: [
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0',
    'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf',
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb',
  ],
  acefast: [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df',
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0',
    'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf',
  ],
  dji: [
    'https://images.unsplash.com/photo-1508614589041-895b88991e3e',
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f',
    'https://images.unsplash.com/photo-1579829366248-204fe8413f31',
  ],
  logitech: [
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
  ],
  razer: [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
  ],
  huawei: [
    'https://images.unsplash.com/photo-1565849904461-04a58ad377e0',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12',
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0',
  ],
  honor: [
    'https://images.unsplash.com/photo-1575695342320-d2d2d2f9b73f',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
    'https://images.unsplash.com/photo-1567581935884-3349723552ca',
  ],
};

function scoreProductForBrandShowcase(product: Product): number {
  let score = 0;
  if (product.stock > 0) score += 10;
  if (product.isBestSeller) score += 5;
  if (product.isSpecialOffer) score += 4;
  if (product.isFeatured) score += 3;
  if (product.isNewArrival) score += 2;
  return score;
}

/**
 * Maps brands and live store products into structured horizontal banner items
 * featuring real product photography clusters instead of circular icon badges.
 */
export function buildBrandShowcaseBanners(
  brands: Brand[],
  products: Product[],
  options: {
    featuredOnly?: boolean;
    limit?: number;
    visualsPerBrand?: number;
    lang?: Language;
  } = {}
): BrandShowcaseBannerItem[] {
  const {
    featuredOnly = false,
    limit,
    visualsPerBrand = 3,
    lang = 'en',
  } = options;

  const publishedProducts = products.filter((p) => p.isPublished !== false);
  const safeVisualCount = Math.max(1, Math.min(4, visualsPerBrand));

  // Build map of normalized brand name -> ranked matching products
  const productsByBrand = new Map<string, Product[]>();
  for (const product of publishedProducts) {
    const key = (product.brand || '').trim().toLowerCase();
    if (!key) continue;
    const list = productsByBrand.get(key) || [];
    list.push(product);
    productsByBrand.set(key, list);
  }

  for (const [key, list] of productsByBrand.entries()) {
    list.sort((a, b) => scoreProductForBrandShowcase(b) - scoreProductForBrandShowcase(a));
    productsByBrand.set(key, list);
  }

  let candidateBrands = featuredOnly
    ? [...brands].sort((a, b) => {
        const aMatches = (productsByBrand.get(a.name.trim().toLowerCase()) || []).length;
        const bMatches = (productsByBrand.get(b.name.trim().toLowerCase()) || []).length;
        const aFeatured = a.featured ? 1 : 0;
        const bFeatured = b.featured ? 1 : 0;
        if (bFeatured !== aFeatured) return bFeatured - aFeatured;
        if ((bMatches > 0 ? 1 : 0) !== (aMatches > 0 ? 1 : 0)) {
          return (bMatches > 0 ? 1 : 0) - (aMatches > 0 ? 1 : 0);
        }
        return (b.productCount || 0) - (a.productCount || 0);
      })
    : [...brands];

  if (typeof limit === 'number' && limit > 0) {
    candidateBrands = candidateBrands.slice(0, limit);
  }

  return candidateBrands.map((brand) => {
    const key = brand.name.trim().toLowerCase();
    const matchedProducts = productsByBrand.get(key) || [];
    const seenUrls = new Set<string>();
    const visuals: BrandShowcaseProductVisual[] = [];

    // 1. Pull real product images from the live catalog first
    for (const prod of matchedProducts) {
      if (visuals.length >= safeVisualCount) break;
      const candidateImages = Array.isArray(prod.images) ? prod.images : [];
      for (const imgUrl of candidateImages) {
        if (!imgUrl || typeof imgUrl !== 'string') continue;
        const normalized = imgUrl.trim();
        if (!normalized || seenUrls.has(normalized)) continue;
        seenUrls.add(normalized);
        visuals.push({
          id: `${prod.id}-${visuals.length}`,
          title: lang === 'ar' && prod.nameAr ? prod.nameAr : prod.name,
          imageUrl: normalized,
        });
        break; // one representative visual per distinct product before reusing gallery shots
      }
    }

    // 2. If fewer than safeVisualCount distinct products exist, allow secondary images from matched products
    if (visuals.length < safeVisualCount) {
      for (const prod of matchedProducts) {
        if (visuals.length >= safeVisualCount) break;
        const candidateImages = Array.isArray(prod.images) ? prod.images : [];
        for (const imgUrl of candidateImages) {
          if (visuals.length >= safeVisualCount) break;
          if (!imgUrl || typeof imgUrl !== 'string') continue;
          const normalized = imgUrl.trim();
          if (!normalized || seenUrls.has(normalized)) continue;
          seenUrls.add(normalized);
          visuals.push({
            id: `${prod.id}-extra-${visuals.length}`,
            title: lang === 'ar' && prod.nameAr ? prod.nameAr : prod.name,
            imageUrl: normalized,
          });
        }
      }
    }

    // 3. Top up with curated brand product imagery & brand image so every banner shows a cohesive lineup
    const fallbackPool = [
      ...(BRAND_SHOWCASE_FALLBACK_VISUALS[key] || []),
      brand.logo,
    ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0);

    for (let i = 0; i < fallbackPool.length && visuals.length < safeVisualCount; i++) {
      const normalized = fallbackPool[i].trim();
      if (seenUrls.has(normalized)) continue;
      seenUrls.add(normalized);
      visuals.push({
        id: `${brand.id}-fallback-${i}`,
        title: `${brand.name} Product`,
        imageUrl: normalized,
      });
    }

    const itemCount =
      matchedProducts.length > 0
        ? Math.max(matchedProducts.length, brand.productCount || 0)
        : brand.productCount || 0;

    return {
      brand,
      displayName: brand.name,
      itemCount,
      productVisuals: visuals,
      ariaLabel:
        lang === 'ar'
          ? `تصفح منتجات ${brand.name} (${itemCount} منتج)`
          : `Browse ${brand.name} products (${itemCount} items)`,
    };
  });
}
