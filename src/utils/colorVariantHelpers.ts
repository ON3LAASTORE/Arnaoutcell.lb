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
 * Resolves the active main image URL to showcase for a given selected color / variant,
 * falling back cleanly to the primary product image when no dedicated color image is assigned.
 */
export function resolveProductImageForColor(
  product: Pick<Product, 'images' | 'colorImages' | 'variants'>,
  selectedColor?: string,
  selectedVariant?: Pick<ProductVariant, 'image' | 'color' | 'name'>
): string {
  if (selectedVariant?.image) {
    const normalized = normalizeOptionalImage(selectedVariant.image);
    if (normalized) return normalized;
  }

  const explicitColorImage = resolveExplicitColorImage(product, selectedColor);
  if (explicitColorImage) {
    return explicitColorImage;
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
