import { Language, Product, ProductVariant } from '../types';
import {
  formatUsdAmount,
  resolveProductSoldCountLabel,
} from './productCardHelpers';
import {
  findVariantForColor,
  resolveColorShowcaseImage,
} from './colorVariantHelpers';

export interface PdpGalleryItem {
  id: string;
  kind: 'image' | 'video';
  imageUrl: string;
  videoUrl?: string;
  alt: string;
}

export interface PdpPurchaseMetrics {
  activePrice: number;
  regularPrice: number | null;
  discountPercent: number;
  isDiscounted: boolean;
  formattedActivePrice: string;
  formattedRegularPrice: string | null;
  savePercentLabel: string | null;
}

export interface PdpColorSwatch {
  color: string;
  thumbnailUrl: string;
  isLightTone: boolean;
  formattedPrice: string;
}

export interface PdpServiceFeature {
  id: 'express' | 'returns' | 'shipping';
  title: string;
  subtitle: string;
}

/**
 * Builds the vertical PDP thumbnail gallery items from product images and optional videoUrl.
 * Places optional video showcase item at slot index 1 (second thumbnail) when available.
 */
export function buildPdpGalleryItems(
  product: Pick<Product, 'id' | 'name' | 'images' | 'videoUrl'>
): PdpGalleryItem[] {
  const cleanImages = (product.images || []).filter(
    (img): img is string => typeof img === 'string' && img.trim().length > 0
  );
  const primaryImage = cleanImages[0] || '';
  const items: PdpGalleryItem[] = [];

  if (primaryImage) {
    items.push({
      id: `${product.id}-img-0`,
      kind: 'image',
      imageUrl: primaryImage,
      alt: `${product.name} primary product view`,
    });
  }

  if (product.videoUrl && product.videoUrl.trim().length > 0 && primaryImage) {
    items.push({
      id: `${product.id}-video`,
      kind: 'video',
      imageUrl: cleanImages[1] || primaryImage,
      videoUrl: product.videoUrl.trim(),
      alt: `${product.name} showcase video`,
    });
  }

  cleanImages.slice(1).forEach((img, idx) => {
    items.push({
      id: `${product.id}-img-${idx + 1}`,
      kind: 'image',
      imageUrl: img,
      alt: `${product.name} view ${idx + 2}`,
    });
  });

  return items;
}

/**
 * Formats full PDP heading cleanly appending active color (e.g., "ACEFAST N8 NECK EARPHONES WIRELESS - Black").
 */
export function buildPdpTitleWithColor(
  displayTitle: string,
  selectedColor?: string
): string {
  const cleanTitle = (displayTitle || '').trim();
  const cleanColor = (selectedColor || '').trim();
  if (!cleanColor) return cleanTitle;

  const escapedColor = cleanColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`(-|\\()\\s*${escapedColor}\\s*\\)?$`, 'i').test(cleanTitle)) {
    return cleanTitle;
  }
  return `${cleanTitle} - ${cleanColor}`;
}

/**
 * Computes active price, original crossed-out price, and "Save XX%" green badge for the PDP purchase module.
 */
export function buildPdpPurchaseMetrics(
  product: Pick<Product, 'price' | 'originalPrice' | 'discountPercentage'>,
  selectedVariant: Pick<ProductVariant, 'price'> | undefined,
  lang: Language
): PdpPurchaseMetrics {
  const activePrice =
    selectedVariant && Number.isFinite(selectedVariant.price) && selectedVariant.price >= 0
      ? selectedVariant.price
      : Number.isFinite(product.price) && product.price >= 0
      ? product.price
      : 0;

  const regularPrice =
    Number.isFinite(product.originalPrice) && product.originalPrice > activePrice
      ? product.originalPrice
      : null;

  let discountPercent = 0;
  if (regularPrice !== null && regularPrice > 0) {
    discountPercent = Math.round(((regularPrice - activePrice) / regularPrice) * 100);
  } else if (
    !selectedVariant &&
    typeof product.discountPercentage === 'number' &&
    product.discountPercentage > 0
  ) {
    discountPercent = Math.round(product.discountPercentage);
  }

  return {
    activePrice,
    regularPrice,
    discountPercent,
    isDiscounted: regularPrice !== null || discountPercent > 0,
    formattedActivePrice: `$${formatUsdAmount(activePrice)}`,
    formattedRegularPrice: regularPrice !== null ? `$${formatUsdAmount(regularPrice)}` : null,
    savePercentLabel:
      discountPercent > 0
        ? lang === 'ar'
          ? `وفّر ${discountPercent}%`
          : `Save ${discountPercent}%`
        : null,
  };
}

/**
 * Generates visual miniature thumbnail color swatches with price display ("Black $19", "Silver $19").
 */
export function buildPdpColorSwatches(
  product: Pick<Product, 'colors' | 'images' | 'colorImages' | 'variants'>,
  activePrice: number
): PdpColorSwatch[] {
  const colors = (product.colors || []).filter((c) => c.trim().length > 0);
  if (colors.length === 0) return [];

  const images = (product.images || []).filter(Boolean);
  const fallbackImg = images[0] || '';

  return colors.map((color) => {
    const isLightTone = /silver|white|titanium|beige|starlight|champagne|gold|أبيض|فضي/i.test(
      color
    );
    const mappedColorImage = resolveColorShowcaseImage(product, color);
    const matchedVariant = findVariantForColor(product, color);
    const swatchPrice =
      matchedVariant && Number.isFinite(matchedVariant.price) && matchedVariant.price > 0
        ? matchedVariant.price
        : activePrice;

    return {
      color,
      thumbnailUrl: mappedColorImage || fallbackImg,
      isLightTone: isLightTone && !mappedColorImage,
      formattedPrice: `$${formatUsdAmount(swatchPrice)}`,
    };
  });
}

/**
 * Returns localized Top Selling social-proof banner label and sold count text for the PDP.
 */
export function buildPdpSocialProof(
  product: Pick<Product, 'name' | 'soldCount' | 'isBestSeller' | 'reviewCount' | 'rating' | 'category'>,
  lang: Language
): {
  topSellingLabel: string;
  soldText: string;
  reviewsText: string;
  ratingValue: number;
} {
  const soldText = resolveProductSoldCountLabel(product, lang);
  const count = typeof product.reviewCount === 'number' ? product.reviewCount : 0;
  const rating =
    typeof product.rating === 'number' && Number.isFinite(product.rating)
      ? Math.max(0, Math.min(5, product.rating))
      : 5;

  return {
    topSellingLabel:
      lang === 'ar'
        ? `الأكثر مبيعاً في ${product.category}`
        : `Top Selling in ${product.category}`,
    soldText,
    reviewsText: lang === 'ar' ? `(${count} تقييم)` : `(${count} Reviews)`,
    ratingValue: rating,
  };
}

/**
 * Returns the 3 light-red service feature badges anchored at the bottom of the PDP purchase column.
 */
export function getPdpServiceFeatures(lang: Language): PdpServiceFeature[] {
  if (lang === 'ar') {
    return [
      {
        id: 'express',
        title: 'توصيل سريع',
        subtitle: 'متوفر دائماً، جاهز للشحن الفوري',
      },
      {
        id: 'returns',
        title: 'إرجاع مرن',
        subtitle: 'استبدال أو إرجاع خلال 1–3 أيام',
      },
      {
        id: 'shipping',
        title: 'شحن موثوق',
        subtitle: 'نضمن وصول طلبك بسرعة وأمان',
      },
    ];
  }

  return [
    {
      id: 'express',
      title: 'Express Delivery',
      subtitle: 'Always in stock, ready to ship, faster delivery',
    },
    {
      id: 'returns',
      title: 'Return Eligible',
      subtitle: '1-3 Days Return, View More',
    },
    {
      id: 'shipping',
      title: 'Trusted Shipping',
      subtitle: 'We will make sure to deliver your order within 5 days',
    },
  ];
}
