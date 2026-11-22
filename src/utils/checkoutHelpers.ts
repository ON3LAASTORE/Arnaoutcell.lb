import { CartItem, OrderItem, Product, Review } from '../types';
import {
  calculateVariantUnitPrice,
  getProductColorOptions,
  resolveColorShowcaseImage,
} from './colorVariantHelpers';
import {
  DEFAULT_FULL_RES_FALLBACK_IMAGE,
  resolveFullResolutionImageUrl,
} from './imageResolutionHelpers';

export interface PromoValidationResult {
  isValid: boolean;
  normalizedCode: string;
  discount: number;
  messageEn: string;
  messageAr: string;
}

const TEN_PERCENT_CODES = new Set(['ONALAA10', 'CHOUF10', 'WELCOME10']);

/**
 * Validates a promo code and calculates the USD discount based on current cart subtotal
 * and optional delivery fee.
 * - `ONALAA10` / `CHOUF10` / `WELCOME10`: 10% off subtotal
 * - `FREESHIP`: waives delivery fee (up to deliveryFee, or $3 estimate on Cart before zone selection)
 */
export function validateAndCalculatePromoDiscount(
  rawCode: string,
  subtotal: number,
  deliveryFee?: number
): PromoValidationResult {
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;

  if (!code) {
    return {
      isValid: false,
      normalizedCode: '',
      discount: 0,
      messageEn: 'Please enter a promo code.',
      messageAr: 'يرجى إدخال كود الخصم.',
    };
  }

  if (TEN_PERCENT_CODES.has(code)) {
    const discount = safeSubtotal > 0 ? Math.min(safeSubtotal, Math.round(safeSubtotal * 0.1)) : 0;
    return {
      isValid: true,
      normalizedCode: code,
      discount,
      messageEn: '10% Discount applied successfully!',
      messageAr: 'تم تطبيق خصم 10% بنجاح!',
    };
  }

  if (code === 'FREESHIP') {
    const effectiveFee =
      typeof deliveryFee === 'number' && Number.isFinite(deliveryFee) && deliveryFee >= 0
        ? deliveryFee
        : 3;
    const discount = Math.min(safeSubtotal > 0 ? safeSubtotal + effectiveFee : effectiveFee, effectiveFee);
    return {
      isValid: true,
      normalizedCode: code,
      discount,
      messageEn: 'Free shipping applied!',
      messageAr: 'تم خصم تكلفة التوصيل!',
    };
  }

  return {
    isValid: false,
    normalizedCode: code,
    discount: 0,
    messageEn: 'Invalid or expired coupon code',
    messageAr: 'كود الخصم غير صالح أو منتهي الصلاحية',
  };
}

/**
 * Computes final order total ensuring non-negative USD output.
 */
export function calculateOrderGrandTotal(
  subtotal: number,
  discount: number,
  deliveryFee: number
): number {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  const safeDiscount = Number.isFinite(discount) && discount > 0 ? discount : 0;
  const safeDelivery = Number.isFinite(deliveryFee) && deliveryFee > 0 ? deliveryFee : 0;
  return Math.max(0, Number((safeSubtotal - safeDiscount + safeDelivery).toFixed(2)));
}

/**
 * Computes exact cart line unit price factoring selected capacity variant and color priceAdjustment.
 */
export function resolveCartItemUnitPrice(
  item: Pick<CartItem, 'product' | 'selectedColor' | 'colorPriceAdjustment' | 'selectedVariant'>
): number {
  const basePrice = item.selectedVariant
    ? Number(item.selectedVariant.price) || 0
    : Number(item.product.price) || 0;

  if (
    typeof item.colorPriceAdjustment === 'number' &&
    Number.isFinite(item.colorPriceAdjustment)
  ) {
    return calculateVariantUnitPrice(basePrice, undefined, item.colorPriceAdjustment);
  }

  if (item.selectedColor) {
    const colorOpts = getProductColorOptions(item.product);
    const matchedColor = colorOpts.find(
      (opt) => opt.name.trim().toLowerCase() === item.selectedColor!.trim().toLowerCase()
    );
    if (matchedColor && (!item.selectedVariant || !item.selectedVariant.id.startsWith('var-color-'))) {
      return calculateVariantUnitPrice(basePrice, matchedColor);
    }
  }

  return Math.max(0, Math.round(basePrice * 100) / 100);
}

/**
 * Resolves the best display image for a cart item, prioritizing explicit selectedColorImage,
 * then variant image, then color-matched showcase image, then primary product image.
 */
export function resolveCartItemImage(
  item: Pick<CartItem, 'product' | 'selectedColor' | 'selectedColorImage' | 'selectedVariant'>
): string {
  if (item.selectedColorImage && item.selectedColorImage.trim()) {
    return (
      resolveFullResolutionImageUrl(item.selectedColorImage) || item.selectedColorImage
    );
  }

  if (item.selectedVariant?.image && item.selectedVariant.image.trim()) {
    return resolveFullResolutionImageUrl(item.selectedVariant.image) || item.selectedVariant.image;
  }

  const colorMatch = resolveColorShowcaseImage(item.product, item.selectedColor);
  if (colorMatch) {
    return resolveFullResolutionImageUrl(colorMatch) || colorMatch;
  }

  const firstImg = Array.isArray(item.product.images) ? item.product.images[0] : '';
  if (firstImg && firstImg.trim()) {
    return resolveFullResolutionImageUrl(firstImg) || firstImg;
  }

  return DEFAULT_FULL_RES_FALLBACK_IMAGE;
}

/**
 * Aggregates ordered quantities by product ID so multiple line items
 * for the same product (e.g., two different colors or variants) are summed accurately.
 */
export function aggregateOrderItemQuantities(
  items: readonly Pick<OrderItem, 'productId' | 'quantity'>[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!item.productId) continue;
    const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 0;
    totals.set(item.productId, (totals.get(item.productId) || 0) + qty);
  }
  return totals;
}

/**
 * Validates stock and returns a new Product[] array with stock adjusted across
 * all matching order line items (including per-variant stock when matched).
 */
export function applyOrderStockDelta(
  products: readonly Product[],
  items: readonly Pick<OrderItem, 'productId' | 'productName' | 'quantity' | 'color' | 'variantName'>[],
  direction: 'deduct' | 'restore'
): Product[] {
  const aggregatedQty = aggregateOrderItemQuantities(items);

  if (direction === 'deduct') {
    for (const [productId, totalQty] of aggregatedQty.entries()) {
      const product = products.find((p) => p.id === productId);
      const firstMatch = items.find((i) => i.productId === productId);
      const label = firstMatch?.productName || product?.name || productId;
      if (!product || product.stock < totalQty) {
        throw new Error(
          `Insufficient stock for "${label}". Available: ${product ? product.stock : 0}`
        );
      }
    }
  }

  return products.map((product) => {
    const matchingItems = items.filter((i) => i.productId === product.id);
    if (matchingItems.length === 0) return product;

    const totalDelta = aggregatedQty.get(product.id) || 0;
    const nextStock =
      direction === 'deduct'
        ? Math.max(0, product.stock - totalDelta)
        : product.stock + totalDelta;

    let nextVariants = product.variants;
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      nextVariants = product.variants.map((variant) => {
        let variantDelta = 0;
        for (const item of matchingItems) {
          const matchesVariantName =
            item.variantName &&
            variant.name.trim().toLowerCase() === item.variantName.trim().toLowerCase();
          const matchesColorOnly =
            !item.variantName &&
            item.color &&
            (variant.color || variant.name).trim().toLowerCase() === item.color.trim().toLowerCase();
          if (matchesVariantName || matchesColorOnly) {
            variantDelta += Number(item.quantity) > 0 ? Number(item.quantity) : 0;
          }
        }
        if (variantDelta === 0) return variant;
        return {
          ...variant,
          stock:
            direction === 'deduct'
              ? Math.max(0, variant.stock - variantDelta)
              : variant.stock + variantDelta,
        };
      });
    }

    return {
      ...product,
      stock: nextStock,
      ...(nextVariants ? { variants: nextVariants } : {}),
    };
  });
}

/**
 * Sanitizes product reviews for persistence and Firestore storage bounds.
 */
export function sanitizeProductReviewsForStorage(
  reviews: unknown,
  maxCount: number = 50
): Review[] {
  if (!Array.isArray(reviews)) return [];
  const cleaned: Review[] = [];
  for (const raw of reviews.slice(0, maxCount)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<Review>;
    const userName = typeof r.userName === 'string' ? r.userName.trim().slice(0, 80) : '';
    const comment = typeof r.comment === 'string' ? r.comment.trim().slice(0, 1000) : '';
    if (!userName || !comment) continue;
    const numRating = Number(r.rating);
    const clampedRating = Number.isFinite(numRating)
      ? Math.min(5, Math.max(1, Math.round(numRating)))
      : 5;
    cleaned.push({
      id: typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 64) : `rev-${cleaned.length + 1}`,
      userName,
      rating: clampedRating,
      comment,
      date:
        typeof r.date === 'string' && r.date.trim()
          ? r.date.trim().slice(0, 32)
          : new Date().toISOString().split('T')[0],
      verifiedPurchase: Boolean(r.verifiedPurchase),
    });
  }
  return cleaned;
}

/**
 * Pure helper to append a new review and compute updated rating & count without mutating inputs.
 */
export function addProductReviewPure(
  product: Product,
  reviewData: { userName: string; rating: number; comment: string },
  now: Date = new Date()
): { review: Review; updatedProduct: Product } {
  const existingReviews = sanitizeProductReviewsForStorage(product.reviews);
  const clampedRating = Math.min(5, Math.max(1, Math.round(Number(reviewData.rating) || 5)));
  const newReview: Review = {
    id: `rev-${now.getTime()}`,
    userName: reviewData.userName.trim().slice(0, 80),
    rating: clampedRating,
    comment: reviewData.comment.trim().slice(0, 1000),
    date: now.toISOString().split('T')[0],
    verifiedPurchase: true,
  };

  const nextReviews = [newReview, ...existingReviews].slice(0, 50);
  const newCount = nextReviews.length;
  const newRating = Number(
    (nextReviews.reduce((sum, r) => sum + r.rating, 0) / newCount).toFixed(1)
  );

  return {
    review: newReview,
    updatedProduct: {
      ...product,
      reviews: nextReviews,
      reviewCount: newCount,
      rating: newRating,
    },
  };
}
