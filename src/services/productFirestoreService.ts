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
} from '../utils/permissionDeniedHelpers';

const PRODUCTS_COLLECTION = 'products';
const INVENTORY_COLLECTION = 'inventory';

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

function mergeCloudWithInitialProducts(cloudProducts: Product[]): Product[] {
  const cloudMap = new Map(cloudProducts.map((p) => [p.id, p]));
  const mergedList: Product[] = [...cloudProducts];
  for (const initP of INITIAL_PRODUCTS) {
    if (!cloudMap.has(initP.id)) {
      mergedList.push(initP);
    }
  }
  return mergedList;
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
  const safeId = (product.id || '').trim().slice(0, 128) || `prod-${Date.now()}`;
  const safeName = (product.name || '').trim().slice(0, 255) || 'Unnamed Product';
  const safeBrand = (product.brand || '').trim().slice(0, 64) || 'ON AlAA STORE';
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

/**
 * Fetches storefront products using shared TTL cache + in-flight request deduplication (`getDocs`),
 * avoiding open-ended real-time `onSnapshot` listeners for static catalog browsing.
 */
export async function fetchStorefrontProducts(options?: {
  forceRefresh?: boolean;
  fallbackProducts?: Product[];
}): Promise<{ products: Product[]; fromCache: boolean; isStale: boolean }> {
  const fallbackList =
    options?.fallbackProducts && options.fallbackProducts.length > 0
      ? options.fallbackProducts
      : INITIAL_PRODUCTS;

  const result = await storefrontCache.fetchWithCache<Product[]>(
    'products',
    async () => {
      updateSyncMeta({ isConnecting: true, hasServerError: false });
      try {
        const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
        const isFromCache = snapshot.metadata.fromCache;

        if (snapshot.empty) {
          if (!isFromCache && !isFirestoreInQuotaCooldown()) {
            seedInitialProductsToCloud().catch(() => {});
          }
          updateSyncMeta({
            fromCache: true,
            hasPendingWrites: false,
            isConnecting: false,
            hasServerError: false,
            isQuotaLimited: isFirestoreInQuotaCooldown(),
            ...(isFromCache ? {} : { lastSyncedAt: new Date() }),
          });
          return fallbackList;
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

        return mergeCloudWithInitialProducts(cloudProducts);
      } catch (error) {
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
          throw error;
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
          throw error;
        }

        if (category === 'permission') {
          updateSyncMeta({
            fromCache: true,
            hasPendingWrites: false,
            isConnecting: false,
            hasServerError: true,
          });
          handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
        }

        updateSyncMeta({
          fromCache: true,
          hasPendingWrites: false,
          isConnecting: false,
          hasServerError: false,
        });
        throw error;
      }
    },
    {
      forceRefresh: options?.forceRefresh,
      fallbackData: fallbackList,
      fallbackSource: 'local',
    }
  );

  if (result.fromCache) {
    updateSyncMeta({
      fromCache: true,
      isConnecting: false,
      isQuotaLimited: isFirestoreInQuotaCooldown(),
    });
  }

  return {
    products: result.data,
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

/**
 * Saves or updates a product in the cloud Firestore database and immediately
 * patches the shared storefront cache. Cloud write requires an authenticated
 * Firebase session (`users/{uid}` with `role == 'super_admin'` and `'full_stock'`).
 */
export async function persistProductToCloud(product: Product): Promise<void> {
  storefrontCache.upsertProduct(product, 'mutation');

  if (!auth.currentUser || isFirestoreInQuotaCooldown()) {
    return;
  }
  const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
  const cleaned = cleanProductForFirestore(product);
  const { payload, wasCompacted } = enforceFirestoreProductPayloadLimit(cleaned);

  if (wasCompacted) {
    console.warn(
      `Compacted oversized media payload for products/${product.id} before Firestore write to stay below 1 MiB limit.`
    );
  }

  try {
    await setDoc(docRef, payload, { merge: true });
    await persistInventoryRecordToCloud(product);
  } catch (error) {
    if (isFirestoreQuotaExceededError(error)) {
      markFirestoreQuotaExceeded();
      updateSyncMeta({ fromCache: true, isQuotaLimited: true, hasServerError: false });
      if (shouldLogFirestoreQuotaWarning('products_write')) {
        console.warn('Firestore write deferred due to daily quota limit; product saved locally.');
      }
      return;
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
        await persistInventoryRecordToCloud(product);
        console.warn(
          `Retried products/${product.id} write with stripped inline blobs after Firestore 1 MiB size error.`
        );
        return;
      } catch (retryError) {
        console.warn(
          `Firestore size limit fallback preserved local product products/${product.id}:`,
          retryError
        );
        return;
      }
    }

    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COLLECTION}/${product.id}`);
  }
}

/**
 * Deletes a product from the cloud Firestore database and immediately updates the shared cache.
 */
export async function removeProductFromCloud(productId: string): Promise<void> {
  storefrontCache.removeProduct(productId, 'mutation');

  if (!auth.currentUser || isFirestoreInQuotaCooldown()) {
    return;
  }
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  try {
    await deleteDoc(docRef);
    await removeInventoryRecordFromCloud(productId);
  } catch (error) {
    if (isFirestoreQuotaExceededError(error)) {
      markFirestoreQuotaExceeded();
      updateSyncMeta({ fromCache: true, isQuotaLimited: true, hasServerError: false });
      if (shouldLogFirestoreQuotaWarning('products_write')) {
        console.warn('Firestore delete deferred due to daily quota limit; removed locally.');
      }
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${productId}`);
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
  if (isFirestoreInQuotaCooldown()) {
    updateSyncMeta({
      fromCache: true,
      hasPendingWrites: false,
      isConnecting: false,
      hasServerError: false,
      isQuotaLimited: true,
    });
    return () => {};
  }

  const colRef = collection(db, PRODUCTS_COLLECTION);
  updateSyncMeta({ isConnecting: true, hasServerError: false });

  let isDisposed = false;
  let unsubscribeFn: (() => void) | null = null;

  unsubscribeFn = onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (isDisposed) return;

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

      if (snapshot.empty) {
        if (!isFromCache && !isFirestoreInQuotaCooldown() && onSeedNeeded) {
          onSeedNeeded();
        }
        return;
      }

      const cloudProducts: Product[] = [];
      snapshot.forEach((docSnap) => {
        cloudProducts.push(
          mapFirestoreDocToProduct(docSnap.id, docSnap.data() as Record<string, unknown>)
        );
      });

      const mergedList = mergeCloudWithInitialProducts(cloudProducts);
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
