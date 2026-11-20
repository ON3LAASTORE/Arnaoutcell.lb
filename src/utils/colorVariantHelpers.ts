import { Product, ProductVariant } from '../types';
import { DEFAULT_FULL_RES_FALLBACK_IMAGE, resolveFullResolutionImageUrl } from './imageResolutionHelpers';

export interface ColorVariantConfig {
  color: string;
  image?: string;
  price?: number;
  sku?: string;
  stock?: number;
}

function normalizeColorKey(color: string | undefined): string {
  return typeof color === 'string' ? color.trim().toLowerCase() : '';
}

function normalizeOptionalImage(url: string | undefined): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return resolveFullResolutionImageUrl(trimmed) || trimmed;
}

/**
 * Finds a ProductVariant linked to a selected color label (by explicit `color` field or matching `name`).
 */
export function findVariantForColor(
  product: Pick<Product, 'variants'>,
  selectedColor?: string
): ProductVariant | undefined {
  const key = normalizeColorKey(selectedColor);
  if (!key || !Array.isArray(product.variants)) return undefined;

  return product.variants.find((variant) => {
    if (normalizeColorKey(variant.color) === key) return true;
    return normalizeColorKey(variant.name) === key;
  });
}

/**
 * Checks whether a product has any explicit per-color image override configured
 * in `colorImages` or color-linked `variants`.
 */
export function hasExplicitColorImageMap(
  product: Pick<Product, 'colorImages' | 'variants'>
): boolean {
  if (product.colorImages && typeof product.colorImages === 'object') {
    for (const url of Object.values(product.colorImages)) {
      if (typeof url === 'string' && url.trim().length > 0) {
        return true;
      }
    }
  }
  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (
        typeof variant.image === 'string' &&
        variant.image.trim().length > 0 &&
        (variant.id.startsWith('var-color-') || Boolean(variant.color))
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Resolves an explicitly configured custom image URL for a given color label,
 * checking `product.colorImages` first and then color-linked `product.variants`.
 * Returns `undefined` when the color relies on the default main product image.
 */
export function resolveExplicitColorImage(
  product: Pick<Product, 'colorImages' | 'variants'>,
  selectedColor?: string
): string | undefined {
  const key = normalizeColorKey(selectedColor);
  if (!key) return undefined;

  if (product.colorImages && typeof product.colorImages === 'object') {
    for (const [entryColor, entryUrl] of Object.entries(product.colorImages)) {
      if (normalizeColorKey(entryColor) === key) {
        const normalized = normalizeOptionalImage(entryUrl);
        if (normalized) return normalized;
      }
    }
  }

  const matchedVariant = findVariantForColor(product, selectedColor);
  if (matchedVariant?.image) {
    return normalizeOptionalImage(matchedVariant.image);
  }

  return undefined;
}

/**
 * Resolves the showcase image URL for a color swatch / selection on PDP and Quick View:
 * 1. Always uses explicit `product.colorImages` or color-linked `variant.image` when configured.
 * 2. When NO explicit `colorImages` map exists yet and the product has multiple distinct gallery
 *    images for multiple colors, matches by distinctive color keyword in URL or by color index.
 * Returns `undefined` if no dedicated or distinct color image applies.
 */
export function resolveColorShowcaseImage(
  product: Pick<Product, 'colors' | 'images' | 'colorImages' | 'variants'>,
  selectedColor?: string
): string | undefined {
  const explicit = resolveExplicitColorImage(product, selectedColor);
  if (explicit) return explicit;

  if (hasExplicitColorImageMap(product)) return undefined;

  const cleanKey = normalizeColorKey(selectedColor);
  if (!cleanKey) return undefined;

  const cleanColors = Array.isArray(product.colors)
    ? product.colors.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : [];
  const distinctImages: string[] = [];
  const seenImages = new Set<string>();
  for (const rawImg of Array.isArray(product.images) ? product.images : []) {
    const norm = normalizeOptionalImage(rawImg);
    if (norm && !seenImages.has(norm)) {
      seenImages.add(norm);
      distinctImages.push(norm);
    }
  }

  if (cleanColors.length <= 1 || distinctImages.length <= 1) {
    return undefined;
  }

  // Only match URL tokens that distinguish images (present in some but not all gallery URLs)
  const rawTokens = cleanKey.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  const discriminatingTokens = rawTokens.filter((token) => {
    const matchCount = distinctImages.filter((url) => url.toLowerCase().includes(token)).length;
    return matchCount > 0 && matchCount < distinctImages.length;
  });

  if (discriminatingTokens.length > 0) {
    let bestUrl: string | undefined;
    let bestScore = 0;
    let isTie = false;
    for (const imgUrl of distinctImages) {
      const lowerUrl = imgUrl.toLowerCase();
      const score = discriminatingTokens.reduce(
        (acc, tok) => (lowerUrl.includes(tok) ? acc + 1 : acc),
        0
      );
      if (score > bestScore) {
        bestScore = score;
        bestUrl = imgUrl;
        isTie = false;
      } else if (score > 0 && score === bestScore) {
        isTie = true;
      }
    }
    if (bestUrl && !isTie) {
      return bestUrl;
    }
  }

  const colorIdx = cleanColors.findIndex((c) => normalizeColorKey(c) === cleanKey);
  if (colorIdx >= 0 && colorIdx < distinctImages.length) {
    return distinctImages[colorIdx];
  }

  return undefined;
}

/**
 * Resolves the active main image URL to showcase for a given selected color / variant,
 * falling back cleanly to the primary product image when no dedicated color image is assigned.
 */
export function resolveProductImageForColor(
  product: Pick<Product, 'colors' | 'images' | 'colorImages' | 'variants'>,
  selectedColor?: string,
  selectedVariant?: Pick<ProductVariant, 'image' | 'color' | 'name'>
): string {
  if (selectedVariant?.image) {
    const normalized = normalizeOptionalImage(selectedVariant.image);
    if (normalized) return normalized;
  }

  const showcaseImage = resolveColorShowcaseImage(product, selectedColor);
  if (showcaseImage) {
    return showcaseImage;
  }

  const fallbackFirst = Array.isArray(product.images)
    ? product.images.find((img) => typeof img === 'string' && img.trim().length > 0)
    : undefined;

  return normalizeOptionalImage(fallbackFirst) || DEFAULT_FULL_RES_FALLBACK_IMAGE;
}

/**
 * Hydrates editable color variant rows for the Admin Add/Edit Product modal
 * from `product.colors`, `product.colorImages`, and `product.variants`.
 */
export function buildColorVariantConfigs(
  product: Pick<Product, 'colors' | 'colorImages' | 'variants'>
): ColorVariantConfig[] {
  const configs: ColorVariantConfig[] = [];
  const seenKeys = new Set<string>();

  const rawColors = Array.isArray(product.colors) ? product.colors : [];
  for (const rawColor of rawColors) {
    if (typeof rawColor !== 'string') continue;
    const trimmed = rawColor.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seenKeys.has(key)) continue;
    seenKeys.add(key);

    const matchedVariant = findVariantForColor(product, trimmed);
    const explicitImage = resolveExplicitColorImage(product, trimmed);

    configs.push({
      color: trimmed,
      ...(explicitImage ? { image: explicitImage } : {}),
      ...(matchedVariant && Number.isFinite(matchedVariant.price)
        ? { price: matchedVariant.price }
        : {}),
      ...(matchedVariant?.sku ? { sku: matchedVariant.sku } : {}),
      ...(matchedVariant && Number.isFinite(matchedVariant.stock)
        ? { stock: matchedVariant.stock }
        : {}),
    });
  }

  // Also include any color-linked variants or colorImages keys missing from `colors`
  if (product.colorImages && typeof product.colorImages === 'object') {
    for (const [colorKey, url] of Object.entries(product.colorImages)) {
      const trimmed = colorKey.trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seenKeys.has(key)) continue;
      seenKeys.add(key);
      const normalized = normalizeOptionalImage(url);
      configs.push({
        color: trimmed,
        ...(normalized ? { image: normalized } : {}),
      });
    }
  }

  return configs;
}

/**
 * Extracts normalized `colors`, `colorImages`, and updated `variants` from Admin color variant rows,
 * while preserving backward compatibility for any non-color product variants (e.g. storage tiers).
 */
export function extractProductColorData(
  configs: readonly ColorVariantConfig[],
  baseDefaults: {
    price: number;
    sku: string;
    stock: number;
  },
  existingVariants?: readonly ProductVariant[]
): {
  colors: string[];
  colorImages: Record<string, string>;
  variants: ProductVariant[];
} {
  const colors: string[] = [];
  const colorImages: Record<string, string> = {};
  const colorKeySet = new Set<string>();
  const colorVariants: ProductVariant[] = [];

  for (const row of configs) {
    const cleanColor = typeof row.color === 'string' ? row.color.trim() : '';
    if (!cleanColor) continue;
    const key = cleanColor.toLowerCase();
    if (colorKeySet.has(key)) continue;
    colorKeySet.add(key);
    colors.push(cleanColor);

    const cleanImg = normalizeOptionalImage(row.image);
    if (cleanImg) {
      colorImages[cleanColor] = cleanImg;
    }

    const hasCustomPrice = typeof row.price === 'number' && Number.isFinite(row.price) && row.price > 0;
    const hasCustomSku = typeof row.sku === 'string' && row.sku.trim().length > 0;
    const hasCustomStock = typeof row.stock === 'number' && Number.isFinite(row.stock) && row.stock >= 0;

    if (hasCustomPrice || hasCustomSku || hasCustomStock) {
      const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'color';
      colorVariants.push({
        id: `var-color-${slug}`,
        name: cleanColor,
        color: cleanColor,
        price: hasCustomPrice ? Number(row.price) : Number(baseDefaults.price) || 0,
        sku: hasCustomSku ? row.sku!.trim() : baseDefaults.sku,
        stock: hasCustomStock ? Number(row.stock) : Number(baseDefaults.stock) || 0,
        ...(cleanImg ? { image: cleanImg } : {}),
      });
    }
  }

  const preservedVariants = Array.isArray(existingVariants)
    ? existingVariants.filter((variant) => {
        const vColorKey = normalizeColorKey(variant.color || variant.name);
        return !variant.id.startsWith('var-color-') && !colorKeySet.has(vColorKey);
      })
    : [];

  return {
    colors,
    colorImages,
    variants: [...preservedVariants, ...colorVariants],
  };
}
