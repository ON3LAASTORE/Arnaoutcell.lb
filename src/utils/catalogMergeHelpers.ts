import { Product } from '../types';

export interface CatalogOverlayRecord {
  product: Product;
  updatedAtMs: number;
  syncedToFirestore?: boolean;
}

export interface MergeCatalogProductsParams {
  cloudProducts?: Product[];
  serverRecords?: CatalogOverlayRecord[];
  localProducts?: Product[];
  initialProducts?: Product[];
  deletedIds?: string[];
}

/**
 * Deterministically merges Firestore products, authenticated server-persisted product
 * overlays, locally saved products, and initial seed data while strictly respecting
 * explicitly deleted product IDs.
 */
export function mergeCatalogProducts({
  cloudProducts = [],
  serverRecords = [],
  localProducts = [],
  initialProducts = [],
  deletedIds = [],
}: MergeCatalogProductsParams): Product[] {
  const deletedSet = new Set(
    deletedIds
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.trim())
      .filter(Boolean)
  );

  const initialIdSet = new Set(
    initialProducts
      .map((p) => (p?.id ? p.id.trim() : ''))
      .filter(Boolean)
  );

  const cloudById = new Map<string, Product>();
  for (const prod of cloudProducts) {
    if (!prod?.id || deletedSet.has(prod.id)) continue;
    cloudById.set(prod.id, prod);
  }

  const orderedServerRecords = [...serverRecords]
    .filter((rec) => rec?.product?.id && !deletedSet.has(rec.product.id))
    .sort((a, b) => (Number(b.updatedAtMs) || 0) - (Number(a.updatedAtMs) || 0));

  const mergedById = new Map<string, Product>();
  const prependNewProducts: Product[] = [];
  const updatedServerOverrides = new Map<string, Product>();

  for (const record of orderedServerRecords) {
    const prod = record.product;
    const inCloud = cloudById.has(prod.id);
    if (!inCloud) {
      if (!updatedServerOverrides.has(prod.id)) {
        updatedServerOverrides.set(prod.id, prod);
        prependNewProducts.push(prod);
      }
    } else if (!record.syncedToFirestore && !updatedServerOverrides.has(prod.id)) {
      updatedServerOverrides.set(prod.id, prod);
    }
  }

  // Preserve custom locally-saved products (e.g. saved while Firestore was unauthenticated
  // or quota-limited) so snapshots or INITIAL_PRODUCTS never overwrite them on reload.
  for (const localProd of localProducts) {
    if (!localProd?.id || deletedSet.has(localProd.id)) continue;
    if (updatedServerOverrides.has(localProd.id) || cloudById.has(localProd.id)) continue;
    if (!initialIdSet.has(localProd.id)) {
      updatedServerOverrides.set(localProd.id, localProd);
      prependNewProducts.push(localProd);
    }
  }

  for (const prod of prependNewProducts) {
    mergedById.set(prod.id, prod);
  }

  for (const [id, cloudProd] of cloudById.entries()) {
    if (mergedById.has(id)) continue;
    mergedById.set(id, updatedServerOverrides.get(id) || cloudProd);
  }

  // When cloud catalog is empty (quota cooldown / offline / unseeded), preserve local edits
  // over static INITIAL_PRODUCTS seed entries.
  if (cloudById.size === 0) {
    for (const localProd of localProducts) {
      if (!localProd?.id || deletedSet.has(localProd.id) || mergedById.has(localProd.id)) {
        continue;
      }
      mergedById.set(localProd.id, localProd);
    }
  }

  for (const initProd of initialProducts) {
    if (!initProd?.id || deletedSet.has(initProd.id) || mergedById.has(initProd.id)) {
      continue;
    }
    mergedById.set(initProd.id, initProd);
  }

  return Array.from(mergedById.values());
}
