import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, Product } from '../types';
import { getOrders } from './storageService';
import {
  WarrantyLookupResult,
  evaluateOrderWarranty,
  evaluateSerialWarranty,
  isValidFirestoreDocId,
  normalizeLookupQuery,
  sanitizeWarrantyTerms,
} from '../utils/warrantyCheckerHelpers';

const FIRESTORE_QUERY_TIMEOUT_MS = 4500;

function isPermissionDeniedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes('permission-denied') || msg.includes('missing or insufficient permissions');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = FIRESTORE_QUERY_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Firestore lookup timeout'));
    }, timeoutMs);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function hydrateFirestoreProduct(
  id: string,
  data: Record<string, unknown>,
  fallback?: Product
): Product {
  return {
    id,
    name: String(data.name || fallback?.name || ''),
    nameAr: String(data.nameAr || fallback?.nameAr || ''),
    brand: String(data.brand || fallback?.brand || ''),
    category: String(data.category || fallback?.category || ''),
    subcategory: String(data.subcategory || fallback?.subcategory || ''),
    sku: String(data.sku || fallback?.sku || id),
    barcode: String(data.barcode || fallback?.barcode || ''),
    originalPrice:
      Number(data.originalPrice) || Number(data.price) || fallback?.originalPrice || 0,
    price: Number(data.price) || fallback?.price || 0,
    discountPercentage: Number(data.discountPercentage) || fallback?.discountPercentage || 0,
    stock: typeof data.stock === 'number' ? data.stock : (fallback?.stock ?? 0),
    images:
      Array.isArray(data.images) && data.images.length > 0
        ? (data.images as string[])
        : fallback?.images || [],
    description: String(data.description || fallback?.description || ''),
    descriptionAr: String(data.descriptionAr || fallback?.descriptionAr || ''),
    specifications: Array.isArray(data.specifications)
      ? (data.specifications as Product['specifications'])
      : fallback?.specifications || [],
    warrantyMonths: Number(data.warrantyMonths) || fallback?.warrantyMonths || 12,
    warrantyTerms: sanitizeWarrantyTerms(data.warrantyTerms, fallback?.warrantyTerms),
    isPublished: data.isPublished !== false,
    rating: Number(data.rating) || fallback?.rating || 5,
    reviewCount: Number(data.reviewCount) || fallback?.reviewCount || 0,
    createdAt: String(data.createdAt || fallback?.createdAt || new Date().toISOString()),
  };
}

async function resolveProductsForOrder(
  order: Order,
  fallbackProducts: Product[]
): Promise<{ catalog: Product[]; enrichedFromFirestore: boolean }> {
  const catalog = [...fallbackProducts];
  let enrichedFromFirestore = false;

  await Promise.all(
    order.items.map(async (item) => {
      if (!item.productId || !isValidFirestoreDocId(item.productId)) return;
      try {
        const snap = await withTimeout(getDoc(doc(db, 'products', item.productId)));
        if (snap.exists()) {
          enrichedFromFirestore = true;
          const fallback = catalog.find((p) => p.id === snap.id);
          const hydrated = hydrateFirestoreProduct(
            snap.id,
            snap.data() as Record<string, unknown>,
            fallback
          );
          const existingIdx = catalog.findIndex((p) => p.id === snap.id);
          if (existingIdx >= 0) {
            catalog[existingIdx] = hydrated;
          } else {
            catalog.push(hydrated);
          }
        }
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          try {
            handleFirestoreError(error, OperationType.GET, `products/${item.productId}`);
          } catch {
            // Keep graceful catalog fallback
          }
        }
      }
    })
  );

  return { catalog, enrichedFromFirestore };
}

/**
 * Looks up customer warranty eligibility by Order ID or Product Serial / Barcode / SKU
 * utilizing the existing Firestore `/orders/{orderId}` and `/products/{productId}` collections.
 */
export async function lookupWarrantyInFirestore(
  rawQuery: string,
  fallbackProducts: Product[],
  customPurchaseDateIso?: string,
  nowDate?: Date
): Promise<WarrantyLookupResult | null> {
  const normalized = normalizeLookupQuery(rawQuery);
  if (!normalized) return null;

  const upperQuery = normalized.toUpperCase();
  const lowerQuery = normalized.toLowerCase();

  // 1. Check local synced orders first for instant response on same-browser/sample orders,
  //    while still hydrating product warranty metadata live from Firestore `/products`.
  const localOrders = getOrders();
  const localOrderMatch = localOrders.find((o) => o.id.toUpperCase() === upperQuery);
  if (localOrderMatch) {
    // Also check if Firestore has newer order status updates for this Order ID
    let latestOrder = localOrderMatch;
    let orderFromFirestore = false;
    if (isValidFirestoreDocId(upperQuery)) {
      try {
        const orderSnap = await withTimeout(getDoc(doc(db, 'orders', upperQuery)));
        if (orderSnap.exists()) {
          latestOrder = orderSnap.data() as Order;
          orderFromFirestore = true;
        }
      } catch {
        // Non-existent order doc in Firestore rules evaluates resource.data.id == orderId -> ignore cleanly
      }
    }
    const { catalog, enrichedFromFirestore } = await resolveProductsForOrder(
      latestOrder,
      fallbackProducts
    );
    return evaluateOrderWarranty(
      latestOrder,
      catalog,
      orderFromFirestore || enrichedFromFirestore ? 'firestore' : 'local_cache',
      nowDate
    );
  }

  // 2. Direct Firestore Order lookup (/orders/{orderId}) for orders created on other devices
  if (isValidFirestoreDocId(upperQuery) && /^(OAA|ARN|ORD)-/i.test(upperQuery)) {
    try {
      const orderSnap = await withTimeout(getDoc(doc(db, 'orders', upperQuery)));
      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Order;
        const { catalog } = await resolveProductsForOrder(orderData, fallbackProducts);
        return evaluateOrderWarranty(orderData, catalog, 'firestore', nowDate);
      }
    } catch {
      // Note: existing firestore.rules returns permission-denied when resource == null on /orders/{orderId};
      // fall through cleanly to product barcode/SKU lookups rather than failing the search.
    }
  }

  // 3. Query Firestore `/products` collection by barcode ("Barcode or serial identifier")
  const productsCol = collection(db, 'products');
  try {
    const barcodeSnap = await withTimeout(
      getDocs(query(productsCol, where('barcode', '==', normalized), limit(1)))
    );
    if (!barcodeSnap.empty) {
      const docSnap = barcodeSnap.docs[0];
      const fallback = fallbackProducts.find((p) => p.id === docSnap.id);
      const product = hydrateFirestoreProduct(
        docSnap.id,
        docSnap.data() as Record<string, unknown>,
        fallback
      );
      return evaluateSerialWarranty({
        query: normalized,
        product,
        matchType: 'serial_barcode',
        dataSource: 'firestore',
        customPurchaseDateIso,
        nowDate,
      });
    }

    // 4. Query Firestore `/products` by SKU
    const skuSnap = await withTimeout(
      getDocs(query(productsCol, where('sku', '==', upperQuery), limit(1)))
    );
    if (!skuSnap.empty) {
      const docSnap = skuSnap.docs[0];
      const fallback = fallbackProducts.find((p) => p.id === docSnap.id);
      const product = hydrateFirestoreProduct(
        docSnap.id,
        docSnap.data() as Record<string, unknown>,
        fallback
      );
      return evaluateSerialWarranty({
        query: upperQuery,
        product,
        matchType: 'sku',
        dataSource: 'firestore',
        customPurchaseDateIso,
        nowDate,
      });
    }

    // 5. Direct Firestore `/products/{productId}` point lookup
    if (isValidFirestoreDocId(lowerQuery)) {
      const prodDocSnap = await withTimeout(getDoc(doc(db, 'products', lowerQuery)));
      if (prodDocSnap.exists()) {
        const fallback = fallbackProducts.find((p) => p.id === prodDocSnap.id);
        const product = hydrateFirestoreProduct(
          prodDocSnap.id,
          prodDocSnap.data() as Record<string, unknown>,
          fallback
        );
        return evaluateSerialWarranty({
          query: prodDocSnap.id,
          product,
          matchType: 'product_id',
          dataSource: 'firestore',
          customPurchaseDateIso,
          nowDate,
        });
      }
    }
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      try {
        handleFirestoreError(error, OperationType.GET, 'products');
      } catch {
        // Fall back to synced product catalog below
      }
    }
  }

  // 6. Offline / unseeded catalog fallback across synced products
  const catalogMatch = fallbackProducts.find(
    (p) =>
      (p.barcode && p.barcode.trim().toLowerCase() === lowerQuery) ||
      p.sku.trim().toUpperCase() === upperQuery ||
      p.id.trim().toLowerCase() === lowerQuery
  );

  if (catalogMatch) {
    const matchType =
      catalogMatch.barcode && catalogMatch.barcode.trim().toLowerCase() === lowerQuery
        ? 'serial_barcode'
        : catalogMatch.sku.trim().toUpperCase() === upperQuery
        ? 'sku'
        : 'product_id';

    return evaluateSerialWarranty({
      query: normalized,
      product: catalogMatch,
      matchType,
      dataSource: 'local_cache',
      customPurchaseDateIso,
      nowDate,
    });
  }

  return null;
}
