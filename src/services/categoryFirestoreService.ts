import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Category } from '../types';
import { INITIAL_CATEGORIES } from '../data/initialData';
import {
  classifyFirestoreError,
  isFirestoreInQuotaCooldown,
  isFirestoreQuotaExceededError,
  markFirestoreQuotaExceeded,
} from '../utils/firestoreQuotaHelpers';
import { mergeDynamicCategories, sortDynamicCategories } from '../utils/categoryBannerHelpers';

const CATEGORIES_COLLECTION = 'categories';
const LOCAL_CATEGORIES_KEY = 'arnaout_cell_categories_v2';

let categorySeedingPromise: Promise<void> | null = null;

function readLocalCategoryCache(): Category[] {
  if (typeof window === 'undefined') return INITIAL_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (!raw) return INITIAL_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_CATEGORIES;
    return mergeDynamicCategories(parsed as Category[], INITIAL_CATEGORIES);
  } catch {
    return INITIAL_CATEGORIES;
  }
}

function writeLocalCategoryCache(categories: Category[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
  } catch {
    // Ignore quota failures on local fallback cache
  }
}

/**
 * Strips undefined properties and enforces firebase-blueprint.json Category schema limits.
 */
export function cleanCategoryForFirestore(category: Category): Record<string, unknown> {
  const safeId = (category.id || '').trim().slice(0, 128);
  const safeName = (category.name || 'Category').trim().slice(0, 128) || 'Category';
  const safeNameAr = (category.nameAr || safeName).trim().slice(0, 128) || safeName;
  const safeSlug =
    (category.slug || safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
      .trim()
      .slice(0, 128) || 'category';
  const safeIconName = (category.iconName || 'Box').trim().slice(0, 64) || 'Box';
  const numericOrder = Number(category.displayOrder);
  const safeDisplayOrder =
    Number.isFinite(numericOrder) && numericOrder >= 0
      ? Math.min(10000, Math.round(numericOrder))
      : 0;

  const payload: Record<string, unknown> = {
    id: safeId,
    name: safeName,
    nameAr: safeNameAr,
    slug: safeSlug,
    iconName: safeIconName,
    displayOrder: safeDisplayOrder,
  };

  if (typeof category.image === 'string' && category.image.trim().length > 0) {
    payload.image = category.image.trim().slice(0, 1024);
  }
  if (typeof category.description === 'string' && category.description.trim().length > 0) {
    payload.description = category.description.trim().slice(0, 512);
  }
  if (typeof category.featured === 'boolean') {
    payload.featured = category.featured;
  }
  if (Array.isArray(category.subcategories)) {
    payload.subcategories = category.subcategories
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim().slice(0, 64))
      .slice(0, 25);
  }

  return payload;
}

function mapSnapshotDocToCategory(docId: string, data: Record<string, unknown>): Category {
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : docId;
  const nameAr = typeof data.nameAr === 'string' && data.nameAr.trim() ? data.nameAr.trim() : name;
  const slug =
    typeof data.slug === 'string' && data.slug.trim()
      ? data.slug.trim()
      : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id: docId,
    name,
    nameAr,
    slug,
    iconName: typeof data.iconName === 'string' && data.iconName.trim() ? data.iconName.trim() : 'Box',
    image: typeof data.image === 'string' && data.image.trim() ? data.image.trim() : undefined,
    description:
      typeof data.description === 'string' && data.description.trim()
        ? data.description.trim()
        : undefined,
    featured: typeof data.featured === 'boolean' ? data.featured : false,
    displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 999,
    subcategories: Array.isArray(data.subcategories)
      ? data.subcategories.filter((s): s is string => typeof s === 'string')
      : [],
  };
}

/**
 * Fetches dynamic product categories from Firestore once, falling back cleanly
 * to cached/initial catalog categories when offline or quota-limited.
 */
export async function fetchDynamicCategories(): Promise<Category[]> {
  if (isFirestoreInQuotaCooldown()) {
    return sortDynamicCategories(readLocalCategoryCache());
  }

  try {
    const colRef = collection(db, CATEGORIES_COLLECTION);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      if (!snapshot.metadata.fromCache) {
        seedInitialCategoriesToCloud().catch((err) => {
          console.warn('Category cloud seed skipped:', err);
        });
      }
      return sortDynamicCategories(readLocalCategoryCache());
    }

    const cloudCategories: Category[] = [];
    snapshot.forEach((docSnap) => {
      cloudCategories.push(mapSnapshotDocToCategory(docSnap.id, docSnap.data()));
    });

    const merged = mergeDynamicCategories(cloudCategories, INITIAL_CATEGORIES);
    writeLocalCategoryCache(merged);
    return merged;
  } catch (error) {
    const category = classifyFirestoreError(error);
    if (category === 'quota') {
      markFirestoreQuotaExceeded();
      console.warn('Firestore daily read quota reached; using cached storefront categories.');
      return sortDynamicCategories(readLocalCategoryCache());
    }
    if (category === 'network') {
      console.warn('Dynamic categories fetch offline; using cached storefront categories.');
      return sortDynamicCategories(readLocalCategoryCache());
    }
    if (category === 'permission') {
      handleFirestoreError(error, OperationType.LIST, CATEGORIES_COLLECTION);
    }
    return sortDynamicCategories(readLocalCategoryCache());
  }
}

/**
 * Subscribes to live Firestore updates for storefront categories so additions,
 * edits, or deletions sync immediately across HomePage and Shop filters.
 */
export function subscribeToLiveCategories(
  onUpdate: (categories: Category[]) => void,
  onSeedNeeded?: () => void
): () => void {
  if (isFirestoreInQuotaCooldown()) {
    return () => {};
  }

  const colRef = collection(db, CATEGORIES_COLLECTION);
  let isDisposed = false;
  let unsubscribeFn: (() => void) | null = null;

  unsubscribeFn = onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (isDisposed) return;

      const isFromCache = snapshot.metadata.fromCache;

      if (snapshot.empty) {
        if (!isFromCache && !isFirestoreInQuotaCooldown() && onSeedNeeded) {
          onSeedNeeded();
        }
        return;
      }

      const cloudCategories: Category[] = [];
      snapshot.forEach((docSnap) => {
        cloudCategories.push(mapSnapshotDocToCategory(docSnap.id, docSnap.data()));
      });

      const merged = mergeDynamicCategories(cloudCategories, INITIAL_CATEGORIES);
      writeLocalCategoryCache(merged);
      onUpdate(merged);
    },
    (error) => {
      if (isDisposed) return;
      const category = classifyFirestoreError(error);
      if (category === 'quota') {
        markFirestoreQuotaExceeded();
        if (unsubscribeFn) {
          try {
            unsubscribeFn();
          } catch {
            // ignore teardown error
          }
          unsubscribeFn = null;
        }
        return;
      }
      if (category === 'network') {
        console.warn('Live categories subscription offline; using cached fallback.');
        return;
      }
      if (category === 'permission') {
        handleFirestoreError(error, OperationType.LIST, CATEGORIES_COLLECTION);
      }
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

export async function persistCategoryToCloud(category: Category): Promise<void> {
  if (isFirestoreInQuotaCooldown()) return;
  const payload = cleanCategoryForFirestore(category);
  const docId = String(payload.id || category.id);
  const docRef = doc(db, CATEGORIES_COLLECTION, docId);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    if (isFirestoreQuotaExceededError(error)) {
      markFirestoreQuotaExceeded();
      console.warn('Firestore category write deferred due to daily quota limit; saved locally.');
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `${CATEGORIES_COLLECTION}/${docId}`);
  }
}

export async function removeCategoryFromCloud(categoryId: string): Promise<void> {
  if (isFirestoreInQuotaCooldown()) return;
  const docRef = doc(db, CATEGORIES_COLLECTION, categoryId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    if (isFirestoreQuotaExceededError(error)) {
      markFirestoreQuotaExceeded();
      console.warn('Firestore category delete deferred due to daily quota limit; removed locally.');
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `${CATEGORIES_COLLECTION}/${categoryId}`);
  }
}

export async function seedInitialCategoriesToCloud(): Promise<void> {
  if (isFirestoreInQuotaCooldown()) return;
  if (categorySeedingPromise) return categorySeedingPromise;

  categorySeedingPromise = (async () => {
    const colRef = collection(db, CATEGORIES_COLLECTION);
    try {
      const existing = await getDocs(colRef);
      if (!existing.empty) return;

      for (const cat of INITIAL_CATEGORIES) {
        if (isFirestoreInQuotaCooldown()) break;
        await persistCategoryToCloud(cat);
      }
    } catch (error) {
      if (isFirestoreQuotaExceededError(error)) {
        markFirestoreQuotaExceeded();
      }
      console.warn('Initial cloud category seeding skipped:', error);
    } finally {
      categorySeedingPromise = null;
    }
  })();

  return categorySeedingPromise;
}
