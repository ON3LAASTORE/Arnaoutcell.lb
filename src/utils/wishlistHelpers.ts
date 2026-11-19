import { Language } from '../types';

export interface WishlistButtonCopy {
  label: string;
  ariaLabel: string;
}

/**
 * Safely parses stored wishlist product IDs from localStorage into a deduplicated string array.
 */
export function parseStoredWishlistIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const item of parsed) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          clean.push(trimmed);
        }
      }
    }
    return clean;
  } catch {
    return [];
  }
}

/**
 * Toggles a product ID inside a wishlist array immutably without duplicates.
 */
export function toggleWishlistProductId(
  wishlist: readonly string[],
  productId: string
): string[] {
  const normalizedId = typeof productId === 'string' ? productId.trim() : '';
  if (!normalizedId) {
    return [...wishlist];
  }
  const exists = wishlist.includes(normalizedId);
  if (exists) {
    return wishlist.filter((id) => id !== normalizedId);
  }
  return [...wishlist, normalizedId];
}

/**
 * Returns localized short label (for hover tooltip / title) and full accessible aria-label.
 */
export function getWishlistButtonCopy(
  isFavorited: boolean,
  lang: Language,
  productTitle?: string
): WishlistButtonCopy {
  const shortLabel = isFavorited
    ? lang === 'ar'
      ? 'إزالة من المفضلة'
      : 'Remove from Wishlist'
    : lang === 'ar'
    ? 'إضافة للمفضلة'
    : 'Add to Wishlist';

  const cleanTitle = typeof productTitle === 'string' ? productTitle.trim() : '';
  if (!cleanTitle) {
    return {
      label: shortLabel,
      ariaLabel: shortLabel,
    };
  }

  const ariaLabel = isFavorited
    ? lang === 'ar'
      ? `إزالة ${cleanTitle} من المفضلة`
      : `Remove ${cleanTitle} from Wishlist`
    : lang === 'ar'
    ? `إضافة ${cleanTitle} إلى المفضلة`
    : `Add ${cleanTitle} to Wishlist`;

  return {
    label: shortLabel,
    ariaLabel,
  };
}
