import { Product, StoreSettings } from '../types';
import { DEFAULT_STORE_PROFILE_PICTURE } from './storeSettingsHelpers';

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
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

    // Step 1: Evict legacy/disposable keys and retry exact value
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

    const fallbackImage =
      'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800&auto=format&fit=crop&q=80';

    return {
      ...product,
      images: cleanImages.length > 0 ? cleanImages : [fallbackImage],
    };
  });
}
