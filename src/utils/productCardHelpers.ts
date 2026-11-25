import { Language, Product } from '../types';

export interface ProductPricingMetrics {
  salePrice: number;
  regularPrice: number | null;
  discountPercent: number;
  savingsAmount: number;
  isDiscounted: boolean;
  formattedSalePrice: string;
  formattedRegularPrice: string | null;
  formattedSavings: string | null;
}

export interface ProductCardViewModel {
  brandLabel: string;
  displayTitle: string;
  inStock: boolean;
  isOutOfStock: boolean;
  isLowStock: boolean;
  ratingValue: string;
  ratingDecimal: string;
  reviewCount: number;
  soldLabel: string;
  warrantyMonths: number;
  pricing: ProductPricingMetrics;
  whatsappUrl: string;
}

/**
 * Formats USD dollar figures without trailing .00 for whole numbers,
 * or 2 decimal places when cents are present.
 */
export function formatUsdAmount(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(2);
}

/**
 * Computes normalized sale price, regular price, discount percentage, and savings
 * for any product record across all archives and carousels.
 */
export function computeProductPricingMetrics(
  product: Pick<Product, 'price' | 'originalPrice' | 'discountPercentage'>
): ProductPricingMetrics {
  const salePrice = Number.isFinite(product.price) && product.price >= 0 ? product.price : 0;
  const rawOriginal =
    Number.isFinite(product.originalPrice) && product.originalPrice > salePrice
      ? product.originalPrice
      : null;

  const computedDiscountPct =
    rawOriginal !== null && rawOriginal > 0
      ? Math.round(((rawOriginal - salePrice) / rawOriginal) * 100)
      : 0;

  const explicitDiscountPct =
    typeof product.discountPercentage === 'number' && product.discountPercentage > 0
      ? Math.round(product.discountPercentage)
      : 0;

  const discountPercent = explicitDiscountPct > 0 ? explicitDiscountPct : computedDiscountPct;
  const savingsAmount =
    rawOriginal !== null ? Number((rawOriginal - salePrice).toFixed(2)) : 0;
  const isDiscounted = rawOriginal !== null || discountPercent > 0;

  return {
    salePrice,
    regularPrice: rawOriginal,
    discountPercent,
    savingsAmount,
    isDiscounted,
    formattedSalePrice: `$${formatUsdAmount(salePrice)}`,
    formattedRegularPrice: rawOriginal !== null ? `$${formatUsdAmount(rawOriginal)}` : null,
    formattedSavings: savingsAmount > 0 ? `$${formatUsdAmount(savingsAmount)}` : null,
  };
}

/**
 * Returns deterministic, localized social-proof sold count badge text (e.g. "50+ Sold", "20+ Sold", "100+ Sold").
 */
export function resolveProductSoldCountLabel(
  product: Pick<Product, 'name' | 'soldCount' | 'isBestSeller' | 'reviewCount'>,
  lang: Language
): string {
  let tier = 20;

  if (typeof product.soldCount === 'number' && Number.isFinite(product.soldCount) && product.soldCount > 0) {
    if (product.soldCount >= 100) tier = 100;
    else if (product.soldCount >= 50) tier = 50;
    else if (product.soldCount >= 20) tier = 20;
    else tier = 10;
  } else if (/snap\s*grip|\bn8\b/i.test(product.name || '')) {
    tier = 100;
  } else if (product.isBestSeller) {
    tier = 50;
  } else if ((product.reviewCount ?? 0) > 0) {
    tier = 20;
  } else {
    tier = 10;
  }

  return lang === 'ar' ? `تم بيع +${tier}` : `${tier}+ Sold`;
}

/**
 * Resolves the full-width yellow-gold offer banner text placed directly beneath the product image.
 */
export function buildOfferBannerLabel(
  product: Pick<Product, 'isSpecialOffer' | 'price' | 'originalPrice' | 'discountPercentage'>,
  showOfferDetails: boolean,
  lang: Language
): string | null {
  const pricing = computeProductPricingMetrics(product);
  if (product.isSpecialOffer || showOfferDetails || pricing.isDiscounted) {
    return lang === 'ar' ? 'خصم حتى 40%' : 'UP TO 40% OFF';
  }
  return null;
}

/**
 * Builds the dynamic WhatsApp quick-order link pre-populated with product title, price, and ID.
 */
export function buildProductWhatsAppUrl(
  product: Pick<Product, 'id' | 'name' | 'nameAr' | 'price'>,
  storeWhatsapp: string | undefined,
  lang: Language
): string {
  const cleanPhone = (storeWhatsapp || '96170773067').replace(/[^\d]/g, '') || '96170773067';
  const title = lang === 'ar' ? product.nameAr || product.name : product.name;
  const formattedPrice = formatUsdAmount(product.price);

  const text =
    lang === 'ar'
      ? `مرحباً متجر ON ALAA! أود طلب المنتج:\n- ${title}\n- السعر: $${formattedPrice} USD\n- الكود: ${product.id}\nالرجاء تأكيد التوفر والتوصيل في لبنان.`
      : `Hello ON ALAA STORE! I would like to inquire / order this product:\n- ${title}\n- Price: $${formattedPrice} USD\n- SKU: ${product.id}\nPlease confirm availability and delivery in Lebanon.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Normalizes a full Product record into predictable, equal-height card display data.
 */
export function buildProductCardViewModel(
  product: Product,
  lang: Language,
  storeWhatsapp?: string
): ProductCardViewModel {
  const stock = typeof product.stock === 'number' ? product.stock : 0;
  const lowThreshold = product.lowStockThreshold ?? 3;
  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && stock <= lowThreshold;
  const pricing = computeProductPricingMetrics(product);
  const rawRating =
    typeof product.rating === 'number' && Number.isFinite(product.rating) ? product.rating : 5;

  return {
    brandLabel: (product.brand || product.category || 'ON ALAA STORE').toUpperCase(),
    displayTitle: lang === 'ar' ? product.nameAr || product.name : product.name,
    inStock: !isOutOfStock,
    isOutOfStock,
    isLowStock,
    ratingValue: Number.isInteger(rawRating) ? String(rawRating) : rawRating.toFixed(1),
    ratingDecimal: rawRating.toFixed(1),
    reviewCount: typeof product.reviewCount === 'number' ? product.reviewCount : 0,
    soldLabel: resolveProductSoldCountLabel(product, lang),
    warrantyMonths: typeof product.warrantyMonths === 'number' ? product.warrantyMonths : 0,
    pricing,
    whatsappUrl: buildProductWhatsAppUrl(product, storeWhatsapp, lang),
  };
}
