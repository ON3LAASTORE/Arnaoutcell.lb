import { Product, StoreSettings } from '../types';
import { DEFAULT_STORE_PROFILE_PICTURE } from './storeSettingsHelpers';
import { DEFAULT_FULL_RES_FALLBACK_IMAGE } from './imageResolutionHelpers';

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  length?: number;
  key?: (index: number) => string | null;
}

export const FIRESTORE_WEB_STORAGE_PREFIXES: readonly string[] = [
  'firestore_mutations_',
  'firestore_clients_',
  'firestore_online_state_',
  'firestore_sequence_number_',
  'firestore_primary_lease_',
];

/**
 * Removes legacy Firestore multi-tab WebStorage coordination entries
 * (which can accumulate and trigger localStorage QuotaExceededError / b815 assertions).
 */
export function purgeStaleFirestoreWebStorageKeys(
  storage: StorageLike | undefined | null
): number {
  if (!storage || typeof storage.length !== 'number' || typeof storage.key !== 'function') {
    return 0;
  }

  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    try {
      const k = storage.key(i);
      if (
        typeof k === 'string' &&
        FIRESTORE_WEB_STORAGE_PREFIXES.some((prefix) => k.startsWith(prefix))
      ) {
        keysToRemove.push(k);
      }
    } catch {
      // Ignore storage iteration errors
    }
  }

  let removed = 0;
  for (const key of keysToRemove) {
    try {
      storage.removeItem(key);
      removed += 1;
    } catch {
      // Ignore individual removal failures
    }
  }
  return removed;
}

export const LEGACY_EVICTABLE_KEYS: string[] = [
  'arnaout_cell_products_v1',
  'arnaout_cell_categories_v1',
  'arnaout_cell_brands_v1',
  'arnaout_cell_videos_v1',
  'arnaout_cell_orders_v1',
  'arnaout_cell_settings_v1',
  'arnaout_cell_testimonials_v1',
  'arnaout_cell_cart_v2',
  'arnaout_cell_wishlist_v2',
  'arnaout_search_analytics_v1',
];

export function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { name?: string; code?: number; message?: string };
  if (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  ) {
    return true;
  }
  if (candidate.code === 22 || candidate.code === 1014) {
    return true;
  }
  if (typeof candidate.message === 'string') {
    const lower = candidate.message.toLowerCase();
    return lower.includes('quota') && lower.includes('exceed');
  }
  return false;
}

export interface SafeStorageSetResult {
  ok: boolean;
  recovered: boolean;
  persistedValue?: string;
  reason?: 'quota_exceeded' | 'storage_unavailable';
}

export function safeStorageSetItem(
  storage: StorageLike | undefined | null,
  key: string,
  value: string,
  options?: {
    evictableKeys?: string[];
    onQuotaRecovery?: () => string | null;
  }
): SafeStorageSetResult {
  if (!storage) {
    return { ok: false, recovered: false, reason: 'storage_unavailable' };
  }

  try {
    storage.setItem(key, value);
    return { ok: true, recovered: false, persistedValue: value };
  } catch (err) {
    if (!isQuotaExceededError(err)) {
      return { ok: false, recovered: false, reason: 'storage_unavailable' };
    }

    // Step 1: Purge any leftover Firestore WebStorage keys and legacy disposable keys
    purgeStaleFirestoreWebStorageKeys(storage);
    const evictable = options?.evictableKeys ?? LEGACY_EVICTABLE_KEYS;
    for (const evictKey of evictable) {
      if (evictKey !== key) {
        try {
          storage.removeItem(evictKey);
        } catch {
          // ignore
        }
      }
    }

    try {
      storage.setItem(key, value);
      return { ok: true, recovered: true, persistedValue: value };
    } catch (retryErr) {
      if (!isQuotaExceededError(retryErr)) {
        return { ok: false, recovered: false, reason: 'storage_unavailable' };
      }
    }

    // Step 2: Run optional payload compaction and retry
    if (options?.onQuotaRecovery) {
      try {
        const compacted = options.onQuotaRecovery();
        if (typeof compacted === 'string') {
          storage.setItem(key, compacted);
          return { ok: true, recovered: true, persistedValue: compacted };
        }
      } catch {
        // still over quota
      }
    }

    return { ok: false, recovered: false, reason: 'quota_exceeded' };
  }
}

export function compactStoreSettingsPayload(
  settings: StoreSettings,
  fallbackLogoUrl: string = DEFAULT_STORE_PROFILE_PICTURE,
  maxInlineDataUrlChars = 200_000
): {
  compacted: StoreSettings;
  offloadedLogoDataUrl?: string;
} {
  let offloadedLogoDataUrl: string | undefined;
  let nextLogoUrl = settings.logoUrl;

  if (
    typeof settings.logoUrl === 'string' &&
    settings.logoUrl.startsWith('data:') &&
    settings.logoUrl.length > maxInlineDataUrlChars
  ) {
    offloadedLogoDataUrl = settings.logoUrl;
    nextLogoUrl = fallbackLogoUrl;
  }

  const nextHeroSlides = Array.isArray(settings.heroSlides)
    ? settings.heroSlides.map((slide) => {
        const image =
          typeof slide.image === 'string' &&
          slide.image.startsWith('data:') &&
          slide.image.length > maxInlineDataUrlChars
            ? ''
            : slide.image;
        return {
          ...slide,
          image,
        };
      })
    : settings.heroSlides;

  return {
    compacted: {
      ...settings,
      logoUrl: nextLogoUrl,
      heroSlides: nextHeroSlides,
    },
    offloadedLogoDataUrl,
  };
}

export function compactProductsForStorage(
  products: Product[],
  maxInlineImageChars = 120_000
): Product[] {
  return products.map((product) => {
    const cleanImages = Array.isArray(product.images)
      ? product.images.filter(
          (img) => !(typeof img === 'string' && img.startsWith('data:') && img.length > maxInlineImageChars)
        )
      : [];

    const fallbackImage = DEFAULT_FULL_RES_FALLBACK_IMAGE;

    let cleanColorImages: Record<string, string> | undefined = product.colorImages;
    if (product.colorImages && typeof product.colorImages === 'object') {
      const nextMap: Record<string, string> = {};
      for (const [col, url] of Object.entries(product.colorImages)) {
        if (typeof url === 'string' && !(url.startsWith('data:') && url.length > maxInlineImageChars)) {
          nextMap[col] = url;
        }
      }
      cleanColorImages = nextMap;
    }

    const cleanVariants = Array.isArray(product.variants)
      ? product.variants.map((variant) =>
          typeof variant?.image === 'string' &&
          variant.image.startsWith('data:') &&
          variant.image.length > maxInlineImageChars
            ? { ...variant, image: undefined }
            : variant
        )
      : product.variants;

    return {
      ...product,
      images: cleanImages.length > 0 ? cleanImages : [fallbackImage],
      ...(cleanColorImages ? { colorImages: cleanColorImages } : {}),
      ...(cleanVariants ? { variants: cleanVariants } : {}),
    };
  });
}
