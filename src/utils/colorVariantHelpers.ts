import {
  Product,
  ProductColorEntry,
  ProductColorOption,
  ProductVariant,
} from '../types';
import {
  DEFAULT_FULL_RES_FALLBACK_IMAGE,
  resolveFullResolutionImageUrl,
} from './imageResolutionHelpers';

export interface ColorVariantConfig {
  id?: string;
  color: string;
  hex?: string;
  image?: string;
  priceAdjustment?: number;
  availableCapacities?: string[];
  price?: number;
  sku?: string;
  stock?: number;
}

export interface CapacityVariantConfig {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
}

function normalizeColorKey(color: string | undefined): string {
  return typeof color === 'string' ? color.trim().toLowerCase() : '';
}

function slugifyColorId(name: string, index?: number): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug) return `color-${slug}`;
  return `color-${(index ?? 0) + 1}`;
}

function normalizeOptionalImage(url: string | undefined): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return resolveFullResolutionImageUrl(trimmed) || trimmed;
}

export function isStructuredColorOption(
  entry: unknown
): entry is ProductColorOption {
  return Boolean(
    entry &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      typeof (entry as ProductColorOption).name === 'string'
  );
}

/**
 * Extracts a clean display name from either a legacy string color or a structured ProductColorOption.
 */
export function getColorEntryName(entry: ProductColorEntry | unknown): string {
  if (typeof entry === 'string') return entry.trim();
  if (isStructuredColorOption(entry)) return entry.name.trim();
  return '';
}

/**
 * Returns deduplicated plain color names from legacy strings, structured ProductColorOption items, and colorImages.
 */
export function getProductColorNames(
  product: Pick<Product, 'colors' | 'colorImages'>
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  if (Array.isArray(product.colors)) {
    for (const entry of product.colors) {
      const clean = getColorEntryName(entry);
      const key = normalizeColorKey(clean);
      if (clean && !seen.has(key)) {
        seen.add(key);
        names.push(clean);
      }
    }
  }

  if (names.length === 0 && product.colorImages && typeof product.colorImages === 'object') {
    for (const rawKey of Object.keys(product.colorImages)) {
      const clean = rawKey.trim();
      const key = normalizeColorKey(clean);
      if (clean && !seen.has(key)) {
        seen.add(key);
        names.push(clean);
      }
    }
  }

  return names;
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
 * in structured `colors[].imageUrl`, `colorImages`, or color-linked `variants`.
 */
export function hasExplicitColorImageMap(
  product: Pick<Product, 'colors' | 'colorImages' | 'variants'>
): boolean {
  if (Array.isArray(product.colors)) {
    for (const entry of product.colors) {
      if (
        isStructuredColorOption(entry) &&
        typeof entry.imageUrl === 'string' &&
        entry.imageUrl.trim().length > 0
      ) {
        return true;
      }
    }
  }
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
 * checking structured `product.colors[].imageUrl`, `product.colorImages`, and color-linked `product.variants`.
 * Returns `undefined` when the color relies on the default main product image.
 */
export function resolveExplicitColorImage(
  product: Pick<Product, 'colors' | 'colorImages' | 'variants'>,
  selectedColor?: string
): string | undefined {
  const key = normalizeColorKey(selectedColor);
  if (!key) return undefined;

  if (Array.isArray(product.colors)) {
    for (const entry of product.colors) {
      if (isStructuredColorOption(entry) && normalizeColorKey(entry.name) === key) {
        const normalized = normalizeOptionalImage(entry.imageUrl);
        if (normalized) return normalized;
      }
    }
  }

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
 * 1. Always uses explicit structured `colors[].imageUrl`, `product.colorImages`, or color-linked `variant.image`.
 * 2. When NO explicit map exists yet and the product has multiple distinct gallery images for multiple colors,
 *    matches by distinctive color keyword in URL or by color index.
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

  const cleanColors = getProductColorNames(product);
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
 * Normalizes a product's color definitions (structured ProductColorOption[] or legacy string[] + colorImages)
 * into a canonical array of ProductColorOption records for storefront swatches & calculations.
 */
export function getProductColorOptions(
  product: Pick<Product, 'colors' | 'images' | 'colorImages' | 'variants'>
): ProductColorOption[] {
  const options: ProductColorOption[] = [];
  const seenKeys = new Set<string>();
  const rawColors = Array.isArray(product.colors) ? product.colors : [];

  rawColors.forEach((entry, index) => {
    if (isStructuredColorOption(entry)) {
      const name = entry.name.trim();
      const key = normalizeColorKey(name);
      if (!name || seenKeys.has(key)) return;
      seenKeys.add(key);

      const resolvedImg =
        normalizeOptionalImage(entry.imageUrl) ||
        resolveColorShowcaseImage(product, name) ||
        '';
      const availableCapacities = Array.isArray(entry.availableCapacities)
        ? entry.availableCapacities
            .filter((capId): capId is string => typeof capId === 'string' && capId.trim().length > 0)
            .map((capId) => capId.trim())
        : undefined;
      const priceAdjustment =
        typeof entry.priceAdjustment === 'number' && Number.isFinite(entry.priceAdjustment)
          ? entry.priceAdjustment
          : 0;

      options.push({
        id:
          typeof entry.id === 'string' && entry.id.trim()
            ? entry.id.trim()
            : slugifyColorId(name, index),
        name,
        ...(typeof entry.hex === 'string' && entry.hex.trim()
          ? { hex: entry.hex.trim() }
          : {}),
        imageUrl: resolvedImg,
        ...(availableCapacities && availableCapacities.length > 0
          ? { availableCapacities }
          : {}),
        ...(priceAdjustment !== 0 ? { priceAdjustment } : {}),
      });
      return;
    }

    if (typeof entry === 'string') {
      const name = entry.trim();
      const key = normalizeColorKey(name);
      if (!name || seenKeys.has(key)) return;
      seenKeys.add(key);

      const resolvedImg = resolveColorShowcaseImage(product, name) || '';
      options.push({
        id: slugifyColorId(name, index),
        name,
        imageUrl: resolvedImg,
      });
    }
  });

  // Include any orphaned colorImages entries if colors array didn't list them
  if (product.colorImages && typeof product.colorImages === 'object') {
    for (const [colorKey, rawUrl] of Object.entries(product.colorImages)) {
      const name = colorKey.trim();
      const key = normalizeColorKey(name);
      if (!name || seenKeys.has(key)) continue;
      seenKeys.add(key);
      const resolvedImg = normalizeOptionalImage(rawUrl) || '';
      options.push({
        id: slugifyColorId(name, options.length),
        name,
        imageUrl: resolvedImg,
      });
    }
  }

  return options;
}

/**
 * Checks whether a capacity variant ID is allowed for a given color option.
 * Defaults to true when availableCapacities is empty or unspecified.
 */
export function isCapacityAvailableForColor(
  capacityId: string,
  colorOption?: Pick<ProductColorOption, 'availableCapacities'>
): boolean {
  if (
    !colorOption ||
    !Array.isArray(colorOption.availableCapacities) ||
    colorOption.availableCapacities.length === 0
  ) {
    return true;
  }
  return colorOption.availableCapacities.includes(capacityId);
}

/**
 * Given a list of capacity options, the current selected capacity ID, and a newly selected color,
 * preserves the current capacity if allowed or automatically falls back to the first allowed capacity.
 */
export function resolveAllowedCapacityForColor<T extends { id: string }>(
  capacityOptions: readonly T[],
  currentCapacityId: string | undefined,
  colorOption?: Pick<ProductColorOption, 'availableCapacities'>
): T | undefined {
  if (capacityOptions.length === 0) return undefined;
  const current = capacityOptions.find((opt) => opt.id === currentCapacityId);
  if (current && isCapacityAvailableForColor(current.id, colorOption)) {
    return current;
  }
  const firstAllowed = capacityOptions.find((opt) =>
    isCapacityAvailableForColor(opt.id, colorOption)
  );
  return firstAllowed || capacityOptions[0];
}

/**
 * Computes unit price combining active capacity/base price and any selected color priceAdjustment.
 */
export function calculateVariantUnitPrice(
  baseCapacityPrice: number,
  colorOption?: Pick<ProductColorOption, 'priceAdjustment'>,
  explicitAdjustment?: number
): number {
  const safeBase =
    typeof baseCapacityPrice === 'number' && Number.isFinite(baseCapacityPrice) && baseCapacityPrice >= 0
      ? baseCapacityPrice
      : 0;
  const rawAdj =
    typeof explicitAdjustment === 'number' && Number.isFinite(explicitAdjustment)
      ? explicitAdjustment
      : typeof colorOption?.priceAdjustment === 'number' &&
        Number.isFinite(colorOption.priceAdjustment)
      ? colorOption.priceAdjustment
      : 0;
  return Math.max(0, Math.round((safeBase + rawAdj) * 100) / 100);
}

/**
 * Hydrates non-color Capacity / Storage variants for the Admin modal editor.
 */
export function buildCapacityVariantConfigs(
  product: Pick<Product, 'variants' | 'price' | 'sku' | 'stock'>
): CapacityVariantConfig[] {
  if (!Array.isArray(product.variants)) return [];
  const basePrice = Number(product.price) || 0;
  const baseStock = Number(product.stock) || 0;
  const baseSku = product.sku || '';

  return product.variants
    .filter((v) => !v.id.startsWith('var-color-') && !v.color)
    .map((v, idx) => ({
      id: v.id || `var-cap-${idx + 1}`,
      name: v.name || '',
      price: Number.isFinite(Number(v.price)) ? Number(v.price) : basePrice,
      stock: Number.isFinite(Number(v.stock)) ? Number(v.stock) : baseStock,
      sku: v.sku || baseSku,
    }));
}

/**
 * Hydrates editable color variant rows for the Admin Add/Edit Product modal
 * from `product.colors` (strings or structured objects), `product.colorImages`, and `product.variants`.
 */
export function buildColorVariantConfigs(
  product: Pick<Product, 'colors' | 'colorImages' | 'variants'>
): ColorVariantConfig[] {
  const configs: ColorVariantConfig[] = [];
  const seenKeys = new Set<string>();

  const rawColors = Array.isArray(product.colors) ? product.colors : [];
  for (const rawColor of rawColors) {
    if (isStructuredColorOption(rawColor)) {
      const trimmed = rawColor.name.trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seenKeys.has(key)) continue;
      seenKeys.add(key);

      const matchedVariant = findVariantForColor(product, trimmed);
      const explicitImage =
        normalizeOptionalImage(rawColor.imageUrl) ||
        resolveExplicitColorImage(product, trimmed);

      configs.push({
        ...(rawColor.id ? { id: rawColor.id } : {}),
        color: trimmed,
        ...(rawColor.hex ? { hex: rawColor.hex } : {}),
        ...(explicitImage ? { image: explicitImage } : {}),
        ...(typeof rawColor.priceAdjustment === 'number' &&
        Number.isFinite(rawColor.priceAdjustment)
          ? { priceAdjustment: rawColor.priceAdjustment }
          : {}),
        ...(Array.isArray(rawColor.availableCapacities) &&
        rawColor.availableCapacities.length > 0
          ? { availableCapacities: [...rawColor.availableCapacities] }
          : {}),
        ...(matchedVariant && Number.isFinite(matchedVariant.price)
          ? { price: matchedVariant.price }
          : {}),
        ...(matchedVariant?.sku ? { sku: matchedVariant.sku } : {}),
        ...(matchedVariant && Number.isFinite(matchedVariant.stock)
          ? { stock: matchedVariant.stock }
          : {}),
      });
      continue;
    }

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

  // Also include any colorImages keys missing from `colors`
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
 * Extracts normalized legacy `colors` (string[]), `colorImages`, and updated `variants`
 * from Admin color variant rows, while preserving non-color variants.
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

    const hasCustomPrice =
      typeof row.price === 'number' && Number.isFinite(row.price) && row.price > 0;
    const hasCustomSku = typeof row.sku === 'string' && row.sku.trim().length > 0;
    const hasCustomStock =
      typeof row.stock === 'number' && Number.isFinite(row.stock) && row.stock >= 0;

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

/**
 * Extracts structured `ProductColorOption[]` records, synced `colorImages`, and clean RAM/ROM `variants`
 * from Admin Dashboard form rows.
 */
export function extractStructuredProductVariantsAndColors(
  colorRows: readonly ColorVariantConfig[],
  capacityRows: readonly CapacityVariantConfig[],
  baseDefaults: {
    price: number;
    sku: string;
    stock: number;
  }
): {
  colors: ProductColorOption[];
  colorImages: Record<string, string>;
  variants: ProductVariant[];
} {
  const validCapacityVariants: ProductVariant[] = [];
  const validCapacityIdSet = new Set<string>();

  capacityRows.forEach((cap, idx) => {
    const cleanName = typeof cap.name === 'string' ? cap.name.trim() : '';
    if (!cleanName) return;
    const cleanId =
      typeof cap.id === 'string' && cap.id.trim()
        ? cap.id.trim()
        : `var-cap-${idx + 1}`;
    if (validCapacityIdSet.has(cleanId)) return;
    validCapacityIdSet.add(cleanId);

    validCapacityVariants.push({
      id: cleanId,
      name: cleanName,
      price:
        typeof cap.price === 'number' && Number.isFinite(cap.price) && cap.price >= 0
          ? Number(cap.price)
          : Number(baseDefaults.price) || 0,
      stock:
        typeof cap.stock === 'number' && Number.isFinite(cap.stock) && cap.stock >= 0
          ? Number(cap.stock)
          : Number(baseDefaults.stock) || 0,
      sku:
        typeof cap.sku === 'string' && cap.sku.trim()
          ? cap.sku.trim()
          : baseDefaults.sku,
    });
  });

  const colors: ProductColorOption[] = [];
  const colorImages: Record<string, string> = {};
  const colorVariants: ProductVariant[] = [];
  const seenColorKeys = new Set<string>();

  colorRows.forEach((row, idx) => {
    const cleanColor = typeof row.color === 'string' ? row.color.trim() : '';
    if (!cleanColor) return;
    const key = cleanColor.toLowerCase();
    if (seenColorKeys.has(key)) return;
    seenColorKeys.add(key);

    const cleanId =
      typeof row.id === 'string' && row.id.trim()
        ? row.id.trim()
        : slugifyColorId(cleanColor, idx);
    const cleanImg = normalizeOptionalImage(row.image) || '';
    if (cleanImg) {
      colorImages[cleanColor] = cleanImg;
    }

    const cleanHex =
      typeof row.hex === 'string' && row.hex.trim() ? row.hex.trim() : undefined;
    const priceAdjustment =
      typeof row.priceAdjustment === 'number' && Number.isFinite(row.priceAdjustment)
        ? Number(row.priceAdjustment)
        : 0;
    const filteredCaps = Array.isArray(row.availableCapacities)
      ? row.availableCapacities.filter((capId) => validCapacityIdSet.has(capId))
      : [];

    colors.push({
      id: cleanId,
      name: cleanColor,
      ...(cleanHex ? { hex: cleanHex } : {}),
      imageUrl: cleanImg,
      ...(filteredCaps.length > 0 && filteredCaps.length < validCapacityVariants.length
        ? { availableCapacities: filteredCaps }
        : {}),
      ...(priceAdjustment !== 0 ? { priceAdjustment } : {}),
    });

    const hasCustomPrice =
      typeof row.price === 'number' && Number.isFinite(row.price) && row.price > 0;
    const hasCustomSku = typeof row.sku === 'string' && row.sku.trim().length > 0;
    const hasCustomStock =
      typeof row.stock === 'number' && Number.isFinite(row.stock) && row.stock >= 0;

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
  });

  return {
    colors,
    colorImages,
    variants: [...validCapacityVariants, ...colorVariants],
  };
}

