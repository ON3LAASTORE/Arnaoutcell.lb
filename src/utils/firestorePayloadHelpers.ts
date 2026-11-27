import { DEFAULT_FULL_RES_FALLBACK_IMAGE, resolveFullResolutionImageUrl } from './imageResolutionHelpers';

/**
 * Firestore enforces a hard limit of 1,048,576 bytes (~1 MiB) per document.
 * We target a conservative 750,000-byte UTF-8 ceiling so document field names,
 * internal Firestore metadata encoding overhead, and index entries never breach 1 MiB.
 */
export const FIRESTORE_MAX_DOCUMENT_BYTES = 1_048_576;
export const FIRESTORE_SAFE_PRODUCT_MAX_BYTES = 750_000;
export const FIRESTORE_MAX_INLINE_IMAGE_CHARS = 180_000;
export const FIRESTORE_MAX_IMAGES_COUNT = 20;

const UTF8_ENCODER = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

export function getUtf8ByteLength(text: string): number {
  if (!text) return 0;
  if (UTF8_ENCODER) {
    return UTF8_ENCODER.encode(text).length;
  }
  // Standard UTF-8 byte-length fallback for non-TextEncoder environments
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

/**
 * Estimates serialized payload byte size in UTF-8, adding a small fixed allowance
 * for Firestore internal document path/field encoding overhead.
 */
export function estimateFirestorePayloadBytes(payload: Record<string, unknown>): number {
  const json = JSON.stringify(payload);
  const keyOverhead = Object.keys(payload).length * 24 + 128;
  return getUtf8ByteLength(json) + keyOverhead;
}

/**
 * Detects Firestore document size limit errors (1,048,576 bytes / 1 MiB).
 */
export function isFirestoreDocumentSizeError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    typeof error === 'string'
      ? error.toLowerCase()
      : error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    msg.includes('exceeds the maximum allowed size') ||
    msg.includes('1,048,576') ||
    msg.includes('1048576') ||
    msg.includes('maximum allowed size of') ||
    (msg.includes('document') && msg.includes('too large'))
  );
}

/**
 * Normalizes product image entries and excludes oversized inline Base64 data URIs
 * that would exceed Firestore's 1 MiB document ceiling.
 */
export function sanitizeProductImagesForFirestore(
  images: unknown,
  options?: {
    maxInlineImageChars?: number;
    maxImagesCount?: number;
    fallbackImage?: string;
    stripAllDataUrls?: boolean;
    allowEmpty?: boolean;
  }
): { images: string[]; strippedOversizedCount: number } {
  const maxInlineChars = options?.maxInlineImageChars ?? FIRESTORE_MAX_INLINE_IMAGE_CHARS;
  const maxImagesCount = options?.maxImagesCount ?? FIRESTORE_MAX_IMAGES_COUNT;
  const fallbackImage = options?.fallbackImage ?? DEFAULT_FULL_RES_FALLBACK_IMAGE;
  const stripAllDataUrls = options?.stripAllDataUrls === true;
  const allowEmpty = options?.allowEmpty === true;

  if (!Array.isArray(images)) {
    return { images: allowEmpty ? [] : [fallbackImage], strippedOversizedCount: 0 };
  }

  let strippedOversizedCount = 0;
  const validImages: string[] = [];
  const seen = new Set<string>();

  for (const rawImg of images.slice(0, maxImagesCount)) {
    if (typeof rawImg !== 'string') continue;
    const trimmed = rawImg.trim();
    if (!trimmed) continue;

    const resolved = resolveFullResolutionImageUrl(trimmed) || trimmed;
    const isDataUrl = resolved.startsWith('data:');

    if (isDataUrl && (stripAllDataUrls || resolved.length > maxInlineChars)) {
      strippedOversizedCount++;
      continue;
    }

    if (!seen.has(resolved)) {
      seen.add(resolved);
      validImages.push(resolved);
    }
  }

  if (validImages.length === 0) {
    if (allowEmpty && strippedOversizedCount === 0) {
      return {
        images: [],
        strippedOversizedCount: 0,
      };
    }
    return {
      images: [fallbackImage],
      strippedOversizedCount,
    };
  }

  return {
    images: validImages,
    strippedOversizedCount,
  };
}

/**
 * Normalizes per-color image map entries and removes oversized Base64 data URIs.
 */
export function sanitizeColorImagesForFirestore(
  colorImages: unknown,
  options?: {
    maxInlineImageChars?: number;
    maxEntries?: number;
    stripAllDataUrls?: boolean;
  }
): { colorImages: Record<string, string>; strippedCount: number } {
  if (!colorImages || typeof colorImages !== 'object' || Array.isArray(colorImages)) {
    return { colorImages: {}, strippedCount: 0 };
  }

  const maxInlineChars = options?.maxInlineImageChars ?? FIRESTORE_MAX_INLINE_IMAGE_CHARS;
  const maxEntries = options?.maxEntries ?? 25;
  const stripAllDataUrls = options?.stripAllDataUrls === true;

  const cleanMap: Record<string, string> = {};
  let strippedCount = 0;

  for (const [rawKey, rawVal] of Object.entries(colorImages as Record<string, unknown>).slice(0, maxEntries)) {
    const cleanKey = rawKey.trim().slice(0, 64);
    if (!cleanKey || typeof rawVal !== 'string') continue;
    const trimmedVal = rawVal.trim();
    if (!trimmedVal) continue;

    const resolved = resolveFullResolutionImageUrl(trimmedVal) || trimmedVal;
    const isDataUrl = resolved.startsWith('data:');
    if (isDataUrl && (stripAllDataUrls || resolved.length > maxInlineChars)) {
      strippedCount++;
      continue;
    }

    cleanMap[cleanKey] = resolved;
  }

  return { colorImages: cleanMap, strippedCount };
}

/**
 * Normalizes product `colors` array (supporting both legacy string[] and structured ProductColorOption[]),
 * capping strings and removing oversized inline Base64 data URIs inside `imageUrl`.
 */
export function sanitizeProductColorsForFirestore(
  colors: unknown,
  options?: {
    maxInlineImageChars?: number;
    maxEntries?: number;
    stripAllDataUrls?: boolean;
  }
): { colors: Array<string | Record<string, unknown>>; strippedCount: number } {
  if (!Array.isArray(colors)) {
    return { colors: [], strippedCount: 0 };
  }

  const maxInlineChars = options?.maxInlineImageChars ?? FIRESTORE_MAX_INLINE_IMAGE_CHARS;
  const maxEntries = options?.maxEntries ?? 30;
  const stripAllDataUrls = options?.stripAllDataUrls === true;
  const cleanList: Array<string | Record<string, unknown>> = [];
  let strippedCount = 0;

  for (const entry of colors.slice(0, maxEntries)) {
    if (typeof entry === 'string') {
      const clean = entry.trim().slice(0, 80);
      if (clean) cleanList.push(clean);
      continue;
    }

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const raw = entry as Record<string, unknown>;
    const cleanName = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '';
    if (!cleanName) continue;

    const cleanId =
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim().slice(0, 128)
        : `color-${cleanList.length + 1}`;

    let cleanImgUrl = '';
    if (typeof raw.imageUrl === 'string' && raw.imageUrl.trim()) {
      const resolved = resolveFullResolutionImageUrl(raw.imageUrl.trim()) || raw.imageUrl.trim();
      const isDataUrl = resolved.startsWith('data:');
      if (isDataUrl && (stripAllDataUrls || resolved.length > maxInlineChars)) {
        strippedCount++;
        cleanImgUrl = '';
      } else {
        cleanImgUrl = resolved;
      }
    }

    const structured: Record<string, unknown> = {
      id: cleanId,
      name: cleanName,
      imageUrl: cleanImgUrl,
    };

    if (typeof raw.hex === 'string' && raw.hex.trim()) {
      structured.hex = raw.hex.trim().slice(0, 20);
    }

    if (Array.isArray(raw.availableCapacities)) {
      const caps = raw.availableCapacities
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .slice(0, 30)
        .map((c) => c.trim().slice(0, 128));
      if (caps.length > 0) {
        structured.availableCapacities = caps;
      }
    }

    if (
      typeof raw.priceAdjustment === 'number' &&
      Number.isFinite(raw.priceAdjustment) &&
      raw.priceAdjustment >= -100000 &&
      raw.priceAdjustment <= 100000 &&
      raw.priceAdjustment !== 0
    ) {
      structured.priceAdjustment = raw.priceAdjustment;
    }

    cleanList.push(structured);
  }

  return { colors: cleanList, strippedCount };
}

function truncateStringField(val: unknown, maxChars: number): string | undefined {
  if (typeof val !== 'string') return undefined;
  return val.length > maxChars ? val.slice(0, maxChars) : val;
}

/**
 * Guarantees a Firestore product document payload stays safely under the 1 MiB document size ceiling
 * while preserving schema validity required by `isValidProduct` in firestore.rules.
 */
export function enforceFirestoreProductPayloadLimit(
  payload: Record<string, unknown>,
  maxBytes: number = FIRESTORE_SAFE_PRODUCT_MAX_BYTES
): {
  payload: Record<string, unknown>;
  estimatedBytes: number;
  wasCompacted: boolean;
} {
  const working: Record<string, unknown> = { ...payload };
  let wasCompacted = false;

  // Enforce schema string bounds from firebase-blueprint.json / firestore.rules first
  const boundedId = truncateStringField(working.id, 128);
  if (boundedId !== undefined) working.id = boundedId;
  const boundedName = truncateStringField(working.name, 255);
  if (boundedName !== undefined) working.name = boundedName;
  const boundedNameAr = truncateStringField(working.nameAr, 255);
  if (boundedNameAr !== undefined) working.nameAr = boundedNameAr;
  const boundedBrand = truncateStringField(working.brand, 64);
  if (boundedBrand !== undefined) working.brand = boundedBrand;
  const boundedCategory = truncateStringField(working.category, 64);
  if (boundedCategory !== undefined) working.category = boundedCategory;
  const boundedSubcategory = truncateStringField(working.subcategory, 64);
  if (boundedSubcategory !== undefined) working.subcategory = boundedSubcategory;
  const boundedSku = truncateStringField(working.sku, 64);
  if (boundedSku !== undefined) working.sku = boundedSku;
  const boundedBarcode = truncateStringField(working.barcode, 64);
  if (boundedBarcode !== undefined) working.barcode = boundedBarcode;
  const boundedVideoUrl = truncateStringField(working.videoUrl, 512);
  if (boundedVideoUrl !== undefined) working.videoUrl = boundedVideoUrl;
  const boundedDesc = truncateStringField(working.description, 5000);
  if (boundedDesc !== undefined) working.description = boundedDesc;
  const boundedDescAr = truncateStringField(working.descriptionAr, 5000);
  if (boundedDescAr !== undefined) working.descriptionAr = boundedDescAr;

  const allowEmptyImages =
    Array.isArray(working.images) &&
    working.images.filter((img) => typeof img === 'string' && img.trim().length > 0).length === 0;

  // Step 1: Remove any individually oversized Base64 image blobs (>180KB each)
  const sanitizedStep1 = sanitizeProductImagesForFirestore(working.images, {
    maxInlineImageChars: FIRESTORE_MAX_INLINE_IMAGE_CHARS,
    allowEmpty: allowEmptyImages,
  });
  if (sanitizedStep1.strippedOversizedCount > 0) {
    wasCompacted = true;
  }
  working.images = sanitizedStep1.images;

  if (working.colors !== undefined) {
    const sanitizedColorArr1 = sanitizeProductColorsForFirestore(working.colors, {
      maxInlineImageChars: FIRESTORE_MAX_INLINE_IMAGE_CHARS,
    });
    if (sanitizedColorArr1.strippedCount > 0) wasCompacted = true;
    working.colors = sanitizedColorArr1.colors;
  }

  if (working.colorImages !== undefined) {
    const sanitizedColors1 = sanitizeColorImagesForFirestore(working.colorImages, {
      maxInlineImageChars: FIRESTORE_MAX_INLINE_IMAGE_CHARS,
    });
    if (sanitizedColors1.strippedCount > 0) wasCompacted = true;
    working.colorImages = sanitizedColors1.colorImages;
  }

  if (Array.isArray(working.variants)) {
    working.variants = (working.variants as Record<string, unknown>[]).map((v) => {
      if (typeof v?.image === 'string' && v.image.startsWith('data:') && v.image.length > FIRESTORE_MAX_INLINE_IMAGE_CHARS) {
        wasCompacted = true;
        const copy = { ...v };
        delete copy.image;
        return copy;
      }
      return v;
    });
  }

  let currentBytes = estimateFirestorePayloadBytes(working);
  if (currentBytes <= maxBytes) {
    return { payload: working, estimatedBytes: currentBytes, wasCompacted };
  }

  // Step 2: Progressively prune largest inline data URLs if combined array exceeds budget
  wasCompacted = true;
  if (Array.isArray(working.images)) {
    const imgs = [...(working.images as string[])];
    while (estimateFirestorePayloadBytes({ ...working, images: imgs }) > maxBytes && imgs.length > 0) {
      let largestInlineIdx = -1;
      let largestLen = -1;
      for (let i = 0; i < imgs.length; i++) {
        if (typeof imgs[i] === 'string' && imgs[i].startsWith('data:') && imgs[i].length > largestLen) {
          largestLen = imgs[i].length;
          largestInlineIdx = i;
        }
      }
      if (largestInlineIdx >= 0) {
        imgs.splice(largestInlineIdx, 1);
      } else {
        break;
      }
    }
    working.images =
      imgs.length > 0 ? imgs : allowEmptyImages ? [] : [DEFAULT_FULL_RES_FALLBACK_IMAGE];
  }

  currentBytes = estimateFirestorePayloadBytes(working);
  if (currentBytes <= maxBytes) {
    return { payload: working, estimatedBytes: currentBytes, wasCompacted };
  }

  // Step 3: Strip any remaining inline data URLs cleanly (main gallery + per-color maps + variant blobs)
  const sanitizedStep3 = sanitizeProductImagesForFirestore(working.images, {
    stripAllDataUrls: true,
    allowEmpty: allowEmptyImages,
  });
  working.images = sanitizedStep3.images;
  if (working.colors !== undefined) {
    working.colors = sanitizeProductColorsForFirestore(working.colors, {
      stripAllDataUrls: true,
    }).colors;
  }
  if (working.colorImages !== undefined) {
    working.colorImages = sanitizeColorImagesForFirestore(working.colorImages, {
      stripAllDataUrls: true,
    }).colorImages;
  }
  if (Array.isArray(working.variants)) {
    working.variants = (working.variants as Record<string, unknown>[]).map((v) => {
      if (typeof v?.image === 'string' && v.image.startsWith('data:')) {
        const copy = { ...v };
        delete copy.image;
        return copy;
      }
      return v;
    });
  }

  currentBytes = estimateFirestorePayloadBytes(working);
  if (currentBytes <= maxBytes) {
    return { payload: working, estimatedBytes: currentBytes, wasCompacted };
  }

  // Step 4: Trim optional long arrays / text descriptions if payload still exceeds target
  if (Array.isArray(working.images) && working.images.length > 5) {
    working.images = (working.images as string[]).slice(0, 5);
  }
  if (Array.isArray(working.specifications) && working.specifications.length > 25) {
    working.specifications = (working.specifications as unknown[]).slice(0, 25);
  }
  if (Array.isArray(working.variants) && working.variants.length > 20) {
    working.variants = (working.variants as unknown[]).slice(0, 20);
  }
  if (typeof working.description === 'string' && working.description.length > 1500) {
    working.description = working.description.slice(0, 1500);
  }
  if (typeof working.descriptionAr === 'string' && working.descriptionAr.length > 1500) {
    working.descriptionAr = working.descriptionAr.slice(0, 1500);
  }

  currentBytes = estimateFirestorePayloadBytes(working);
  return {
    payload: working,
    estimatedBytes: currentBytes,
    wasCompacted,
  };
}
