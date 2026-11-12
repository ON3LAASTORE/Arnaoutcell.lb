import { Product, Language } from '../types';

export interface ProductBadge {
  id: 'discount' | 'new' | 'bestseller' | 'low_stock' | 'out_of_stock';
  label: string;
  type: 'danger' | 'primary' | 'warning' | 'amber' | 'slate';
  count?: number;
}

/**
 * Determines whether the product has an active discount or price drop.
 */
export function hasProductDiscount(product: {
  price?: number;
  originalPrice?: number;
  discountPercentage?: number;
}): boolean {
  if (typeof product.discountPercentage === 'number' && product.discountPercentage > 0) {
    return true;
  }
  if (
    typeof product.originalPrice === 'number' &&
    typeof product.price === 'number' &&
    product.originalPrice > product.price
  ) {
    return true;
  }
  return false;
}

/**
 * Determines whether the "NEW" badge should be displayed based on Firestore status.
 */
export function shouldShowNewBadge(product: Pick<Product, 'isNewArrival'>): boolean {
  return Boolean(product.isNewArrival);
}

/**
 * Determines whether the "BESTSELLER" badge should be displayed based on Firestore status.
 */
export function shouldShowBestsellerBadge(product: Pick<Product, 'isBestSeller'>): boolean {
  return Boolean(product.isBestSeller);
}

/**
 * Determines whether the "LOW STOCK" badge should be displayed based on Firestore stock inventory.
 */
export function shouldShowLowStockBadge(
  product: Pick<Product, 'stock' | 'lowStockThreshold'>
): boolean {
  const threshold = product.lowStockThreshold ?? 3;
  return typeof product.stock === 'number' && product.stock > 0 && product.stock <= threshold;
}

/**
 * Determines whether the product is completely out of stock.
 */
export function isProductOutOfStock(product: Pick<Product, 'stock'>): boolean {
  return typeof product.stock === 'number' && product.stock <= 0;
}

/**
 * Returns localized label for low stock warning.
 */
export function getLowStockLabel(
  product: Pick<Product, 'stock'>,
  lang: Language
): string {
  if (lang === 'ar') {
    return product.stock === 1 ? 'بقي قطعة واحدة!' : `بقي ${product.stock} فقط`;
  }
  return product.stock === 1 ? 'Only 1 left!' : `Low Stock: ${product.stock} left`;
}

/**
 * Computes all active badge overlays for a product in priority display order.
 */
export function getProductBadges(
  product: Pick<Product, 'discountPercentage' | 'isNewArrival' | 'isBestSeller' | 'stock' | 'lowStockThreshold'>,
  lang: Language
): ProductBadge[] {
  const badges: ProductBadge[] = [];

  // 1. Discount badge (if discounted)
  if (product.discountPercentage && product.discountPercentage > 0) {
    badges.push({
      id: 'discount',
      label: `-${product.discountPercentage}% OFF`,
      type: 'danger',
    });
  }

  // 2. New arrival badge
  if (shouldShowNewBadge(product)) {
    badges.push({
      id: 'new',
      label: lang === 'ar' ? 'جديد صيدا' : 'NEW',
      type: 'primary',
    });
  }

  // 3. Bestseller badge
  if (shouldShowBestsellerBadge(product)) {
    badges.push({
      id: 'bestseller',
      label: lang === 'ar' ? 'الأكثر مبيعاً 🔥' : 'BESTSELLER 🔥',
      type: 'amber',
    });
  }

  // 4. Low stock or Out of stock badge
  if (isProductOutOfStock(product)) {
    badges.push({
      id: 'out_of_stock',
      label: lang === 'ar' ? 'نفدت الكمية' : 'OUT OF STOCK',
      type: 'slate',
    });
  } else if (shouldShowLowStockBadge(product)) {
    badges.push({
      id: 'low_stock',
      label: getLowStockLabel(product, lang),
      type: 'warning',
      count: product.stock,
    });
  }

  return badges;
}
