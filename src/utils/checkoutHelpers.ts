import { CartItem, OrderItem, Product, ProductVariant, Review } from '../types';
import {
  calculateVariantUnitPrice,
  findVariantForColor,
  getProductColorOptions,
  isCapacityAvailableForColor,
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

export interface DefaultCartSelection {
  selectedColor?: string;
  selectedVariant?: ProductVariant;
  selectedColorImage?: string;
  colorPriceAdjustment: number;
}

/**
 * Resolves the default color, capacity/color variant, thumbnail image, and color price adjustment
 * when adding a product via 1-click actions (ProductCard, QuickSearchOverlay) so cart items stay
 * synchronized with Product Detail Page selections.
 */
export function resolveDefaultCartSelection(
  product: Product,
  preferredVariant?: ProductVariant
): DefaultCartSelection {
  const colorOptions = getProductColorOptions(product);
  const allVariants = Array.isArray(product.variants) ? product.variants : [];
  const nonColorVariants = allVariants.filter(
    (v) => !v.id.startsWith('var-color-') && !v.color
  );

  let selectedColorOpt = colorOptions[0];
  if (preferredVariant?.color) {
    const matched = colorOptions.find(
      (opt) => opt.name.trim().toLowerCase() === preferredVariant.color!.trim().toLowerCase()
    );
    if (matched) {
      selectedColorOpt = matched;
    }
  }

  const selectedColor = selectedColorOpt?.name || preferredVariant?.color;

  let selectedVariant: ProductVariant | undefined;
  if (preferredVariant) {
    const isColorVariant =
      preferredVariant.id.startsWith('var-color-') || Boolean(preferredVariant.color);
    if (isColorVariant || isCapacityAvailableForColor(preferredVariant.id, selectedColorOpt)) {
      selectedVariant = preferredVariant;
    }
  }

  if (!selectedVariant && nonColorVariants.length > 0) {
    selectedVariant =
      nonColorVariants.find((v) => isCapacityAvailableForColor(v.id, selectedColorOpt)) ||
      nonColorVariants[0];
  }

  if (!selectedVariant && selectedColor) {
    selectedVariant = findVariantForColor(product, selectedColor);
  }

  if (!selectedVariant && allVariants.length > 0 && nonColorVariants.length === 0) {
    selectedVariant = allVariants[0];
  }

  const selectedColorImage =
    selectedColorOpt?.imageUrl || resolveColorShowcaseImage(product, selectedColor);

  const isColorOnlyVariant = Boolean(
    selectedVariant &&
      (selectedVariant.id.startsWith('var-color-') ||
        (selectedVariant.color && nonColorVariants.length === 0))
  );

  const colorPriceAdjustment =
    isColorOnlyVariant || !selectedColorOpt
      ? 0
      : Number(selectedColorOpt.priceAdjustment) || 0;

  return {
    selectedColor,
    selectedVariant,
    selectedColorImage: selectedColorImage || undefined,
    colorPriceAdjustment,
  };
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

/**
 * Recursively removes keys with `undefined` values from objects and nested arrays
 * so Firestore setDoc/updateDoc calls never throw on optional fields.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry !== undefined) {
        cleaned[key] = stripUndefinedDeep(entry);
      }
    }
    return cleaned as T;
  }

  return value;
}

/**
 * Normalizes a requested cart quantity to a non-negative integer bounded by available stock.
 * Returns 0 when the requested quantity is invalid/<=0 or when stock is exhausted.
 */
export function sanitizeCartQuantity(requestedQty: unknown, maxStock?: number): number {
  const num = Number(requestedQty);
  if (!Number.isFinite(num) || num <= 0) {
    return 0;
  }

  const floored = Math.floor(num);
  if (floored <= 0) {
    return 0;
  }

  if (typeof maxStock === 'number' && Number.isFinite(maxStock)) {
    const safeMax = Math.floor(maxStock);
    if (safeMax <= 0) {
      return 0;
    }
    return Math.min(floored, safeMax);
  }

  return floored;
}

export interface CartCheckoutValidationIssue {
  productId: string;
  productName: string;
  reason: 'empty_cart' | 'missing' | 'out_of_stock' | 'exceeds_stock' | 'invalid_quantity' | 'invalid_price';
  availableStock: number;
  requestedQuantity: number;
}

export interface CartCheckoutValidationResult {
  valid: boolean;
  issues: CartCheckoutValidationIssue[];
  messageEn: string;
  messageAr: string;
}

/**
 * Validates every cart line item (existence, price, quantity, and aggregated product/variant stock)
 * against the live catalog before submitting an order.
 */
export function validateCartBeforeCheckout(
  cart: readonly CartItem[],
  products: readonly Product[]
): CartCheckoutValidationResult {
  if (!Array.isArray(cart) || cart.length === 0) {
    return {
      valid: false,
      issues: [
        {
          productId: '',
          productName: '',
          reason: 'empty_cart',
          availableStock: 0,
          requestedQuantity: 0,
        },
      ],
      messageEn: 'Your cart is empty. Add at least one item before checking out.',
      messageAr: 'سلة التسوق فارغة. يرجى إضافة منتج واحد على الأقل قبل إتمام الطلب.',
    };
  }

  const issues: CartCheckoutValidationIssue[] = [];
  const totalQtyByProductId = new Map<string, number>();

  for (const item of cart) {
    if (!item?.product?.id) {
      issues.push({
        productId: '',
        productName: 'Unknown item',
        reason: 'missing',
        availableStock: 0,
        requestedQuantity: Number(item?.quantity) || 0,
      });
      continue;
    }

    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      issues.push({
        productId: item.product.id,
        productName: item.product.name,
        reason: 'invalid_quantity',
        availableStock: Math.max(0, Math.floor(Number(item.product.stock) || 0)),
        requestedQuantity: Number.isFinite(qty) ? qty : 0,
      });
      continue;
    }

    totalQtyByProductId.set(
      item.product.id,
      (totalQtyByProductId.get(item.product.id) || 0) + qty
    );

    const liveProduct =
      products.length > 0
        ? products.find((p) => p.id === item.product.id)
        : item.product;

    if (!liveProduct || liveProduct.isPublished === false) {
      issues.push({
        productId: item.product.id,
        productName: item.product.name,
        reason: 'missing',
        availableStock: 0,
        requestedQuantity: qty,
      });
      continue;
    }

    const liveUnitPrice = resolveCartItemUnitPrice({
      ...item,
      product: liveProduct,
    });
    if (!Number.isFinite(liveUnitPrice) || liveUnitPrice <= 0) {
      issues.push({
        productId: liveProduct.id,
        productName: liveProduct.name,
        reason: 'invalid_price',
        availableStock: Math.max(0, Math.floor(Number(liveProduct.stock) || 0)),
        requestedQuantity: qty,
      });
      continue;
    }

    const productStock = Math.max(0, Math.floor(Number(liveProduct.stock) || 0));
    if (productStock <= 0) {
      issues.push({
        productId: liveProduct.id,
        productName: liveProduct.name,
        reason: 'out_of_stock',
        availableStock: 0,
        requestedQuantity: qty,
      });
      continue;
    }

    const aggregatedQty = totalQtyByProductId.get(liveProduct.id) || qty;
    if (aggregatedQty > productStock) {
      issues.push({
        productId: liveProduct.id,
        productName: liveProduct.name,
        reason: 'exceeds_stock',
        availableStock: productStock,
        requestedQuantity: aggregatedQty,
      });
      continue;
    }

    if (item.selectedVariant && Array.isArray(liveProduct.variants)) {
      const liveVariant = liveProduct.variants.find(
        (v: ProductVariant) => v.id === item.selectedVariant?.id
      );
      if (liveVariant && typeof liveVariant.stock === 'number' && Number.isFinite(liveVariant.stock)) {
        const variantStock = Math.max(0, Math.floor(liveVariant.stock));
        if (qty > variantStock) {
          issues.push({
            productId: liveProduct.id,
            productName: `${liveProduct.name} (${liveVariant.name})`,
            reason: variantStock === 0 ? 'out_of_stock' : 'exceeds_stock',
            availableStock: variantStock,
            requestedQuantity: qty,
          });
        }
      }
    }
  }

  if (issues.length === 0) {
    return { valid: true, issues: [], messageEn: '', messageAr: '' };
  }

  const first = issues[0];
  let messageEn = 'Some items in your cart need attention before checkout.';
  let messageAr = 'بعض المنتجات في سلتك تحتاج إلى مراجعة قبل تأكيد الطلب.';

  if (first.reason === 'out_of_stock') {
    messageEn = `"${first.productName}" is currently out of stock.`;
    messageAr = `المنتج "${first.productName}" غير متوفر حالياً في المخزون.`;
  } else if (first.reason === 'exceeds_stock') {
    messageEn = `Only ${first.availableStock} unit(s) available for "${first.productName}". Please adjust cart quantity.`;
    messageAr = `المتوفر من "${first.productName}" هو ${first.availableStock} قطعة فقط. يرجى تعديل الكمية.`;
  } else if (first.reason === 'missing') {
    messageEn = `"${first.productName}" is no longer available in our catalog.`;
    messageAr = `المنتج "${first.productName}" لم يعد متوفراً في المتجر.`;
  } else if (first.reason === 'invalid_price' || first.reason === 'invalid_quantity') {
    messageEn = `Invalid quantity or price detected for "${first.productName}".`;
    messageAr = `الكمية أو السعر غير صالح للمنتج "${first.productName}".`;
  }

  return { valid: false, issues, messageEn, messageAr };
}
