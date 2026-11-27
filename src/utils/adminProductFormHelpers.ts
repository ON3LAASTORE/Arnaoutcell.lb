import { Product, ProductColorEntry, ProductSpec, ProductVariant } from '../types';
import { resolveFullResolutionImageUrl } from './imageResolutionHelpers';

export const MAX_PRODUCT_PRICE = 1_000_000;
export const MAX_PRODUCT_STOCK = 1_000_000;
export const MAX_LOW_STOCK_THRESHOLD = 100_000;
export const MAX_WARRANTY_MONTHS = 120;

export const DEFAULT_DESCRIPTION_EN =
  'Genuine device with full Lebanese store warranty from ON ALAA STORE (Chouf) and express delivery to all Lebanon.';
export const DEFAULT_DESCRIPTION_AR =
  'جهاز أصلي مع كفالة متجر ON ALAA STORE الرسمية (الشوف) وتوصيل سريع متاح لجميع مناطق لبنان.';

export interface AdminProductFormInput {
  name: string;
  nameAr?: string;
  brand: string;
  category: string;
  subcategory?: string;
  sku: string;
  barcode?: string;
  originalPrice: number | string;
  price: number | string;
  stock: number | string;
  lowStockThreshold?: number | string;
  warrantyMonths?: number | string;
  images?: string[];
  videoUrl?: string;
  description?: string;
  descriptionAr?: string;
  specifications?: ProductSpec[];
  colors?: ProductColorEntry[];
  colorImages?: Record<string, string>;
  variants?: ProductVariant[];
  isSpecialOffer?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isPublished?: boolean;
}

export interface AdminProductValidationSuccess {
  valid: true;
  errors: [];
  normalized: {
    name: string;
    nameAr: string;
    brand: string;
    category: string;
    subcategory: string;
    sku: string;
    barcode: string;
    price: number;
    originalPrice: number;
    discountPercentage: number;
    stock: number;
    lowStockThreshold: number;
    warrantyMonths: number;
    images: string[];
    videoUrl?: string;
    description: string;
    descriptionAr: string;
  };
}

export interface AdminProductValidationFailure {
  valid: false;
  errors: string[];
}

export type AdminProductValidationResult =
  | AdminProductValidationSuccess
  | AdminProductValidationFailure;

/**
 * Normalizes a candidate product ID to strictly satisfy `firestore.rules` `isValidId`
 * (`^[a-zA-Z0-9_\-]+$`, 1..128 characters).
 */
export function sanitizeProductId(rawId?: string, nowMs: number = Date.now()): string {
  const cleaned = typeof rawId === 'string'
    ? rawId
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 128)
    : '';
  if (cleaned && /^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned;
  }
  const safeTs = Number.isFinite(nowMs) && nowMs > 0 ? Math.floor(nowMs) : Date.now();
  return `prod-${safeTs}`;
}

function parseFiniteNumber(raw: number | string | undefined): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return Number.NaN;
    return Number(trimmed);
  }
  return Number.NaN;
}

/**
 * Validates and normalizes Admin Product form inputs before persistence.
 */
export function validateAdminProductForm(
  input: AdminProductFormInput
): AdminProductValidationResult {
  const errors: string[] = [];

  const name = (input.name || '').trim().slice(0, 255);
  const nameAr = ((input.nameAr || '').trim() || name).slice(0, 255);
  const brand = (input.brand || '').trim().slice(0, 64);
  const category = (input.category || '').trim().slice(0, 64);
  const subcategory = (input.subcategory || '').trim().slice(0, 64);
  const sku = (input.sku || '').trim().slice(0, 64);
  const barcode = ((input.barcode || '').trim() || sku).slice(0, 64);

  if (!name) {
    errors.push('Product name is required.');
  }
  if (!sku) {
    errors.push('Product SKU is required.');
  }
  if (!brand) {
    errors.push('Brand is required.');
  }
  if (!category) {
    errors.push('Category is required.');
  }

  const rawPrice = parseFiniteNumber(input.price);
  if (!Number.isFinite(rawPrice) || rawPrice < 0 || rawPrice > MAX_PRODUCT_PRICE) {
    errors.push(`Selling price must be a valid number between 0 and ${MAX_PRODUCT_PRICE}.`);
  }

  const hasOriginalPrice =
    input.originalPrice !== undefined &&
    input.originalPrice !== null &&
    String(input.originalPrice).trim() !== '';
  const rawOriginalPrice = hasOriginalPrice ? parseFiniteNumber(input.originalPrice) : rawPrice;
  if (
    hasOriginalPrice &&
    (!Number.isFinite(rawOriginalPrice) ||
      rawOriginalPrice < 0 ||
      rawOriginalPrice > MAX_PRODUCT_PRICE)
  ) {
    errors.push(`Original price must be a valid number between 0 and ${MAX_PRODUCT_PRICE}.`);
  }

  const rawStock = parseFiniteNumber(input.stock);
  if (!Number.isFinite(rawStock) || rawStock < 0 || rawStock > MAX_PRODUCT_STOCK) {
    errors.push(`Stock quantity must be a valid non-negative number up to ${MAX_PRODUCT_STOCK}.`);
  }

  const hasLowStock =
    input.lowStockThreshold !== undefined &&
    input.lowStockThreshold !== null &&
    String(input.lowStockThreshold).trim() !== '';
  const rawLowStock = hasLowStock ? parseFiniteNumber(input.lowStockThreshold) : 3;
  if (
    !Number.isFinite(rawLowStock) ||
    rawLowStock < 0 ||
    rawLowStock > MAX_LOW_STOCK_THRESHOLD
  ) {
    errors.push('Low stock alert threshold must be a non-negative number.');
  }

  const hasWarranty =
    input.warrantyMonths !== undefined &&
    input.warrantyMonths !== null &&
    String(input.warrantyMonths).trim() !== '';
  const rawWarranty = hasWarranty ? parseFiniteNumber(input.warrantyMonths) : 12;
  if (
    !Number.isFinite(rawWarranty) ||
    rawWarranty < 0 ||
    rawWarranty > MAX_WARRANTY_MONTHS
  ) {
    errors.push(`Warranty months must be between 0 and ${MAX_WARRANTY_MONTHS}.`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const price = Number(rawPrice.toFixed(2));
  const originalPriceCandidate =
    Number.isFinite(rawOriginalPrice) && rawOriginalPrice > 0
      ? Number(rawOriginalPrice.toFixed(2))
      : price;
  const originalPrice = originalPriceCandidate >= price ? originalPriceCandidate : price;
  const discountPercentage =
    originalPrice > price
      ? Math.min(100, Math.max(0, Math.round(((originalPrice - price) / originalPrice) * 100)))
      : 0;

  const stock = Math.round(rawStock);
  const lowStockThreshold = Math.round(rawLowStock);
  const warrantyMonths = Math.round(rawWarranty);

  const normalizedImages = Array.isArray(input.images)
    ? input.images
        .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
        .slice(0, 30)
        .map((img) => resolveFullResolutionImageUrl(img.trim()) || img.trim())
    : [];

  const images = normalizedImages;

  const videoUrl =
    typeof input.videoUrl === 'string' && input.videoUrl.trim()
      ? input.videoUrl.trim().slice(0, 512)
      : undefined;

  const description = ((input.description || '').trim() || DEFAULT_DESCRIPTION_EN).slice(0, 5000);
  const descriptionAr = ((input.descriptionAr || '').trim() || DEFAULT_DESCRIPTION_AR).slice(0, 5000);

  return {
    valid: true,
    errors: [],
    normalized: {
      name,
      nameAr,
      brand,
      category,
      subcategory,
      sku,
      barcode,
      price,
      originalPrice,
      discountPercentage,
      stock,
      lowStockThreshold,
      warrantyMonths,
      images,
      ...(videoUrl ? { videoUrl } : {}),
      description,
      descriptionAr,
    },
  };
}

/**
 * Builds a complete, cleanly typed `Product` object ready for local, server, and Firestore storage.
 */
export function buildAdminProductRecord(
  input: AdminProductFormInput,
  options?: {
    existingProduct?: Product | null;
    nowMs?: number;
  }
): { ok: true; product: Product } | { ok: false; errors: string[] } {
  const validation = validateAdminProductForm(input);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const existing = options?.existingProduct || null;
  const nowMs = options?.nowMs ?? Date.now();
  const id = existing
    ? sanitizeProductId(existing.id, nowMs)
    : sanitizeProductId(`prod-${nowMs}`, nowMs);
  const n = validation.normalized;

  const product: Product = {
    id,
    name: n.name,
    nameAr: n.nameAr,
    brand: n.brand,
    category: n.category,
    subcategory: n.subcategory,
    sku: n.sku,
    barcode: n.barcode,
    price: n.price,
    originalPrice: n.originalPrice,
    discountPercentage: n.discountPercentage,
    stock: n.stock,
    lowStockThreshold: n.lowStockThreshold,
    images: n.images,
    ...(n.videoUrl ? { videoUrl: n.videoUrl } : {}),
    description: n.description,
    descriptionAr: n.descriptionAr,
    specifications: Array.isArray(input.specifications) ? input.specifications : [],
    colors: Array.isArray(input.colors) ? input.colors : [],
    colorImages: input.colorImages && typeof input.colorImages === 'object' ? input.colorImages : {},
    variants: Array.isArray(input.variants) ? input.variants : [],
    rating: existing && Number.isFinite(existing.rating) ? existing.rating : 5.0,
    reviewCount: existing && Number.isFinite(existing.reviewCount) ? existing.reviewCount : 0,
    ...(existing && typeof existing.soldCount === 'number' ? { soldCount: existing.soldCount } : { soldCount: 0 }),
    ...(existing && Array.isArray(existing.reviews) ? { reviews: existing.reviews } : {}),
    isSpecialOffer: Boolean(input.isSpecialOffer),
    isFeatured: Boolean(input.isFeatured),
    isNewArrival: Boolean(input.isNewArrival),
    isBestSeller: Boolean(input.isBestSeller),
    isPublished: input.isPublished !== false,
    warrantyMonths: n.warrantyMonths,
    createdAt: existing?.createdAt || new Date(nowMs).toISOString(),
  };

  return { ok: true, product };
}
