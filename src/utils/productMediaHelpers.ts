import { Product } from '../types';
import { isStructuredColorOption } from './colorVariantHelpers';
import { resolveFullResolutionImageUrl } from './imageResolutionHelpers';

/**
 * Removes an image at `index` from a product's gallery array.
 * If index 0 (the primary photo) is removed and more photos remain,
 * the next photo (previously at index 1) automatically becomes index 0 (primary).
 */
export function removeGalleryImageAt(images: readonly string[], index: number): string[] {
  if (!Array.isArray(images)) return [];
  if (index < 0 || index >= images.length) return [...images];
  return images.filter((_, idx) => idx !== index);
}

/**
 * Promotes the photo at `index` to index 0 (the primary storefront photo),
 * keeping the remaining photos in their existing order.
 */
export function setPrimaryGalleryImage(images: readonly string[], index: number): string[] {
  if (!Array.isArray(images) || index <= 0 || index >= images.length) {
    return Array.isArray(images) ? [...images] : [];
  }
  const target = images[index];
  return [target, ...images.filter((_, idx) => idx !== index)];
}

/**
 * Moves a gallery image from `fromIndex` to `toIndex`.
 */
export function moveGalleryImage(
  images: readonly string[],
  fromIndex: number,
  toIndex: number
): string[] {
  if (!Array.isArray(images) || images.length < 2) {
    return Array.isArray(images) ? [...images] : [];
  }
  if (
    fromIndex < 0 ||
    fromIndex >= images.length ||
    toIndex < 0 ||
    toIndex >= images.length ||
    fromIndex === toIndex
  ) {
    return [...images];
  }
  const next = [...images];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Collects all normalized image URLs referenced on a product across gallery images,
 * color swatches/maps, and variant records.
 */
export function extractAllProductMediaUrls(product: Partial<Product> | null | undefined): string[] {
  if (!product) return [];
  const collected = new Set<string>();

  const add = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const resolved = resolveFullResolutionImageUrl(trimmed) || trimmed;
    collected.add(resolved);
  };

  if (Array.isArray(product.images)) {
    for (const img of product.images) add(img);
  }
  if (Array.isArray(product.colors)) {
    for (const color of product.colors) {
      if (isStructuredColorOption(color) && color.imageUrl) {
        add(color.imageUrl);
      }
    }
  }
  if (product.colorImages && typeof product.colorImages === 'object') {
    for (const url of Object.values(product.colorImages)) {
      add(url);
    }
  }
  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      add(variant?.image);
    }
  }

  return Array.from(collected);
}

/**
 * Returns only the media URLs present on `previousProduct` that are no longer
 * referenced anywhere on `nextProduct`.
 */
export function collectRemovedMediaUrls(
  previousProduct: Partial<Product> | null | undefined,
  nextProduct: Partial<Product> | null | undefined
): string[] {
  if (!previousProduct) return [];
  const prevUrls = extractAllProductMediaUrls(previousProduct);
  if (prevUrls.length === 0) return [];
  const nextSet = new Set(extractAllProductMediaUrls(nextProduct));
  return prevUrls.filter((url) => !nextSet.has(url));
}

/**
 * Identifies URLs stored inside Firebase Cloud Storage (`firebasestorage.googleapis.com`,
 * `*.firebasestorage.app`, or `gs://`) so external HTTP URLs and inline `data:` blobs are skipped.
 */
export function isFirebaseStorageUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:')) return false;
  if (trimmed.startsWith('gs://')) return true;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'firebasestorage.googleapis.com' ||
      host.endsWith('.firebasestorage.app') ||
      (host === 'storage.googleapis.com' && parsed.pathname.includes('/o/'))
    );
  } catch {
    return false;
  }
}
