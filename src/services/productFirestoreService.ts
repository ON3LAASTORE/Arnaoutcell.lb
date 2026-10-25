import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialData';

const PRODUCTS_COLLECTION = 'products';

/**
 * Strips undefined properties to ensure Firestore compatibility.
 */
function cleanProductForFirestore(product: Product): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    sku: product.sku,
    price: Number(product.price) || 0,
    originalPrice: Number(product.originalPrice) || Number(product.price) || 0,
    discountPercentage: Number(product.discountPercentage) || 0,
    stock: Number(product.stock) >= 0 ? Number(product.stock) : 0,
    lowStockThreshold: Number(product.lowStockThreshold) || 3,
    images: Array.isArray(product.images) && product.images.length > 0
      ? product.images.slice(0, 20)
      : ['https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800'],
    description: product.description || 'Genuine device with official warranty.',
    warrantyMonths: Number(product.warrantyMonths) || 12,
    isPublished: product.isPublished !== false,
    rating: Number(product.rating) || 5.0,
    reviewCount: Number(product.reviewCount) || 1,
    createdAt: product.createdAt || new Date().toISOString(),
  };

  if (product.nameAr) data.nameAr = product.nameAr;
  if (product.subcategory) data.subcategory = product.subcategory;
  if (product.barcode) data.barcode = product.barcode;
  if (product.videoUrl) data.videoUrl = product.videoUrl;
  if (product.descriptionAr) data.descriptionAr = product.descriptionAr;
  if (product.warrantyTerms) data.warrantyTerms = product.warrantyTerms;
  if (typeof product.isSpecialOffer === 'boolean') data.isSpecialOffer = product.isSpecialOffer;
  if (typeof product.isFeatured === 'boolean') data.isFeatured = product.isFeatured;
  if (typeof product.isNewArrival === 'boolean') data.isNewArrival = product.isNewArrival;
  if (typeof product.isBestSeller === 'boolean') data.isBestSeller = product.isBestSeller;
  if (product.offerExpiresAt) data.offerExpiresAt = product.offerExpiresAt;

  if (Array.isArray(product.colors)) {
    data.colors = product.colors;
  }
  if (Array.isArray(product.specifications)) {
    data.specifications = product.specifications.map((s) => ({
      label: s.label || '',
      value: s.value || '',
      ...(s.group ? { group: s.group } : {}),
    }));
  }
  if (Array.isArray(product.variants)) {
    data.variants = product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: Number(v.price) || 0,
      stock: Number(v.stock) || 0,
      sku: v.sku || '',
    }));
  }

  return data;
}

/**
 * Saves or updates a product in the cloud Firestore database.
 * Changes become instantly available to anyone opening the link.
 */
export async function persistProductToCloud(product: Product): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
  const payload = cleanProductForFirestore(product);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COLLECTION}/${product.id}`);
  }
}

/**
 * Deletes a product from the cloud Firestore database.
 */
export async function removeProductFromCloud(productId: string): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Subscribes to real-time live product updates from Firestore.
 * Anyone visiting the website link will receive immediate live updates whenever products are added or edited.
 */
export function subscribeToLiveProducts(
  onUpdate: (products: Product[]) => void,
  onSeedNeeded?: () => void
): () => void {
  const colRef = collection(db, PRODUCTS_COLLECTION);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        if (onSeedNeeded) {
          onSeedNeeded();
        }
        return;
      }

      const cloudProducts: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        cloudProducts.push({
          id: docSnap.id,
          name: data.name || '',
          nameAr: data.nameAr || '',
          brand: data.brand || '',
          category: data.category || '',
          subcategory: data.subcategory || '',
          sku: data.sku || docSnap.id,
          barcode: data.barcode || '',
          originalPrice: Number(data.originalPrice) || Number(data.price) || 0,
          price: Number(data.price) || 0,
          discountPercentage: Number(data.discountPercentage) || 0,
          stock: Number(data.stock) ?? 10,
          lowStockThreshold: Number(data.lowStockThreshold) || 3,
          images: Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : ['https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800'],
          videoUrl: data.videoUrl || undefined,
          description: data.description || '',
          descriptionAr: data.descriptionAr || '',
          specifications: Array.isArray(data.specifications) ? data.specifications : [],
          colors: Array.isArray(data.colors) ? data.colors : [],
          variants: Array.isArray(data.variants) ? data.variants : [],
          warrantyMonths: Number(data.warrantyMonths) || 12,
          warrantyTerms: data.warrantyTerms || undefined,
          isSpecialOffer: Boolean(data.isSpecialOffer),
          isFeatured: Boolean(data.isFeatured),
          isNewArrival: Boolean(data.isNewArrival),
          isBestSeller: Boolean(data.isBestSeller),
          isPublished: data.isPublished !== false,
          rating: Number(data.rating) || 5.0,
          reviewCount: Number(data.reviewCount) || 1,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });

      // Merge with initial products to guarantee all core showcase items are visible
      const cloudMap = new Map(cloudProducts.map((p) => [p.id, p]));
      const mergedList: Product[] = [...cloudProducts];
      for (const initP of INITIAL_PRODUCTS) {
        if (!cloudMap.has(initP.id)) {
          mergedList.push(initP);
        }
      }

      onUpdate(mergedList);
    },
    (error) => {
      console.warn('Real-time products subscription notice (using local fallback):', error);
      try {
        handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
      } catch {
        // Fallback gracefully to offline cache if network interrupted
      }
    }
  );

  return unsubscribe;
}

/**
 * Seeds the cloud database with initial catalog products if empty.
 */
export async function seedInitialProductsToCloud(): Promise<void> {
  const colRef = collection(db, PRODUCTS_COLLECTION);
  try {
    const existing = await getDocs(colRef);
    if (!existing.empty) return;

    for (const prod of INITIAL_PRODUCTS) {
      await persistProductToCloud(prod);
    }
  } catch (error) {
    console.warn('Initial cloud product seeding skipped:', error);
  }
}
