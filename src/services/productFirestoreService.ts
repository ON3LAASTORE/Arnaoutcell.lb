import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { FirestoreInventoryRecord, Product } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialData';
import {
  DEFAULT_FULL_RES_FALLBACK_IMAGE,
  resolveFullResolutionImageUrl,
} from '../utils/imageResolutionHelpers';
import {
  classifyFirestoreError,
  isFirestoreInQuotaCooldown,
  isFirestoreQuotaExceededError,
  markFirestoreQuotaExceeded,
  shouldLogFirestoreQuotaWarning,
} from '../utils/firestoreQuotaHelpers';
import {
  enforceFirestoreProductPayloadLimit,
  isFirestoreDocumentSizeError,
  sanitizeColorImagesForFirestore,
  sanitizeProductColorsForFirestore,
  sanitizeProductImagesForFirestore,
} from '../utils/firestorePayloadHelpers';
import { sanitizeProductReviewsForStorage } from '../utils/checkoutHelpers';
import { storefrontCache } from '../utils/storefrontCacheHelpers';
import {
  emitPermissionDenied,
  inferPermissionDeniedFromFirestoreError,
  isFirestorePermissionDeniedError,
} from '../utils/permissionDeniedHelpers';
import {
  CatalogOverlayRecord,
  mergeCatalogProducts,
} from '../utils/catalogMergeHelpers';
import { sanitizeProductId } from '../utils/adminProductFormHelpers';

const PRODUCTS_COLLECTION = 'products';
const INVENTORY_COLLECTION = 'inventory';
const LOCAL_PRODUCTS_STORAGE_KEY = 'arnaout_cell_products_v2';
const LOCAL_DELETED_PRODUCTS_KEY = 'arnaout_cell_deleted_product_ids_v1';

export interface PersistProductResult {
  persisted: boolean;
  status: 'saved' | 'skipped_unauthenticated' | 'skipped_quota' | 'error';
  errorMessage?: string;
}

function readPersistedLocalDeletedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_DELETED_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function readPersistedLocalProducts(): Product[] {
  const byId = new Map<string, Product>();
  const cached = storefrontCache.readEntry<Product[]>('products')?.data;
  if (Array.isArray(cached)) {
    for (const item of cached) {
      if (item?.id && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(LOCAL_PRODUCTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed as Product[]) {
            if (item?.id && !byId.has(item.id)) {
              byId.set(item.id, item);
            }
          }
        }
      }
    } catch {
      // Ignore malformed local storage fallback
    }
  }
  return Array.from(byId.values());
}

export interface ServerCatalogOverlayState {
  records: CatalogOverlayRecord[];
  deletedIds: string[];
  loaded: boolean;
}

let serverOverlayState: ServerCatalogOverlayState = {
  records: [],
  deletedIds: [],
  loaded: false,
};
let inFlightOverlayFetch: Promise<ServerCatalogOverlayState> | null = null;

export function getCachedServerCatalogOverlay(): ServerCatalogOverlayState {
  return serverOverlayState;
}

export function upsertLocalServerOverlayRecord(
  product: Product,
  syncedToFirestore: boolean = false
): void {
  const nextRecord: CatalogOverlayRecord = {
    product,
    updatedAtMs: Date.now(),
    syncedToFirestore,
  };
  const nextRecords = [
    nextRecord,
    ...serverOverlayState.records.filter((r) => r.product.id !== product.id),
  ];
  serverOverlayState = {
    records: nextRecords,
    deletedIds: serverOverlayState.deletedIds.filter((id) => id !== product.id),
    loaded: true,
  };
}

export function removeLocalServerOverlayRecord(productId: string): void {
  const cleanId = (productId || '').trim();
  if (!cleanId) return;
  serverOverlayState = {
    records: serverOverlayState.records.filter((r) => r.product.id !== cleanId),
    deletedIds: Array.from(new Set([cleanId, ...serverOverlayState.deletedIds])),
    loaded: true,
  };
}

export async function fetchServerCatalogOverlay(
  force: boolean = false
): Promise<ServerCatalogOverlayState> {
  if (typeof fetch === 'undefined' || typeof window === 'undefined') {
    return serverOverlayState;
  }
  if (!force && serverOverlayState.loaded && !inFlightOverlayFetch) {
    return serverOverlayState;
  }
  if (inFlightOverlayFetch) {
    return inFlightOverlayFetch;
  }

  inFlightOverlayFetch = (async (): Promise<ServerCatalogOverlayState> => {
    try {
      const response = await fetch('/api/catalog/products', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        return serverOverlayState;
      }
      const data = (await response.json()) as {
        success?: boolean;
        records?: CatalogOverlayRecord[];
        deletedIds?: string[];
      };
      if (data?.success && Array.isArray(data.records)) {
        serverOverlayState = {
          records: data.records,
          deletedIds: Array.isArray(data.deletedIds) ? data.deletedIds : [],
          loaded: true,
        };
      }
      return serverOverlayState;
    } catch {
      return serverOverlayState;
    } finally {
      inFlightOverlayFetch = null;
    }
  })();

  return inFlightOverlayFetch;
}

export interface ProductSyncMetadata {
  fromCache: boolean;
  hasPendingWrites: boolean;
  isConnecting: boolean;
  hasServerError: boolean;
  isQuotaLimited: boolean;
  lastSyncedAt: Date | null;
}

let currentSyncMeta: ProductSyncMetadata = {
  fromCache: isFirestoreInQuotaCooldown(),
  hasPendingWrites: false,
  isConnecting: false,
  hasServerError: false,
  isQuotaLimited: isFirestoreInQuotaCooldown(),
  lastSyncedAt: null,
};

const syncMetaListeners = new Set<(meta: ProductSyncMetadata) => void>();
const singleProductInFlight = new Map<string, Promise<Product | null>>();
let seedingPromise: Promise<void> | null = null;

function updateSyncMeta(patch: Partial<ProductSyncMetadata>): void {
  currentSyncMeta = { ...currentSyncMeta, ...patch };
  syncMetaListeners.forEach((listener) => {
    try {
      listener(currentSyncMeta);
    } catch {
      // Ignore individual subscriber callback errors
    }
  });
}

export function getProductSyncMeta(): ProductSyncMetadata {
  return currentSyncMeta;
}

export function subscribeToProductSyncMeta(
  listener: (meta: ProductSyncMetadata) => void
): () => void {
  syncMetaListeners.add(listener);
  listener(currentSyncMeta);
  return () => {
    syncMetaListeners.delete(listener);
  };
}

export function mapFirestoreDocToProduct(
  docId: string,
  data: Record<string, unknown>
): Product {
  const firestoreColorImages =
    data.colorImages && typeof data.colorImages === 'object'
      ? sanitizeColorImagesForFirestore(data.colorImages).colorImages
      : {};
  const firestoreColors = Array.isArray(data.colors)
    ? (sanitizeProductColorsForFirestore(data.colors).colors as Product['colors'])
    : [];

  return {
    id: docId,
    name: typeof data.name === 'string' ? data.name : '',
    nameAr: typeof data.nameAr === 'string' ? data.nameAr : '',
    brand: typeof data.brand === 'string' ? data.brand : '',
    category: typeof data.category === 'string' ? data.category : '',
    subcategory: typeof data.subcategory === 'string' ? data.subcategory : '',
    sku: typeof data.sku === 'string' && data.sku ? data.sku : docId,
    barcode: typeof data.barcode === 'string' ? data.barcode : '',
    originalPrice: Number(data.originalPrice) || Number(data.price) || 0,
    price: Number(data.price) || 0,
    discountPercentage: Number(data.discountPercentage) || 0,
    stock: Number.isFinite(Number(data.stock)) ? Math.max(0, Number(data.stock)) : 10,
    lowStockThreshold: Number.isFinite(Number(data.lowStockThreshold))
      ? Math.max(0, Number(data.lowStockThreshold))
      : 3,
    images:
      Array.isArray(data.images) && data.images.length > 0
        ? data.images.map((img: string) => resolveFullResolutionImageUrl(img) || img)
        : [DEFAULT_FULL_RES_FALLBACK_IMAGE],
    videoUrl: typeof data.videoUrl === 'string' && data.videoUrl ? data.videoUrl : undefined,
    description: typeof data.description === 'string' ? data.description : '',
    descriptionAr: typeof data.descriptionAr === 'string' ? data.descriptionAr : '',
    specifications: Array.isArray(data.specifications)
      ? (data.specifications as Product['specifications'])
      : [],
    colors: firestoreColors,
    colorImages: firestoreColorImages,
    variants: Array.isArray(data.variants) ? (data.variants as Product['variants']) : [],
    warrantyMonths:
      Number.isFinite(Number(data.warrantyMonths)) && Number(data.warrantyMonths) >= 0
        ? Number(data.warrantyMonths)
        : 12,
    warrantyTerms:
      typeof data.warrantyTerms === 'string' && data.warrantyTerms ? data.warrantyTerms : undefined,
    isSpecialOffer: Boolean(data.isSpecialOffer),
    offerExpiresAt:
      typeof data.offerExpiresAt === 'string' && data.offerExpiresAt
        ? data.offerExpiresAt
        : undefined,
    isFeatured: Boolean(data.isFeatured),
    isNewArrival: Boolean(data.isNewArrival),
    isBestSeller: Boolean(data.isBestSeller),
    isPublished: data.isPublished !== false,
    rating: Number.isFinite(Number(data.rating)) && Number(data.rating) > 0 ? Number(data.rating) : 5.0,
    reviewCount: Number.isFinite(Number(data.reviewCount))
      ? Math.max(0, Number(data.reviewCount))
      : Array.isArray(data.reviews)
      ? data.reviews.length
      : 0,
    soldCount:
      Number.isFinite(Number(data.soldCount)) && Number(data.soldCount) >= 0
        ? Number(data.soldCount)
        : 0,
    reviews: Array.isArray(data.reviews) ? sanitizeProductReviewsForStorage(data.reviews, 50) : [],
    createdAt: typeof data.createdAt === 'string' && data.createdAt ? data.createdAt : new Date().toISOString(),
  };
}

function mergeCloudWithInitialProducts(
  cloudProducts: Product[],
  overlay: ServerCatalogOverlayState = serverOverlayState,
  baseSeed: Product[] = INITIAL_PRODUCTS,
  localProducts: Product[] = readPersistedLocalProducts()
): Product[] {
  const mergedDeletedIds = Array.from(
    new Set([...(overlay.deletedIds || []), ...readPersistedLocalDeletedIds()])
  );
  return mergeCatalogProducts({
    cloudProducts,
    serverRecords: overlay.records,
    localProducts,
    initialProducts: baseSeed,
    deletedIds: mergedDeletedIds,
  });
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

/**
 * Strips undefined properties and enforces firestore.rules `isValidProduct` bounds.
 */
export function cleanProductForFirestore(product: Product): Record<string, unknown> {
  const safeId = sanitizeProductId(product.id);
  const safeName = (product.name || '').trim().slice(0, 255) || 'Unnamed Product';
  const safeBrand = (product.brand || '').trim().slice(0, 64) || 'ON ALAA STORE';
  const safeCategory = (product.category || '').trim().slice(0, 64) || 'Electronics';
  const safeSku = (product.sku || safeId).trim().slice(0, 64) || safeId.slice(0, 64);
  const safePrice = clampNumber(product.price, 0, 1_000_000, 0);
  const safeOriginalPrice = clampNumber(
    product.originalPrice ?? safePrice,
    0,
    1_000_000,
    safePrice
  );
  const safeImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
          .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
          .slice(0, 30)
          .map((img) => resolveFullResolutionImageUrl(img.trim()) || img.trim())
      : [];

  const data: Record<string, unknown> = {
    id: safeId,
    name: safeName,
    brand: safeBrand,
    category: safeCategory,
    sku: safeSku,
    price: safePrice,
    originalPrice: safeOriginalPrice,
    discountPercentage: Math.round(clampNumber(product.discountPercentage, 0, 100, 0)),
    stock: Math.round(clampNumber(product.stock, 0, 1_000_000, 0)),
    lowStockThreshold: Math.round(clampNumber(product.lowStockThreshold, 0, 100_000, 3)),
    images: safeImages.length > 0 ? safeImages : [DEFAULT_FULL_RES_FALLBACK_IMAGE],
    description:
      (product.description || '').trim().slice(0, 5000) ||
      'Genuine device with official warranty.',
    warrantyMonths: Math.round(clampNumber(product.warrantyMonths, 0, 120, 12)),
    isPublished: product.isPublished !== false,
    rating: clampNumber(product.rating, 0, 5, 5.0),
    reviewCount: Math.round(
      clampNumber(
        product.reviewCount,
        0,
        100_000,
        Array.isArray(product.reviews) ? product.reviews.length : 0
      )
    ),
    soldCount: Math.round(clampNumber(product.soldCount, 0, 1_000_000, 0)),
    createdAt:
      (typeof product.createdAt === 'string' && product.createdAt.trim()
        ? product.createdAt.trim()
        : new Date().toISOString()
      ).slice(0, 64),
  };

  if (Array.isArray(product.reviews) && product.reviews.length > 0) {
    data.reviews = sanitizeProductReviewsForStorage(product.reviews, 50);
  }

  if (product.nameAr && product.nameAr.trim()) data.nameAr = product.nameAr.trim().slice(0, 255);
  if (product.subcategory && product.subcategory.trim()) {
    data.subcategory = product.subcategory.trim().slice(0, 64);
  }
  if (product.barcode && product.barcode.trim()) {
    data.barcode = product.barcode.trim().slice(0, 64);
  }
  if (product.videoUrl && product.videoUrl.trim()) {
    data.videoUrl = product.videoUrl.trim().slice(0, 512);
  }
  if (product.descriptionAr && product.descriptionAr.trim()) {
    data.descriptionAr = product.descriptionAr.trim().slice(0, 5000);
  }
  if (product.warrantyTerms && product.warrantyTerms.trim()) {
    data.warrantyTerms = product.warrantyTerms.trim().slice(0, 2000);
  }
  if (typeof product.isSpecialOffer === 'boolean') data.isSpecialOffer = product.isSpecialOffer;
  if (typeof product.isFeatured === 'boolean') data.isFeatured = product.isFeatured;
  if (typeof product.isNewArrival === 'boolean') data.isNewArrival = product.isNewArrival;
  if (typeof product.isBestSeller === 'boolean') data.isBestSeller = product.isBestSeller;
  if (product.offerExpiresAt && product.offerExpiresAt.trim()) {
    data.offerExpiresAt = product.offerExpiresAt.trim().slice(0, 64);
  }

  if (Array.isArray(product.colors)) {
    data.colors = sanitizeProductColorsForFirestore(product.colors).colors;
  }
  if (product.colorImages && typeof product.colorImages === 'object') {
    const cleanColorImages: Record<string, string> = {};
    for (const [colorName, imageUrl] of Object.entries(product.colorImages)) {
      if (typeof imageUrl === 'string' && imageUrl.trim()) {
        cleanColorImages[colorName.trim()] =
          resolveFullResolutionImageUrl(imageUrl.trim()) || imageUrl.trim();
      }
    }
    data.colorImages = cleanColorImages;
  }
  if (Array.isArray(product.specifications)) {
    data.specifications = product.specifications.slice(0, 60).map((s) => ({
      label: s.label || '',
      value: s.value || '',
      ...(s.group ? { group: s.group } : {}),
    }));
  }
  if (Array.isArray(product.variants)) {
    data.variants = product.variants.slice(0, 50).map((v) => ({
      id: v.id,
      name: v.name,
      price: Number(v.price) || 0,
      stock: Number(v.stock) || 0,
      sku: v.sku || '',
      ...(v.color ? { color: v.color } : {}),
      ...(v.image ? { image: resolveFullResolutionImageUrl(v.image) || v.image } : {}),
    }));
  }

  return data;
}

export async function hydrateProductsWithServerOverlay(
  baseProducts: Product[],
  forceOverlayFetch: boolean = false
): Promise<{ products: Product[]; changed: boolean }> {
  const overlay = await fetchServerCatalogOverlay(forceOverlayFetch);
  const localDeletedIds = readPersistedLocalDeletedIds();
  const mergedDeletedIds = Array.from(
    new Set([...(overlay.deletedIds || []), ...localDeletedIds])
  );
  if (overlay.records.length === 0 && mergedDeletedIds.length === 0) {
    return { products: baseProducts, changed: false };
  }
  const merged = mergeCatalogProducts({
    cloudProducts: baseProducts,
    serverRecords: overlay.records,
    localProducts: baseProducts,
    initialProducts: baseProducts,
    deletedIds: mergedDeletedIds,
  });
  const changed =
    merged.length !== baseProducts.length ||
    merged.some((p, i) => {
      const prev = baseProducts[i];
      return !prev || p.id !== prev.id || p.price !== prev.price || p.stock !== prev.stock || p.name !== prev.name;
    });
  if (changed) {
    storefrontCache.setProducts(merged, 'local');
  }
  return { products: merged, changed };
}

/**
 * Fetches storefront products using shared TTL cache + in-flight request deduplication (`getDocs`),
 * avoiding open-ended real-time `onSnapshot` listeners for static catalog browsing.
 */
export async function fetchStorefrontProducts(options?: {
  forceRefresh?: boolean;
  fallbackProducts?: Product[];
}): Promise<{ products: Product[]; fromCache: boolean; isStale: boolean }> {
  const localPersisted = readPersistedLocalProducts();
  const fallbackList =
    options?.fallbackProducts && options.fallbackProducts.length > 0
      ? options.fallbackProducts
      : localPersisted.length > 0
      ? localPersisted
      : INITIAL_PRODUCTS;

  const result = await storefrontCache.fetchWithCache<Product[]>(
    'products',
    async () => {
      updateSyncMeta({ isConnecting: true, hasServerError: false });
      const overlayPromise = fetchServerCatalogOverlay(Boolean(options?.forceRefresh));

      if (isFirestoreInQuotaCooldown()) {
        const overlay = await overlayPromise.catch(() => serverOverlayState);
        updateSyncMeta({
          fromCache: true,
          hasPendingWrites: false,
          isConnecting: false,
          hasServerError: false,
          isQuotaLimited: true,
        });
        return mergeCloudWithInitialProducts([], overlay, INITIAL_PRODUCTS, fallbackList);
      }

      try {
        const [snapshot, overlay] = await Promise.all([
          getDocs(collection(db, PRODUCTS_COLLECTION)),
          overlayPromise,
        ]);
        const isFromCache = snapshot.metadata.fromCache;

        if (snapshot.empty) {
          if (!isFromCache && !isFirestoreInQuotaCooldown() && auth.currentUser) {
            seedInitialProductsToCloud().catch(() => {});
          }
          updateSyncMeta({
            fromCache: overlay.records.length === 0,
            hasPendingWrites: false,
            isConnecting: false,
            hasServerError: false,
            isQuotaLimited: isFirestoreInQuotaCooldown(),
            ...(isFromCache ? {} : { lastSyncedAt: new Date() }),
          });
          return mergeCloudWithInitialProducts([], overlay, INITIAL_PRODUCTS, fallbackList);
        }

        const cloudProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          cloudProducts.push(
            mapFirestoreDocToProduct(docSnap.id, docSnap.data() as Record<string, unknown>)
          );
        });

        updateSyncMeta({
          fromCache: isFromCache,
          hasPendingWrites: false,
          isConnecting: false,
          hasServerError: false,
          isQuotaLimited: false,
          ...(isFromCache ? {} : { lastSyncedAt: new Date() }),
        });

        return mergeCloudWithInitialProducts(cloudProducts, overlay, INITIAL_PRODUCTS, fallbackList);
      } catch (error) {
        const overlay = await overlayPromise.catch(() => serverOverlayState);
        const category = classifyFirestoreError(error);
        if (category === 'quota') {
          markFirestoreQuotaExceeded();
          updateSyncMeta({
            fromCache: true,
            hasPendingWrites: false,
            isConnecting: false,
            hasServerError: false,
            isQuotaLimited: true,
          });
          if (shouldLogFirestoreQuotaWarning('products')) {
            console.warn('Firestore daily read quota reached; using local storefront catalog cache.');
          }
          return mergeCloudWithInitialProducts([], overlay, INITIAL_PRODUCTS, fallbackList);
        }

        if (category === 'network') {
          updateSyncMeta({
            fromCache: true,
            hasPendingWrites: false,
            isConnecting: false,
            hasServerError: false,
          });
          if (shouldLogFirestoreQuotaWarning('products_network')) {
            console.warn('Storefront products fetch offline; using local catalog cache.');
          }
          return mergeCloudWithInitialProducts([], overlay, INITIAL_PRODUCTS, fallbackList);
        }

        if (category === 'permission') {
          updateSyncMeta({
            fromCache: true,
            hasPendingWrites: false,
            isConnecting: false,
            hasServerError: true,
          });
          console.error('Firestore products read permission notice:', error);
          return mergeCloudWithInitialProducts([], overlay, INITIAL_PRODUCTS, fallbackList);
        }

        updateSyncMeta({
          fromCache: true,
          hasPendingWrites: false,
          isConnecting: false,
          hasServerError: false,
        });
        return mergeCloudWithInitialProducts([], overlay, INITIAL_PRODUCTS, fallbackList);
      }
    },
    {
      forceRefresh: options?.forceRefresh,
      fallbackData: mergeCloudWithInitialProducts([], serverOverlayState, INITIAL_PRODUCTS, fallbackList),
      fallbackSource: 'local',
    }
  );

  // Even on cache hit or quota cooldown short-circuit, merge durable server catalog overlay
  // and locally deleted IDs so newly added/edited/deleted items appear immediately in cold browsers and tabs.
  let productsData = result.data;
  if (result.fromCache || !serverOverlayState.loaded) {
    const hydrated = await hydrateProductsWithServerOverlay(
      productsData,
      Boolean(options?.forceRefresh || !serverOverlayState.loaded)
    );
    productsData = hydrated.products;
  }

  if (result.fromCache) {
    updateSyncMeta({
      fromCache: true,
      isConnecting: false,
      isQuotaLimited: isFirestoreInQuotaCooldown(),
    });
  }

  return {
    products: productsData,
    fromCache: result.fromCache,
    isStale: result.isStale,
  };
}

/**
 * Resolves a single product by ID/SKU/barcode from the shared storefront cache first,
 * only querying Firestore `/products/{productId}` if absent from cache and quota allows.
 */
export async function fetchProductByIdCachedOrCloud(
  productId: string,
  candidateProducts?: Product[]
): Promise<Product | null> {
  const normalized = typeof productId === 'string' ? productId.trim() : '';
  if (!normalized) return null;

  const cachedMatch = storefrontCache.findProduct(normalized, candidateProducts);
  if (cachedMatch) {
    return cachedMatch;
  }

  const overlay = await fetchServerCatalogOverlay();
  if (overlay.deletedIds.includes(normalized)) {
    return null;
  }
  const serverMatch = overlay.records.find(
    (r) =>
      r.product.id === normalized ||
      r.product.sku?.toLowerCase() === normalized.toLowerCase() ||
      r.product.barcode?.toLowerCase() === normalized.toLowerCase()
  );
  if (serverMatch) {
    storefrontCache.upsertProduct(serverMatch.product, 'local');
    return serverMatch.product;
  }

  if (isFirestoreInQuotaCooldown()) {
    return null;
  }

  const existingInFlight = singleProductInFlight.get(normalized);
  if (existingInFlight) {
    return existingInFlight;
  }

  const fetchPromise = (async (): Promise<Product | null> => {
    try {
      const snap = await getDoc(doc(db, PRODUCTS_COLLECTION, normalized));
      if (!snap.exists()) return null;
      const mapped = mapFirestoreDocToProduct(snap.id, snap.data() as Record<string, unknown>);
      storefrontCache.upsertProduct(mapped, 'firestore');
      return mapped;
    } catch (error) {
      if (isFirestoreQuotaExceededError(error)) {
        markFirestoreQuotaExceeded();
        updateSyncMeta({ fromCache: true, isQuotaLimited: true, hasServerError: false });
        if (shouldLogFirestoreQuotaWarning('products')) {
          console.warn('Firestore daily read quota reached; using local storefront catalog cache.');
        }
      }
      return null;
    } finally {
      singleProductInFlight.delete(normalized);
    }
  })();

  singleProductInFlight.set(normalized, fetchPromise);
  return fetchPromise;
}

/**
 * Mirrors warehouse stock level changes to `/inventory/{productId}` for strict
 * Firestore Security Rules enforcement (`super_admin` + `full_stock`).
 */
export async function persistInventoryRecordToCloud(product: Product): Promise<void> {
  if (!auth.currentUser || isFirestoreInQuotaCooldown()) {
    return;
  }

  const recordId = (product.id || '').trim().slice(0, 128);
  if (!/^[a-zA-Z0-9_\-]+$/.test(recordId)) {
    console.warn(`Skipped inventory cloud sync for non-conforming ID "${product.id}".`);
    return;
  }

  const payload: FirestoreInventoryRecord = {
    id: recordId,
    productId: recordId,
    sku: (product.sku || recordId).trim().slice(0, 64) || recordId.slice(0, 64),
    productName:
      (product.name || product.sku || recordId).trim().slice(0, 255) || recordId.slice(0, 255),
    brand: (product.brand || '').trim().slice(0, 64),
    category: (product.category || '').trim().slice(0, 64),
    stock: Math.round(clampNumber(product.stock, 0, 1_000_000, 0)),
    lowStockThreshold: Math.round(clampNumber(product.lowStockThreshold, 0, 100_000, 3)),
    warehouse: 'Chouf Hub',
    updatedByUid: auth.currentUser.uid.slice(0, 128),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, INVENTORY_COLLECTION, recordId), payload, { merge: true });
  } catch (error) {
    if (isFirestoreQuotaExceededError(error)) {
      markFirestoreQuotaExceeded();
      updateSyncMeta({ fromCache: true, isQuotaLimited: true, hasServerError: false });
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `${INVENTORY_COLLECTION}/${recordId}`);
  }
}

export async function removeInventoryRecordFromCloud(productId: string): Promise<void> {
  if (!auth.currentUser || isFirestoreInQuotaCooldown()) {
    return;
  }

  try {
    await deleteDoc(doc(db, INVENTORY_COLLECTION, productId));
  } catch (error) {
    if (isFirestoreQuotaExceededError(error)) {
      markFirestoreQuotaExceeded();
      updateSyncMeta({ fromCache: true, isQuotaLimited: true, hasServerError: false });
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `${INVENTORY_COLLECTION}/${productId}`);
  }
}

/**
 * Updates only public review aggregate fields on `/products/{productId}` so
 * storefront customers can submit reviews without violating admin-only stock rules.
 */
export async function persistProductReviewToCloud(product: Product): Promise<void> {
  storefrontCache.upsertProduct(product, 'mutation');

  if (isFirestoreInQuotaCooldown()) {
    return;
  }

  try {
    await updateDoc(doc(db, PRODUCTS_COLLECTION, product.id), {
      reviews: sanitizeProductReviewsForStorage(product.reviews || [], 50),
      rating: Number(product.rating) || 5.0,
      reviewCount:
        Number(product.reviewCount) || (Array.isArray(product.reviews) ? product.reviews.length : 0),
    });
  } catch (error) {
    if (isFirestoreQuotaExceededError(error)) {
      markFirestoreQuotaExceeded();
      updateSyncMeta({ fromCache: true, isQuotaLimited: true, hasServerError: false });
      return;
    }
    console.warn('Firestore product review sync notice:', error);
  }
}

function buildFirestoreWriteFailureResult(
  error: unknown,
  operationType: OperationType,
  path: string
): PersistProductResult {
  if (isFirestorePermissionDeniedError(error)) {
    emitPermissionDenied(
      inferPermissionDeniedFromFirestoreError(
        error,
        operationType,
        path,
        auth.currentUser
          ? {
              email: auth.currentUser.email || undefined,
              name: auth.currentUser.displayName || undefined,
            }
          : null
      )
    );
  }
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`Firestore ${operationType} failed at ${path}:`, error);
  return {
    persisted: false,
    status: 'error',
    errorMessage: msg,
  };
}

/**
 * Saves or updates a product in the cloud Firestore database and immediately
 * patches the shared storefront cache. Cloud write requires an authenticated
 * Firebase session (`users/{uid}` with `role == 'super_admin'` and `'full_stock'`).
 */
export async function persistProductToCloud(product: Product): Promise<PersistProductResult> {
  storefrontCache.upsertProduct(product, 'mutation');

  if (!auth.currentUser) {
    return {
      persisted: false,
      status: 'skipped_unauthenticated',
    };
  }
  if (isFirestoreInQuotaCooldown()) {
    return {
      persisted: false,
      status: 'skipped_quota',
      errorMessage: 'Firestore daily write quota cooldown active.',
    };
  }

  const safeDocId = sanitizeProductId(product.id);
  const docRef = doc(db, PRODUCTS_COLLECTION, safeDocId);
  const cleaned = cleanProductForFirestore({ ...product, id: safeDocId });
  const { payload, wasCompacted } = enforceFirestoreProductPayloadLimit(cleaned);

  if (wasCompacted) {
    console.warn(
      `Compacted oversized media payload for products/${safeDocId} before Firestore write to stay below 1 MiB limit.`
    );
  }

  try {
    await setDoc(docRef, payload, { merge: true });
    await persistInventoryRecordToCloud({ ...product, id: safeDocId });
    return { persisted: true, status: 'saved' };
  } catch (error) {
    if (isFirestoreQuotaExceededError(error)) {
      markFirestoreQuotaExceeded();
      updateSyncMeta({ fromCache: true, isQuotaLimited: true, hasServerError: false });
      if (shouldLogFirestoreQuotaWarning('products_write')) {
        console.warn('Firestore write deferred due to daily quota limit; product saved locally.');
      }
      return {
        persisted: false,
        status: 'skipped_quota',
        errorMessage: 'Firestore daily write quota exceeded.',
      };
    }

    if (isFirestoreDocumentSizeError(error)) {
      const strippedImages = sanitizeProductImagesForFirestore(payload.images, {
        stripAllDataUrls: true,
      }).images;
      const strippedColors = sanitizeProductColorsForFirestore(payload.colors, {
        stripAllDataUrls: true,
      }).colors;
      const strippedColorImages = sanitizeColorImagesForFirestore(payload.colorImages, {
        stripAllDataUrls: true,
      }).colorImages;
      const emergencyPayload = enforceFirestoreProductPayloadLimit(
        {
          ...payload,
          images: strippedImages,
          colors: strippedColors,
          colorImages: strippedColorImages,
        },
        450_000
      ).payload;

      try {
        await setDoc(docRef, emergencyPayload, { merge: true });
        await persistInventoryRecordToCloud({ ...product, id: safeDocId });
        console.warn(
          `Retried products/${safeDocId} write with stripped inline blobs after Firestore 1 MiB size error.`
        );
        return { persisted: true, status: 'saved' };
      } catch (retryError) {
        return buildFirestoreWriteFailureResult(
          retryError,
          OperationType.WRITE,
          `${PRODUCTS_COLLECTION}/${safeDocId}`
        );
      }
    }

    return buildFirestoreWriteFailureResult(
      error,
      OperationType.WRITE,
      `${PRODUCTS_COLLECTION}/${safeDocId}`
    );
  }
}

/**
 * Deletes a product from the cloud Firestore database and immediately updates the shared cache.
 */
export async function removeProductFromCloud(productId: string): Promise<PersistProductResult> {
  storefrontCache.removeProduct(productId, 'mutation');

  if (!auth.currentUser) {
    return {
      persisted: false,
      status: 'skipped_unauthenticated',
    };
  }
  if (isFirestoreInQuotaCooldown()) {
    return {
      persisted: false,
      status: 'skipped_quota',
      errorMessage: 'Firestore daily write quota cooldown active.',
    };
  }
  const safeDocId = sanitizeProductId(productId);
  const docRef = doc(db, PRODUCTS_COLLECTION, safeDocId);
  try {
    await deleteDoc(docRef);
    await removeInventoryRecordFromCloud(safeDocId);
    return { persisted: true, status: 'saved' };
  } catch (error) {
    if (isFirestoreQuotaExceededError(error)) {
      markFirestoreQuotaExceeded();
      updateSyncMeta({ fromCache: true, isQuotaLimited: true, hasServerError: false });
      if (shouldLogFirestoreQuotaWarning('products_write')) {
        console.warn('Firestore delete deferred due to daily quota limit; removed locally.');
      }
      return {
        persisted: false,
        status: 'skipped_quota',
        errorMessage: 'Firestore daily write quota exceeded.',
      };
    }
    return buildFirestoreWriteFailureResult(
      error,
      OperationType.DELETE,
      `${PRODUCTS_COLLECTION}/${safeDocId}`
    );
  }
}

/**
 * Subscribes to real-time live product updates from Firestore (reserved for Admin Dashboard live mode).
 * Always cleans up on unmount or quota exhaustion.
 */
export function subscribeToLiveProducts(
  onUpdate: (products: Product[]) => void,
  onSeedNeeded?: () => void
): () => void {
  let isDisposed = false;
  let unsubscribeFn: (() => void) | null = null;
  let lastCloudProducts: Product[] = [];
  let hasReceivedSnapshot = false;
  let snapshotSeq = 0;

  const emitOverlayMerged = (overlay: ServerCatalogOverlayState) => {
    if (isDisposed) return;
    const localProducts = readPersistedLocalProducts();
    if (lastCloudProducts.length > 0) {
      const mergedList = mergeCloudWithInitialProducts(
        lastCloudProducts,
        overlay,
        INITIAL_PRODUCTS,
        localProducts
      );
      storefrontCache.setProducts(mergedList, 'firestore');
      onUpdate(mergedList);
      return;
    }
    if (overlay.records.length > 0 || overlay.deletedIds.length > 0 || localProducts.length > 0) {
      const mergedList = mergeCloudWithInitialProducts(
        [],
        overlay,
        INITIAL_PRODUCTS,
        localProducts
      );
      storefrontCache.setProducts(mergedList, 'local');
      onUpdate(mergedList);
    }
  };

  // Always hydrate server catalog overlay before letting live snapshots overwrite local cache
  const initialOverlayPromise = fetchServerCatalogOverlay(true)
    .then((overlay) => {
      if (!isDisposed && !hasReceivedSnapshot) {
        emitOverlayMerged(overlay);
      }
      return overlay;
    })
    .catch(() => serverOverlayState);

  if (isFirestoreInQuotaCooldown()) {
    updateSyncMeta({
      fromCache: true,
      hasPendingWrites: false,
      isConnecting: false,
      hasServerError: false,
      isQuotaLimited: true,
    });
    return () => {
      isDisposed = true;
    };
  }

  const colRef = collection(db, PRODUCTS_COLLECTION);
  updateSyncMeta({ isConnecting: true, hasServerError: false });

  unsubscribeFn = onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    async (snapshot) => {
      if (isDisposed) return;
      const currentSeq = ++snapshotSeq;
      hasReceivedSnapshot = true;

      const isFromCache = snapshot.metadata.fromCache;
      const pendingWrites = snapshot.metadata.hasPendingWrites;

      updateSyncMeta({
        fromCache: isFromCache,
        hasPendingWrites: pendingWrites,
        isConnecting: false,
        hasServerError: false,
        isQuotaLimited: false,
        ...(isFromCache ? {} : { lastSyncedAt: new Date() }),
      });

      const overlay = await initialOverlayPromise;
      if (isDisposed || currentSeq !== snapshotSeq) return;

      const localProducts = readPersistedLocalProducts();

      if (snapshot.empty) {
        if (!isFromCache && !isFirestoreInQuotaCooldown() && onSeedNeeded) {
          onSeedNeeded();
        }
        const mergedFallback = mergeCloudWithInitialProducts(
          [],
          overlay,
          INITIAL_PRODUCTS,
          localProducts
        );
        storefrontCache.setProducts(mergedFallback, 'local');
        onUpdate(mergedFallback);
        return;
      }

      const cloudProducts: Product[] = [];
      snapshot.forEach((docSnap) => {
        cloudProducts.push(
          mapFirestoreDocToProduct(docSnap.id, docSnap.data() as Record<string, unknown>)
        );
      });
      lastCloudProducts = cloudProducts;

      const mergedList = mergeCloudWithInitialProducts(
        cloudProducts,
        overlay,
        INITIAL_PRODUCTS,
        localProducts
      );
      storefrontCache.setProducts(mergedList, 'firestore');
      onUpdate(mergedList);
    },
    (error) => {
      if (isDisposed) return;

      const category = classifyFirestoreError(error);
      if (category === 'quota') {
        markFirestoreQuotaExceeded();
        updateSyncMeta({
          fromCache: true,
          hasPendingWrites: false,
          isConnecting: false,
          hasServerError: false,
          isQuotaLimited: true,
        });
        if (shouldLogFirestoreQuotaWarning('products')) {
          console.warn('Firestore daily read quota reached; using local storefront catalog cache.');
        }
        if (unsubscribeFn) {
          try {
            unsubscribeFn();
          } catch {
            // Ignore teardown notice
          }
          unsubscribeFn = null;
        }
        return;
      }

      if (category === 'network') {
        updateSyncMeta({
          fromCache: true,
          hasPendingWrites: false,
          isConnecting: false,
          hasServerError: false,
        });
        console.warn('Real-time products subscription offline/reconnecting (using local fallback cache).');
        return;
      }

      if (category === 'permission') {
        updateSyncMeta({
          fromCache: true,
          hasPendingWrites: false,
          isConnecting: false,
          hasServerError: true,
        });
        emitPermissionDenied(
          inferPermissionDeniedFromFirestoreError(
            error,
            OperationType.LIST,
            PRODUCTS_COLLECTION,
            auth.currentUser
              ? {
                  email: auth.currentUser.email || undefined,
                  name: auth.currentUser.displayName || undefined,
                }
              : null
          )
        );
        console.warn('Products live listener permission notice:', error);
        if (unsubscribeFn) {
          try {
            unsubscribeFn();
          } catch {
            // ignore teardown error
          }
          unsubscribeFn = null;
        }
        isDisposed = true;
        return;
      }

      updateSyncMeta({
        fromCache: true,
        hasPendingWrites: false,
        isConnecting: false,
        hasServerError: false,
      });
      console.warn('Products subscription notice (using local fallback cache):', error);
    }
  );

  return () => {
    isDisposed = true;
    if (unsubscribeFn) {
      unsubscribeFn();
      unsubscribeFn = null;
    }
  };
}

/**
 * Seeds the cloud database with initial catalog products if empty.
 */
export async function seedInitialProductsToCloud(): Promise<void> {
  if (isFirestoreInQuotaCooldown()) {
    return;
  }
  if (seedingPromise) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    try {
      const existing = await getDocs(colRef);
      if (!existing.empty) return;

      for (const prod of INITIAL_PRODUCTS) {
        if (isFirestoreInQuotaCooldown()) break;
        await persistProductToCloud(prod);
      }
    } catch (error) {
      if (isFirestoreQuotaExceededError(error)) {
        markFirestoreQuotaExceeded();
        updateSyncMeta({ fromCache: true, isQuotaLimited: true, hasServerError: false });
      }
      console.warn('Initial cloud product seeding skipped:', error);
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}
