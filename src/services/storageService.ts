import { Product, Category, Brand, MarketingVideo, Order, StoreSettings, OrderStatus, Review } from '../types';
import { Testimonial } from '../utils/testimonialHelpers';
import {
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_PRODUCTS,
  INITIAL_MARKETING_VIDEOS,
  INITIAL_STORE_SETTINGS,
} from '../data/initialData';
import {
  persistProductToCloud,
  removeProductFromCloud,
} from './productFirestoreService';
import {
  persistCategoryToCloud,
  removeCategoryFromCloud,
} from './categoryFirestoreService';
import { db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { resolveStoreLogoUrl } from '../utils/storeSettingsHelpers';
import { hasLegacyScheduleText, migrateOpeningSchedule } from '../utils/storeSchedule';
import {
  safeStorageSetItem,
  compactStoreSettingsPayload,
  compactProductsForStorage,
  SafeStorageSetResult,
} from '../utils/storageQuotaHelpers';
import { optimizeUploadedImage } from '../utils/imageCompression';
import { resolveFullResolutionImageUrl } from '../utils/imageResolutionHelpers';
import {
  isFirestoreInQuotaCooldown,
  isFirestoreQuotaExceededError,
  markFirestoreQuotaExceeded,
} from '../utils/firestoreQuotaHelpers';
import { recordAdminActivity } from './activityLogService';

const memoryStorageFallback = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') {
    return memoryStorageFallback.get(key) ?? null;
  }
  try {
    return localStorage.getItem(key) ?? memoryStorageFallback.get(key) ?? null;
  } catch {
    return memoryStorageFallback.get(key) ?? null;
  }
}

function setStorageItem(
  key: string,
  value: string,
  onQuotaRecovery?: () => string | null
): SafeStorageSetResult {
  memoryStorageFallback.set(key, value);
  if (typeof window === 'undefined') {
    return { ok: true, recovered: false, persistedValue: value };
  }
  return safeStorageSetItem(window.localStorage, key, value, { onQuotaRecovery });
}

const KEYS = {
  PRODUCTS: 'arnaout_cell_products_v2',
  CATEGORIES: 'arnaout_cell_categories_v2',
  BRANDS: 'arnaout_cell_brands_v2',
  VIDEOS: 'arnaout_cell_videos_v2',
  ORDERS: 'arnaout_cell_orders_v2',
  SETTINGS: 'arnaout_cell_settings_v2',
  WISHLIST: 'arnaout_cell_wishlist_v2',
  CART: 'arnaout_cell_cart_v2',
  TESTIMONIALS: 'arnaout_cell_testimonials_v2',
  WARRANTY_SAMPLES_SEEDED: 'arnaout_cell_warranty_samples_v1',
};

// Initialize if empty
export function initStorage(): void {
  if (typeof window === 'undefined') return;

  if (!getStorageItem(KEYS.PRODUCTS)) {
    setStorageItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  } else {
    // Clean any legacy mock reviews from cached products
    try {
      const raw = getStorageItem(KEYS.PRODUCTS);
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored)) {
          let hasOldReviews = false;
          const cleaned = stored.map((p: any) => {
            if ((p.reviews && p.reviews.length > 0) || (p.reviewCount && p.reviewCount > 0)) {
              hasOldReviews = true;
              return { ...p, reviews: [], reviewCount: 0 };
            }
            return p;
          });
          if (hasOldReviews) {
            setStorageItem(KEYS.PRODUCTS, JSON.stringify(cleaned));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!getStorageItem(KEYS.TESTIMONIALS)) {
    setStorageItem(KEYS.TESTIMONIALS, JSON.stringify([]));
  }
  if (!getStorageItem(KEYS.CATEGORIES)) {
    setStorageItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!getStorageItem(KEYS.BRANDS)) {
    setStorageItem(KEYS.BRANDS, JSON.stringify(INITIAL_BRANDS));
  }
  if (!getStorageItem(KEYS.VIDEOS)) {
    setStorageItem(KEYS.VIDEOS, JSON.stringify(INITIAL_MARKETING_VIDEOS));
  }
  if (!getStorageItem(KEYS.SETTINGS)) {
    setStorageItem(KEYS.SETTINGS, JSON.stringify(INITIAL_STORE_SETTINGS));
  }
  if (!getStorageItem(KEYS.ORDERS)) {
    // Seed sample initial orders for demonstration
    const sampleOrders: Order[] = [
      {
        id: 'OAA-2027-1001',
        customer: {
          fullName: 'Sami Khoury',
          phone: '03 123 456',
          cityArea: 'Chouf & Mount Lebanon (Baakline)',
          addressLine: 'Chouf Main Road, Near Square',
          notes: 'Customer requested afternoon delivery',
        },
        items: [
          {
            productId: 'prod-iphone16promax',
            productName: 'Apple iPhone 16 Pro Max 256GB Desert Titanium',
            brand: 'Apple',
            price: 1249,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
            color: 'Desert Titanium',
          },
        ],
        subtotal: 1249,
        discount: 0,
        deliveryFee: 2,
        total: 1251,
        currency: 'USD',
        status: 'delivered',
        paymentMethod: 'cod',
        paymentStatus: 'paid',
        orderDate: '2026-10-10T14:20:00Z',
        statusHistory: [
          { status: 'new', timestamp: '2026-10-10T14:20:00Z' },
          { status: 'confirmed', timestamp: '2026-10-10T14:25:00Z' },
          { status: 'ready_for_delivery', timestamp: '2026-10-10T15:00:00Z' },
          { status: 'delivered', timestamp: '2026-10-10T17:10:00Z', note: 'Delivered in Chouf' },
        ],
      },
      {
        id: 'OAA-2027-1002',
        customer: {
          fullName: 'Nour El-Hajj',
          phone: '70 987 654',
          cityArea: 'Beirut & Greater Beirut',
          addressLine: 'Hamra Street, Makdessi Bldg, 4th Floor',
          notes: 'Call 15 minutes before arrival',
        },
        items: [
          {
            productId: 'prod-anker737',
            productName: 'Anker 737 Power Bank (PowerCore 24K) 140W GaNPrime',
            brand: 'Anker',
            price: 119,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf',
          },
          {
            productId: 'prod-greenlionsmartwatch',
            productName: 'Green Lion Signature Ultra 2 Smartwatch AMOLED 49mm',
            brand: 'Green Lion',
            price: 59,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
            color: 'Titanium Orange',
          },
        ],
        subtotal: 178,
        discount: 0,
        deliveryFee: 3,
        total: 181,
        currency: 'USD',
        status: 'out_for_delivery',
        paymentMethod: 'cod',
        paymentStatus: 'pay_on_delivery',
        orderDate: '2026-10-14T09:15:00Z',
        statusHistory: [
          { status: 'new', timestamp: '2026-10-14T09:15:00Z' },
          { status: 'confirmed', timestamp: '2026-10-14T09:30:00Z' },
          { status: 'preparing', timestamp: '2026-10-14T10:00:00Z' },
            { status: 'out_for_delivery', timestamp: '2026-10-14T12:00:00Z', note: 'Courier out in Beirut route' },
          ],
        },
        {
          id: 'OAA-2025-0412',
          customer: {
            fullName: 'Karim Haddad',
            phone: '71 555 210',
            cityArea: 'Mount Lebanon (Aley)',
            addressLine: 'Aley Main Street',
          },
          items: [
            {
              productId: 'prod-sonywh1000xm5',
              productName: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
              brand: 'Sony',
              price: 319,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb',
              color: 'Midnight Blue',
            },
          ],
          subtotal: 319,
          discount: 0,
          deliveryFee: 3,
          total: 322,
          currency: 'USD',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          orderDate: '2025-02-01T10:00:00Z',
          statusHistory: [
            { status: 'new', timestamp: '2025-02-01T10:00:00Z' },
            { status: 'delivered', timestamp: '2025-02-01T15:30:00Z', note: 'Delivered in Aley' },
          ],
        },
        {
          id: 'OAA-2026-0884',
          customer: {
            fullName: 'Rami Mansour',
            phone: '76 345 901',
            cityArea: 'Chouf (Deir El Qamar)',
            addressLine: 'Main Square, Bldg 12',
          },
          items: [
            {
              productId: 'prod-s25ultra',
              productName: 'Samsung Galaxy S25 Ultra 512GB Titanium Gray',
              brand: 'Samsung',
              price: 1299,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c',
              color: 'Titanium Gray',
            },
          ],
          subtotal: 1299,
          discount: 0,
          deliveryFee: 2,
          total: 1301,
          currency: 'USD',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          orderDate: '2026-04-15T11:00:00Z',
          statusHistory: [
            { status: 'new', timestamp: '2026-04-15T11:00:00Z' },
            { status: 'delivered', timestamp: '2026-04-15T16:45:00Z', note: 'Delivered in Chouf' },
          ],
          warrantyClaim: {
            status: 'replaced',
            claimedAt: '2026-09-18T13:20:00Z',
            claimReference: 'WCL-2026-084',
            resolution: 'Display assembly serviced & replaced under official warranty.',
            resolutionAr: 'تمت معالجة المطالبة واستبدال وحدة الشاشة ضمن الكفالة الرسمية.',
          },
        },
      ];
    setStorageItem(KEYS.ORDERS, JSON.stringify(sampleOrders));
    setStorageItem(KEYS.WARRANTY_SAMPLES_SEEDED, '1');
  } else if (!getStorageItem(KEYS.WARRANTY_SAMPLES_SEEDED)) {
    try {
      const existingRaw = getStorageItem(KEYS.ORDERS);
      const existingOrders: Order[] = existingRaw ? JSON.parse(existingRaw) : [];
      const existingIds = new Set(existingOrders.map((o) => o.id));
      const extraSamples: Order[] = [
        {
          id: 'OAA-2025-0412',
          customer: {
            fullName: 'Karim Haddad',
            phone: '71 555 210',
            cityArea: 'Mount Lebanon (Aley)',
            addressLine: 'Aley Main Street',
          },
          items: [
            {
              productId: 'prod-sonywh1000xm5',
              productName: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
              brand: 'Sony',
              price: 319,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb',
              color: 'Midnight Blue',
            },
          ],
          subtotal: 319,
          discount: 0,
          deliveryFee: 3,
          total: 322,
          currency: 'USD',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          orderDate: '2025-02-01T10:00:00Z',
          statusHistory: [
            { status: 'new', timestamp: '2025-02-01T10:00:00Z' },
            { status: 'delivered', timestamp: '2025-02-01T15:30:00Z', note: 'Delivered in Aley' },
          ],
        },
        {
          id: 'OAA-2026-0884',
          customer: {
            fullName: 'Rami Mansour',
            phone: '76 345 901',
            cityArea: 'Chouf (Deir El Qamar)',
            addressLine: 'Main Square, Bldg 12',
          },
          items: [
            {
              productId: 'prod-s25ultra',
              productName: 'Samsung Galaxy S25 Ultra 512GB Titanium Gray',
              brand: 'Samsung',
              price: 1299,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c',
              color: 'Titanium Gray',
            },
          ],
          subtotal: 1299,
          discount: 0,
          deliveryFee: 2,
          total: 1301,
          currency: 'USD',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          orderDate: '2026-04-15T11:00:00Z',
          statusHistory: [
            { status: 'new', timestamp: '2026-04-15T11:00:00Z' },
            { status: 'delivered', timestamp: '2026-04-15T16:45:00Z', note: 'Delivered in Chouf' },
          ],
          warrantyClaim: {
            status: 'replaced',
            claimedAt: '2026-09-18T13:20:00Z',
            claimReference: 'WCL-2026-084',
            resolution: 'Display assembly serviced & replaced under official warranty.',
            resolutionAr: 'تمت معالجة المطالبة واستبدال وحدة الشاشة ضمن الكفالة الرسمية.',
          },
        },
      ];
      let added = false;
      for (const sample of extraSamples) {
        if (!existingIds.has(sample.id)) {
          existingOrders.push(sample);
          added = true;
        }
      }
      if (added) {
        setStorageItem(KEYS.ORDERS, JSON.stringify(existingOrders));
      }
      setStorageItem(KEYS.WARRANTY_SAMPLES_SEEDED, '1');
    } catch {
      // ignore
    }
  }
}

// Products
export function getProducts(): Product[] {
  try {
    const raw = getStorageItem(KEYS.PRODUCTS);
    if (!raw) return INITIAL_PRODUCTS;
    const parsed: Product[] = JSON.parse(raw);
    const existingIds = new Set(parsed.map((p) => p.id));
    let changed = false;
    const merged = parsed.map((p) => {
      if (!Array.isArray(p.images)) return p;
      const upgraded = p.images.map((img) => resolveFullResolutionImageUrl(img) || img);
      if (upgraded.some((img, idx) => img !== p.images[idx])) {
        changed = true;
        return { ...p, images: upgraded };
      }
      return p;
    });
    for (const initProd of INITIAL_PRODUCTS) {
      if (!existingIds.has(initProd.id)) {
        merged.push(initProd);
        existingIds.add(initProd.id);
        changed = true;
      }
    }
    if (changed) {
      saveProducts(merged);
    }
    return merged;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[]): void {
  setStorageItem(
    KEYS.PRODUCTS,
    JSON.stringify(products),
    () => JSON.stringify(compactProductsForStorage(products))
  );
}

export function saveProduct(product: Product): Product {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === product.id);
  const existing = index >= 0 ? products[index] : undefined;
  if (index >= 0) {
    products[index] = product;
  } else {
    products.unshift(product);
  }
  saveProducts(products);

  // Automatically persist to Firebase Firestore live cloud database
  persistProductToCloud(product).catch((err) => {
    console.warn('Live product sync notice:', err);
  });

  if (existing) {
    const changes: string[] = [];
    if (existing.price !== product.price) {
      changes.push(`Price $${existing.price} -> $${product.price}`);
    }
    if (existing.stock !== product.stock) {
      changes.push(`Stock ${existing.stock} -> ${product.stock}`);
    }
    if (existing.isPublished !== product.isPublished) {
      changes.push(product.isPublished ? 'Published' : 'Unpublished');
    }
    recordAdminActivity({
      action: 'product_updated',
      titleEn: `Updated product: ${product.name}`,
      titleAr: `تم تحديث المنتج: ${product.nameAr || product.name}`,
      category: 'catalog',
      severity: 'info',
      target: `${product.name} (${product.id})`,
      details: changes.length > 0 ? changes.join(' • ') : `Modified specifications/media for ${product.brand} item.`,
    }).catch(() => {});
  } else {
    recordAdminActivity({
      action: 'product_created',
      titleEn: `Added new product: ${product.name}`,
      titleAr: `تمت إضافة منتج جديد: ${product.nameAr || product.name}`,
      category: 'catalog',
      severity: 'info',
      target: `${product.name} (${product.id})`,
      details: `Brand: ${product.brand} • Category: ${product.category} • Price: $${product.price} • Stock: ${product.stock}`,
    }).catch(() => {});
  }

  return product;
}

export function deleteProduct(productId: string): void {
  const currentProducts = getProducts();
  const deleted = currentProducts.find((p) => p.id === productId);
  const products = currentProducts.filter((p) => p.id !== productId);
  saveProducts(products);

  // Automatically remove from Firebase Firestore live cloud database
  removeProductFromCloud(productId).catch((err) => {
    console.warn('Live product deletion notice:', err);
  });

  recordAdminActivity({
    action: 'product_deleted',
    titleEn: `Deleted product: ${deleted?.name || productId}`,
    titleAr: `تم حذف المنتج: ${deleted?.nameAr || deleted?.name || productId}`,
    category: 'catalog',
    severity: 'warning',
    target: deleted ? `${deleted.name} (${productId})` : productId,
    details: deleted
      ? `Removed ${deleted.brand} item ($${deleted.price}) from storefront catalog.`
      : 'Product removed from storefront catalog.',
  }).catch(() => {});
}

// Categories
export function getCategories(): Category[] {
  try {
    const raw = getStorageItem(KEYS.CATEGORIES);
    if (!raw) return INITIAL_CATEGORIES;
    const parsed: Category[] = JSON.parse(raw);
    const existingNames = new Set(parsed.map((c) => c.name.toLowerCase()));
    let changed = false;
    const merged = [...parsed];
    for (const initCat of INITIAL_CATEGORIES) {
      if (!existingNames.has(initCat.name.toLowerCase())) {
        merged.push(initCat);
        existingNames.add(initCat.name.toLowerCase());
        changed = true;
      }
    }
    if (changed) {
      saveCategories(merged);
    }
    return merged;
  } catch {
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  setStorageItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

export function upsertCategory(category: Category): void {
  const categories = getCategories();
  const idx = categories.findIndex((c) => c.id === category.id);
  const isUpdate = idx > -1;
  if (idx > -1) {
    categories[idx] = category;
  } else {
    categories.push(category);
  }
  saveCategories(categories);
  persistCategoryToCloud(category).catch((err) => {
    console.warn('Live category cloud save notice:', err);
  });

  recordAdminActivity({
    action: 'category_saved',
    titleEn: isUpdate ? `Updated category: ${category.name}` : `Created category: ${category.name}`,
    titleAr: isUpdate ? `تم تحديث القسم: ${category.nameAr}` : `تم إنشاء قسم جديد: ${category.nameAr}`,
    category: 'catalog',
    severity: 'info',
    target: `${category.name} (${category.id})`,
    details: `Display order #${category.displayOrder} • Subcategories: ${category.subcategories?.length || 0}`,
  }).catch(() => {});
}

export function deleteCategory(categoryId: string): void {
  const current = getCategories();
  const removed = current.find((c) => c.id === categoryId);
  const categories = current.filter((c) => c.id !== categoryId);
  saveCategories(categories);
  removeCategoryFromCloud(categoryId).catch((err) => {
    console.warn('Live category deletion notice:', err);
  });

  recordAdminActivity({
    action: 'category_deleted',
    titleEn: `Deleted category: ${removed?.name || categoryId}`,
    titleAr: `تم حذف القسم: ${removed?.nameAr || removed?.name || categoryId}`,
    category: 'catalog',
    severity: 'warning',
    target: removed ? `${removed.name} (${categoryId})` : categoryId,
    details: 'Category removed from catalog taxonomy.',
  }).catch(() => {});
}

// Brands
export function getBrands(): Brand[] {
  try {
    const raw = getStorageItem(KEYS.BRANDS);
    if (!raw) return INITIAL_BRANDS;
    const parsed: Brand[] = JSON.parse(raw);
    const existingNames = new Set(parsed.map((b) => b.name.toLowerCase()));
    let changed = false;
    const merged = parsed.map((b) => {
      const upgradedLogo = b.logo ? resolveFullResolutionImageUrl(b.logo) || b.logo : b.logo;
      if (upgradedLogo !== b.logo) {
        changed = true;
        return { ...b, logo: upgradedLogo };
      }
      return b;
    });
    for (const initBrand of INITIAL_BRANDS) {
      if (!existingNames.has(initBrand.name.toLowerCase())) {
        merged.push(initBrand);
        existingNames.add(initBrand.name.toLowerCase());
        changed = true;
      }
    }
    if (changed) {
      saveBrands(merged, false);
    }
    return merged;
  } catch {
    return INITIAL_BRANDS;
  }
}

export function saveBrands(brands: Brand[], recordAudit: boolean = false): void {
  setStorageItem(KEYS.BRANDS, JSON.stringify(brands));
  if (recordAudit) {
    recordAdminActivity({
      action: 'brands_updated',
      titleEn: 'Updated authorized brands list',
      titleAr: 'تم تحديث قائمة الماركات المعتمدة',
      category: 'catalog',
      severity: 'info',
      target: `Brand Directory (${brands.length} brands)`,
      details: 'Catalog brand entries or logos modified by administrator.',
    }).catch(() => {});
  }
}

// Marketing Videos
export function getMarketingVideos(): MarketingVideo[] {
  try {
    const raw = getStorageItem(KEYS.VIDEOS);
    if (!raw) return INITIAL_MARKETING_VIDEOS;
    const parsed: MarketingVideo[] = JSON.parse(raw);
    return parsed.map((v) => ({
      ...v,
      thumbnail: resolveFullResolutionImageUrl(v.thumbnail) || v.thumbnail,
    }));
  } catch {
    return INITIAL_MARKETING_VIDEOS;
  }
}

export function saveMarketingVideos(videos: MarketingVideo[]): void {
  setStorageItem(KEYS.VIDEOS, JSON.stringify(videos));
  recordAdminActivity({
    action: 'content_updated',
    titleEn: 'Updated promotional video showcase',
    titleAr: 'تم تحديث قائمة الفيديوهات الترويجية',
    category: 'content',
    severity: 'info',
    target: `Marketing Videos (${videos.length} videos)`,
    details: 'Video reels / featured storefront media list saved.',
  }).catch(() => {});
}

// Orders & Inventory Logic
export function getOrders(): Order[] {
  try {
    const raw = getStorageItem(KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]): void {
  setStorageItem(KEYS.ORDERS, JSON.stringify(orders));
}

export function createOrder(orderData: Omit<Order, 'id' | 'orderDate' | 'statusHistory'>): Order {
  const orders = getOrders();
  const products = getProducts();

  // Validate stock on server/storage
  for (const item of orderData.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || product.stock < item.quantity) {
      throw new Error(`Insufficient stock for "${item.productName}". Available: ${product ? product.stock : 0}`);
    }
  }

  // Deduct inventory
  const updatedProducts = products.map((product) => {
    const item = orderData.items.find((i) => i.productId === product.id);
    if (item) {
      return {
        ...product,
        stock: Math.max(0, product.stock - item.quantity),
      };
    }
    return product;
  });
  saveProducts(updatedProducts);

  const orderId = `OAA-2027-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newOrder: Order = {
    ...orderData,
    id: orderId,
    orderDate: now,
    statusHistory: [
      {
        status: orderData.status || 'new',
        timestamp: now,
        note: 'Order submitted online',
      },
    ],
  };

  orders.unshift(newOrder);
  saveOrders(orders);

  // Sync to Firestore in background
  if (typeof window !== 'undefined' && !isFirestoreInQuotaCooldown()) {
    setDoc(doc(db, 'orders', newOrder.id), {
          id: newOrder.id,
          customer: newOrder.customer,
          items: newOrder.items,
          subtotal: newOrder.subtotal,
          deliveryFee: newOrder.deliveryFee || 0,
          total: newOrder.total,
          paymentMethod: newOrder.paymentMethod === 'cod' ? 'cod' : newOrder.paymentMethod === 'whish_money' ? 'whish_money' : 'store_pickup',
          status: newOrder.status,
          orderDate: newOrder.orderDate,
          statusHistory: newOrder.statusHistory,
        }).catch((err) => {
          if (isFirestoreQuotaExceededError(err)) {
            markFirestoreQuotaExceeded();
            return;
          }
          console.warn('Firestore order sync:', err);
        });
  }

  return newOrder;
}

export function updateOrderStatus(orderId: string, newStatus: OrderStatus, note?: string): Order | null {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return null;

  const currentOrder = orders[index];
  const oldStatus = currentOrder.status;

  // Restore inventory if transitioning to 'cancelled' or 'returned' from an active status
  if (
    (newStatus === 'cancelled' || newStatus === 'returned') &&
    oldStatus !== 'cancelled' &&
    oldStatus !== 'returned'
  ) {
    const products = getProducts();
    const updatedProducts = products.map((product) => {
      const item = currentOrder.items.find((i) => i.productId === product.id);
      if (item) {
        return {
          ...product,
          stock: product.stock + item.quantity,
        };
      }
      return product;
    });
    saveProducts(updatedProducts);
  }

  // Deduct inventory back if un-cancelling
  if (
    (oldStatus === 'cancelled' || oldStatus === 'returned') &&
    newStatus !== 'cancelled' &&
    newStatus !== 'returned'
  ) {
    const products = getProducts();
    const updatedProducts = products.map((product) => {
      const item = currentOrder.items.find((i) => i.productId === product.id);
      if (item) {
        return {
          ...product,
          stock: Math.max(0, product.stock - item.quantity),
        };
      }
      return product;
    });
    saveProducts(updatedProducts);
  }

  currentOrder.status = newStatus;
  currentOrder.statusHistory.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
    note: note || `Status updated to ${newStatus}`,
  });

  orders[index] = currentOrder;
  saveOrders(orders);

  // Sync to Firestore in background
  if (typeof window !== 'undefined' && !isFirestoreInQuotaCooldown()) {
    updateDoc(doc(db, 'orders', orderId), {
      status: newStatus,
      statusHistory: currentOrder.statusHistory,
    }).catch((err) => {
      if (isFirestoreQuotaExceededError(err)) {
        markFirestoreQuotaExceeded();
        return;
      }
      console.warn('Firestore status update:', err);
    });
  }

  recordAdminActivity({
    action: 'order_status_updated',
    titleEn: `Order ${orderId} status: ${oldStatus} -> ${newStatus}`,
    titleAr: `تحديث حالة الطلب ${orderId}: ${oldStatus} ← ${newStatus}`,
    category: 'orders',
    severity: newStatus === 'cancelled' || newStatus === 'returned' ? 'warning' : 'info',
    target: `Order ${orderId}`,
    details: note
      ? `Customer: ${currentOrder.customer.fullName} • Note: ${note}`
      : `Customer: ${currentOrder.customer.fullName} • Total: $${currentOrder.total}`,
  }).catch(() => {});

  return currentOrder;
}

// Store Settings
export function getStoreSettings(): StoreSettings {
  try {
    const raw = getStorageItem(KEYS.SETTINGS);
    if (!raw) return INITIAL_STORE_SETTINGS;
    const parsed = JSON.parse(raw);
    const merged: StoreSettings = {
      ...INITIAL_STORE_SETTINGS,
      ...parsed,
    };
    // Centralized automatic migration if old branding, phones, or Saida location was retained
    if (!merged.storeName || merged.storeName.includes('ARNAOUT') || merged.storeName.includes('ON 3LAA') || merged.storeName.includes('SQUARE')) {
      merged.storeName = 'ON AlAA STORE';
    }
    if (!merged.storeNameAr || merged.storeNameAr.includes('أرناؤوط') || merged.storeNameAr.includes('ON 3LAA') || merged.storeNameAr === 'متجر ON AlAA') {
      merged.storeNameAr = 'متجر ON AlAA STORE';
    }
    merged.logoUrl = resolveStoreLogoUrl(merged.logoUrl);
    if (!merged.locationEn || merged.locationEn.includes('Saida') || merged.locationEn.includes('H97G+W2P')) {
      merged.locationEn = INITIAL_STORE_SETTINGS.locationEn;
    }
    if (!merged.locationAr || merged.locationAr.includes('صيدا') || merged.locationAr.includes('H97G+W2P')) {
      merged.locationAr = INITIAL_STORE_SETTINGS.locationAr;
    }
    if (!merged.phone || merged.phone.includes('81900916') || merged.phone.includes('03099889') || merged.phone.includes('03986718') || merged.phone.includes('03 986') || merged.phone.includes('3986718') || merged.phone.includes('81 900')) {
      merged.phone = '70773067';
    }
    if (!merged.whatsapp || merged.whatsapp.includes('81900916') || merged.whatsapp.includes('03099889') || merged.whatsapp.includes('9613986718') || merged.whatsapp.includes('03986718')) {
      merged.whatsapp = '96170773067';
    }
    if (!merged.tagline || merged.tagline.includes('Saida') || merged.tagline.includes('صيدا') || merged.tagline.includes('🚚')) {
      merged.tagline = INITIAL_STORE_SETTINGS.tagline;
    }
    if (!merged.taglineAr || merged.taglineAr.includes('صيدا') || merged.taglineAr.includes('🚚')) {
      merged.taglineAr = INITIAL_STORE_SETTINGS.taglineAr;
    }
    // Ensure delivery zones reflect Chouf online store and all-Lebanon delivery
    if (
      !merged.deliveryZones ||
      merged.deliveryZones.length === 0 ||
      merged.deliveryZones.some((z) => z.id.includes('saida'))
    ) {
      merged.deliveryZones = INITIAL_STORE_SETTINGS.deliveryZones;
    }
    // Ensure announcement bar reflects ON AlAA STORE and all-Lebanon delivery
    if (merged.announcementBar && (!merged.announcementBar.textEn || merged.announcementBar.textEn.includes('SAIDA') || merged.announcementBar.textEn.includes('ON 3LAA'))) {
      merged.announcementBar = INITIAL_STORE_SETTINGS.announcementBar;
    }
    // Ensure hero slides reflect ON AlAA STORE and all-Lebanon delivery
    if (merged.heroSlides && merged.heroSlides.some((s) => s.titleEn && (s.titleEn.includes('SAIDA') || s.titleEn.includes('ON 3LAA')))) {
      merged.heroSlides = INITIAL_STORE_SETTINGS.heroSlides;
    }
    if (Array.isArray(merged.heroSlides)) {
      merged.heroSlides = merged.heroSlides.map((slide) => ({
        ...slide,
        image: slide.image ? resolveFullResolutionImageUrl(slide.image) || slide.image : slide.image,
      }));
    }
    // Ensure schedule & display strings migrate off legacy Saida / 8:00 AM / 17-hour text
    if (!merged.openingHoursEn || hasLegacyScheduleText(merged.openingHoursEn)) {
      merged.openingHoursEn = INITIAL_STORE_SETTINGS.openingHoursEn;
    }
    if (!merged.openingHoursAr || hasLegacyScheduleText(merged.openingHoursAr)) {
      merged.openingHoursAr = INITIAL_STORE_SETTINGS.openingHoursAr;
    }
    merged.openingSchedule = migrateOpeningSchedule(
      merged.openingSchedule,
      INITIAL_STORE_SETTINGS.openingSchedule!
    );
    return merged;
  } catch {
    return INITIAL_STORE_SETTINGS;
  }
}

export function saveStoreSettings(
  settings: StoreSettings,
  recordAudit: boolean = true
): SafeStorageSetResult {
  const serialized = JSON.stringify(settings);
  const result = setStorageItem(KEYS.SETTINGS, serialized, () => {
    // If localStorage quota is exceeded (e.g., due to a large inline base64 logo or hero image),
    // compact oversized inline blobs to default assets while preserving all text/schedule settings
    // and keeping the full version in the active session memory cache.
    const { compacted } = compactStoreSettingsPayload(settings, resolveStoreLogoUrl(undefined));
    return JSON.stringify(compacted);
  });

  if (recordAudit) {
    recordAdminActivity({
      action: 'settings_updated',
      titleEn: 'Updated store configuration & delivery settings',
      titleAr: 'تم تحديث إعدادات المتجر والهوية والتوصيل',
      category: 'settings',
      severity: 'info',
      target: settings.storeName || 'ON AlAA STORE',
      details: `Phone: ${settings.phone || '—'} • Hours: ${settings.openingSchedule?.openTime || '10:00'}–${settings.openingSchedule?.closeTime || '01:00'} • Zones: ${settings.deliveryZones?.length || 0}`,
    }).catch(() => {});
  }

  return result;
}

export function saveAnnouncementBar(bar: StoreSettings['announcementBar']): void {
  const settings = getStoreSettings();
  settings.announcementBar = bar;
  saveStoreSettings(settings, false);

  recordAdminActivity({
    action: 'content_updated',
    titleEn: bar?.enabled ? 'Updated & enabled announcement bar' : 'Updated announcement bar (disabled)',
    titleAr: 'تم تحديث شريط الإعلانات العلوي',
    category: 'content',
    severity: 'info',
    target: 'Top Announcement Bar',
    details: bar?.textEn || 'Announcement bar banner updated.',
  }).catch(() => {});
}

// File / Image reading helper preserving original full 4K resolution without downscaling or lossy compression
export function readFileAsDataUrl(file: File): Promise<string> {
  // 10MB limit check
  if (file.size > 10 * 1024 * 1024) {
    return Promise.reject(new Error('File exceeds maximum size of 10MB'));
  }
  return optimizeUploadedImage(file, {
    maxDimension: 3840,
    preserveOriginal: true,
  });
}

// ============================================================================
// CUSTOMER TESTIMONIALS & STORE FEEDBACK STORAGE
// ============================================================================

export function getTestimonials(): Testimonial[] {
  if (typeof window === 'undefined') return [];
  const raw = getStorageItem(KEYS.TESTIMONIALS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveTestimonials(testimonials: Testimonial[]): void {
  if (typeof window === 'undefined') return;
  setStorageItem(KEYS.TESTIMONIALS, JSON.stringify(testimonials));
}

export function addTestimonial(testimonialData: Omit<Testimonial, 'id' | 'date'>): Testimonial {
  const testimonials = getTestimonials();
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const newTestimonial: Testimonial = {
    ...testimonialData,
    id: `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: dateFormatted,
  };
  testimonials.unshift(newTestimonial);
  saveTestimonials(testimonials);
  return newTestimonial;
}

// ============================================================================
// PRODUCT REVIEW STORAGE & RATING RECALCULATION
// ============================================================================

export function addProductReview(
  productId: string,
  reviewData: { userName: string; rating: number; comment: string }
): { review: Review; updatedProduct: Product } | null {
  const products = getProducts();
  const productIndex = products.findIndex((p) => p.id === productId);
  if (productIndex === -1) return null;

  const product = products[productIndex];
  const reviews = Array.isArray(product.reviews) ? [...product.reviews] : [];
  const newReview: Review = {
    id: `rev-${Date.now()}`,
    userName: reviewData.userName.trim(),
    rating: reviewData.rating,
    comment: reviewData.comment.trim(),
    date: new Date().toISOString().split('T')[0],
    verifiedPurchase: true,
  };

  reviews.unshift(newReview);
  const newCount = reviews.length;
  const newRating = Number((reviews.reduce((sum, r) => sum + r.rating, 0) / newCount).toFixed(1));

  const updatedProduct: Product = {
    ...product,
    reviews,
    reviewCount: newCount,
    rating: newRating,
  };

  products[productIndex] = updatedProduct;
  saveProducts(products);

  // Sync updated rating and reviewCount to Firestore
  persistProductToCloud(updatedProduct).catch((err) =>
    console.warn('Firestore product review sync notice:', err)
  );

  return { review: newReview, updatedProduct };
}

