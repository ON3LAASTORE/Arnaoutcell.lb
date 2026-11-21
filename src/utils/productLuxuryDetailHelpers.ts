import { Language, Product, ProductVariant } from '../types';
import { resolveColorShowcaseImage } from './colorVariantHelpers';
import {
  DEFAULT_FULL_RES_FALLBACK_IMAGE,
  resolveFullResolutionImageUrl,
} from './imageResolutionHelpers';

export interface CapacityOption {
  id: string;
  label: string;
  price: number;
  variant?: ProductVariant;
  isSpecDerived?: boolean;
}

/**
 * Formats USD amounts cleanly in luxury 2-decimal notation (e.g., 190 -> "$190.00").
 */
export function formatLuxuryUsdPrice(amount: number): string {
  const safe = typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 ? amount : 0;
  return `$${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Computes exact order line subtotal from unit price and clamped quantity (>= 1).
 */
export function computeLuxurySubtotal(unitPrice: number, quantity: number): number {
  const safePrice =
    typeof unitPrice === 'number' && Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
  const safeQty =
    typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 1
      ? Math.floor(quantity)
      : 1;
  return Math.round(safePrice * safeQty * 100) / 100;
}

/**
 * Builds the deduplicated list of product image URLs for the clean left-column carousel,
 * incorporating both gallery images and distinct explicit per-color images.
 */
export function buildLuxuryCarouselImages(
  product: Pick<Product, 'images' | 'colorImages' | 'variants'>,
  preferredColorImage?: string
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (raw?: string) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const resolved = resolveFullResolutionImageUrl(trimmed) || trimmed;
    if (!seen.has(resolved)) {
      seen.add(resolved);
      urls.push(resolved);
    }
  };

  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      pushUnique(img);
    }
  }

  if (product.colorImages && typeof product.colorImages === 'object') {
    for (const colorImg of Object.values(product.colorImages)) {
      pushUnique(colorImg);
    }
  }

  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (variant.image) pushUnique(variant.image);
    }
  }

  pushUnique(preferredColorImage);

  if (urls.length === 0) {
    urls.push(DEFAULT_FULL_RES_FALLBACK_IMAGE);
  }

  return urls;
}

/**
 * Finds the carousel index corresponding to a selected color, or falls back safely.
 */
export function findCarouselIndexForColor(
  product: Pick<Product, 'colors' | 'images' | 'colorImages' | 'variants'>,
  carouselImages: readonly string[],
  selectedColor?: string
): number {
  if (!selectedColor || carouselImages.length === 0) return 0;
  const showcaseUrl = resolveColorShowcaseImage(product, selectedColor);
  if (!showcaseUrl) return 0;
  const resolved = resolveFullResolutionImageUrl(showcaseUrl) || showcaseUrl;
  const idx = carouselImages.findIndex((img) => img === resolved);
  return idx >= 0 ? idx : 0;
}

/**
 * Finds the color name mapped to a given carousel image URL so arrow navigation keeps the color swatch synchronized.
 */
export function findColorForCarouselImage(
  product: Pick<Product, 'colors' | 'images' | 'colorImages' | 'variants'>,
  imageUrl?: string
): string | undefined {
  if (!imageUrl || !Array.isArray(product.colors) || product.colors.length === 0) {
    return undefined;
  }
  const target = resolveFullResolutionImageUrl(imageUrl) || imageUrl;
  for (const color of product.colors) {
    const cleanColor = color.trim();
    if (!cleanColor) continue;
    const mapped = resolveColorShowcaseImage(product, cleanColor);
    if (!mapped) continue;
    const resolvedMapped = resolveFullResolutionImageUrl(mapped) || mapped;
    if (resolvedMapped === target) {
      return cleanColor;
    }
  }
  return undefined;
}

/**
 * Computes cyclic wrap-around carousel index for ◀ / ▶ buttons.
 */
export function stepCarouselIndex(
  currentIndex: number,
  delta: -1 | 1,
  totalCount: number
): number {
  if (totalCount <= 1) return 0;
  const normalized = ((currentIndex % totalCount) + totalCount) % totalCount;
  return (normalized + delta + totalCount) % totalCount;
}

/**
 * Resolves interactive Capacity / Configuration pills from non-color product variants,
 * or extracts a single storage capacity indicator from title/specs when explicit storage tiers aren't split.
 */
export function buildCapacityOptions(
  product: Pick<Product, 'name' | 'price' | 'variants' | 'specifications'>
): CapacityOption[] {
  const nonColorVariants = Array.isArray(product.variants)
    ? product.variants.filter((v) => !v.id.startsWith('var-color-') && !v.color)
    : [];

  if (nonColorVariants.length > 0) {
    return nonColorVariants.map((v) => ({
      id: v.id,
      label: v.name,
      price: Number.isFinite(v.price) && v.price >= 0 ? v.price : product.price,
      variant: v,
    }));
  }

  // Extract explicit storage tier (e.g. "128GB", "256GB", "512GB", "1TB") from name or specs if present
  const specText = Array.isArray(product.specifications)
    ? product.specifications
        .filter((s) => /storage|capacity|rom|memory|سعة|تخزين/i.test(s.label || ''))
        .map((s) => s.value)
        .join(' ')
    : '';
  const combinedSource = `${product.name || ''} ${specText}`;
  const storageMatch = combinedSource.match(/\b(\d{2,4}\s?(?:GB|TB))\b/i);
  if (storageMatch) {
    const formatted = storageMatch[1].replace(/\s+/g, '').toUpperCase();
    return [
      {
        id: `spec-cap-${formatted}`,
        label: formatted,
        price: product.price,
        isSpecDerived: true,
      },
    ];
  }

  return [];
}

/**
 * Provides clean localized copy for Sidekick quick suggestions.
 */
export function getSidekickQuickPrompts(lang: Language): string[] {
  if (lang === 'ar') {
    return [
      'ما هي أبرز المميزات؟',
      'هل يشمل كفالة وتوصيل؟',
      'كيف الأداء للاستخدام اليومي؟',
    ];
  }
  return [
    'What makes this worth buying?',
    'Summarize key specs cleanly',
    'Warranty & Lebanon delivery?',
  ];
}

export type AccordionSectionKey = 'overview' | 'specs' | 'delivery' | 'reviews';

/**
 * Resolves which accordion sections have valid data for a product.
 * Only sections backed by actual product/store metadata are included.
 */
export function resolveAvailableAccordionSections(
  product: Pick<
    Product,
    'description' | 'descriptionAr' | 'specifications' | 'warrantyMonths' | 'warrantyTerms' | 'reviews' | 'reviewCount'
  >,
  options?: {
    hasStoreDelivery?: boolean;
    allowReviewSubmission?: boolean;
  }
): AccordionSectionKey[] {
  const sections: AccordionSectionKey[] = [];

  const hasDescription = Boolean(
    (typeof product.description === 'string' && product.description.trim().length > 0) ||
      (typeof product.descriptionAr === 'string' && product.descriptionAr.trim().length > 0)
  );
  if (hasDescription) {
    sections.push('overview');
  }

  const validSpecs = Array.isArray(product.specifications)
    ? product.specifications.filter(
        (s) => typeof s?.label === 'string' && s.label.trim() && typeof s?.value === 'string' && s.value.trim()
      )
    : [];
  if (validSpecs.length > 0) {
    sections.push('specs');
  }

  const hasWarranty =
    (typeof product.warrantyMonths === 'number' && Number.isFinite(product.warrantyMonths) && product.warrantyMonths > 0) ||
    (typeof product.warrantyTerms === 'string' && product.warrantyTerms.trim().length > 0);
  if (hasWarranty || options?.hasStoreDelivery) {
    sections.push('delivery');
  }

  const hasReviews =
    (Array.isArray(product.reviews) && product.reviews.length > 0) ||
    (typeof product.reviewCount === 'number' && product.reviewCount > 0);
  if (hasReviews || options?.allowReviewSubmission) {
    sections.push('reviews');
  }

  return sections;
}

/**
 * Extracts concise key highlights directly from verified product fields & specifications.
 */
export function extractOverviewHighlights(
  product: Pick<Product, 'brand' | 'category' | 'warrantyMonths' | 'specifications'>,
  lang: Language
): string[] {
  const highlights: string[] = [];

  if (product.brand?.trim()) {
    highlights.push(
      lang === 'ar'
        ? `منتج أصلي مضمون من ${product.brand.trim()}`
        : `100% Genuine ${product.brand.trim()} — Direct Agent Import`
    );
  }

  if (Array.isArray(product.specifications)) {
    for (const spec of product.specifications) {
      if (highlights.length >= 4) break;
      if (spec.label?.trim() && spec.value?.trim()) {
        highlights.push(`${spec.label.trim()}: ${spec.value.trim()}`);
      }
    }
  }

  if (
    highlights.length < 4 &&
    typeof product.warrantyMonths === 'number' &&
    product.warrantyMonths > 0
  ) {
    highlights.push(
      lang === 'ar'
        ? `كفالة وكيل رسمية لمدة ${product.warrantyMonths} شهراً`
        : `${product.warrantyMonths} Mo. Official Agent Warranty`
    );
  }

  return highlights;
}

/**
 * Pure immutable toggle for open accordion section keys.
 */
export function toggleAccordionSection(
  openKeys: ReadonlySet<AccordionSectionKey>,
  targetKey: AccordionSectionKey
): Set<AccordionSectionKey> {
  const next = new Set(openKeys);
  if (next.has(targetKey)) {
    next.delete(targetKey);
  } else {
    next.add(targetKey);
  }
  return next;
}

export interface QuickReadSummary {
  headline: string;
  takeaways: string[];
}

/**
 * Splits multi-paragraph product descriptions cleanly on blank lines or single newlines.
 */
export function splitDescriptionParagraphs(description: string | undefined): string[] {
  if (!description || typeof description !== 'string') return [];
  const trimmed = description.trim();
  if (!trimmed) return [];
  const doubleBreak = trimmed
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (doubleBreak.length > 1) return doubleBreak;
  return trimmed
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Distills a product's full description, specifications, and warranty into a crisp Quick Read card.
 */
export function buildQuickReadSummary(
  product: Pick<
    Product,
    'name' | 'nameAr' | 'brand' | 'description' | 'descriptionAr' | 'specifications' | 'warrantyMonths'
  >,
  lang: Language
): QuickReadSummary {
  const rawDesc =
    lang === 'ar'
      ? product.descriptionAr || product.description || ''
      : product.description || product.descriptionAr || '';

  const sentences = rawDesc
    .trim()
    .split(/(?<=[.!؟])(?:\s+|$)|\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const headline = sentences[0]
    ? sentences[0]
    : lang === 'ar'
    ? product.nameAr || product.name
    : product.name;

  const takeaways: string[] = [];
  if (Array.isArray(product.specifications)) {
    for (const spec of product.specifications) {
      if (takeaways.length >= 4) break;
      if (spec?.label?.trim() && spec?.value?.trim()) {
        takeaways.push(`${spec.label.trim()}: ${spec.value.trim()}`);
      }
    }
  }

  const months = Number(product.warrantyMonths) || 0;
  if (months > 0 && takeaways.length < 5) {
    takeaways.push(
      lang === 'ar'
        ? `ضمان الوكيل الرسمي لمدة ${months} شهراً + التوصيل لجميع مناطق لبنان`
        : `${months}-Month Official Agent Warranty & All-Lebanon Delivery`
    );
  }

  return { headline, takeaways };
}


