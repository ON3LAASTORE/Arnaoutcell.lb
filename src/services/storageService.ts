import { Product, Category, Brand, MarketingVideo, Order, StoreSettings, OrderStatus } from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_PRODUCTS,
  INITIAL_MARKETING_VIDEOS,
  INITIAL_STORE_SETTINGS,
} from '../data/initialData';

const KEYS = {
  PRODUCTS: 'arnaout_cell_products_v2',
  CATEGORIES: 'arnaout_cell_categories_v2',
  BRANDS: 'arnaout_cell_brands_v2',
  VIDEOS: 'arnaout_cell_videos_v2',
  ORDERS: 'arnaout_cell_orders_v2',
  SETTINGS: 'arnaout_cell_settings_v2',
  WISHLIST: 'arnaout_cell_wishlist_v2',
  CART: 'arnaout_cell_cart_v2',
};

// Initialize if empty
export function initStorage(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(KEYS.PRODUCTS)) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(KEYS.CATEGORIES)) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!localStorage.getItem(KEYS.BRANDS)) {
    localStorage.setItem(KEYS.BRANDS, JSON.stringify(INITIAL_BRANDS));
  }
  if (!localStorage.getItem(KEYS.VIDEOS)) {
    localStorage.setItem(KEYS.VIDEOS, JSON.stringify(INITIAL_MARKETING_VIDEOS));
  }
  if (!localStorage.getItem(KEYS.SETTINGS)) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_STORE_SETTINGS));
  }
  if (!localStorage.getItem(KEYS.ORDERS)) {
    // Seed sample initial orders for demonstration in Saida
    const sampleOrders: Order[] = [
      {
        id: 'ARN-2027-1001',
        customer: {
          fullName: 'Sami Khoury',
          phone: '03 123 456',
          cityArea: 'Saida - Store Pickup (Nijme Square)',
          addressLine: 'Nijme Square, Main Road',
          notes: 'Customer will pick up at 5 PM',
        },
        items: [
          {
            productId: 'prod-iphone16promax',
            productName: 'Apple iPhone 16 Pro Max 256GB Desert Titanium',
            brand: 'Apple',
            price: 1249,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
            color: 'Desert Titanium',
          },
        ],
        subtotal: 1249,
        discount: 0,
        deliveryFee: 0,
        total: 1249,
        currency: 'USD',
        status: 'delivered',
        paymentMethod: 'store_pickup',
        paymentStatus: 'paid',
        orderDate: '2026-10-10T14:20:00Z',
        statusHistory: [
          { status: 'new', timestamp: '2026-10-10T14:20:00Z' },
          { status: 'confirmed', timestamp: '2026-10-10T14:25:00Z' },
          { status: 'ready_for_delivery', timestamp: '2026-10-10T15:00:00Z' },
          { status: 'delivered', timestamp: '2026-10-10T17:10:00Z', note: 'Picked up in Saida store' },
        ],
      },
      {
        id: 'ARN-2027-1002',
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
            image: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=800&auto=format&fit=crop&q=80',
          },
          {
            productId: 'prod-greenlionsmartwatch',
            productName: 'Green Lion Signature Ultra 2 Smartwatch AMOLED 49mm',
            brand: 'Green Lion',
            price: 59,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
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
    ];
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(sampleOrders));
  }
}

// Products
export function getProducts(): Product[] {
  try {
    const raw = localStorage.getItem(KEYS.PRODUCTS);
    return raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
}

export function saveProduct(product: Product): Product {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.unshift(product);
  }
  saveProducts(products);
  return product;
}

export function deleteProduct(productId: string): void {
  const products = getProducts().filter((p) => p.id !== productId);
  saveProducts(products);
}

// Categories
export function getCategories(): Category[] {
  try {
    const raw = localStorage.getItem(KEYS.CATEGORIES);
    return raw ? JSON.parse(raw) : INITIAL_CATEGORIES;
  } catch {
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

// Brands
export function getBrands(): Brand[] {
  try {
    const raw = localStorage.getItem(KEYS.BRANDS);
    return raw ? JSON.parse(raw) : INITIAL_BRANDS;
  } catch {
    return INITIAL_BRANDS;
  }
}

export function saveBrands(brands: Brand[]): void {
  localStorage.setItem(KEYS.BRANDS, JSON.stringify(brands));
}

// Marketing Videos
export function getMarketingVideos(): MarketingVideo[] {
  try {
    const raw = localStorage.getItem(KEYS.VIDEOS);
    return raw ? JSON.parse(raw) : INITIAL_MARKETING_VIDEOS;
  } catch {
    return INITIAL_MARKETING_VIDEOS;
  }
}

export function saveMarketingVideos(videos: MarketingVideo[]): void {
  localStorage.setItem(KEYS.VIDEOS, JSON.stringify(videos));
}

// Orders & Inventory Logic
export function getOrders(): Order[] {
  try {
    const raw = localStorage.getItem(KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]): void {
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
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

  const orderId = `ARN-2027-${Math.floor(1000 + Math.random() * 9000)}`;
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
  return currentOrder;
}

// Store Settings
export function getStoreSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return INITIAL_STORE_SETTINGS;
    const parsed = JSON.parse(raw);
    const merged: StoreSettings = {
      ...INITIAL_STORE_SETTINGS,
      ...parsed,
    };
    // Centralized automatic migration if old default name was retained
    if (!merged.storeName || merged.storeName.trim().toLowerCase() === 'arnaout cell') {
      merged.storeName = 'ARNAOUT STORE';
    }
    if (!merged.storeNameAr || merged.storeNameAr.trim() === 'أرناؤوط سيل') {
      merged.storeNameAr = 'أرناؤوط ستور';
    }
    if (!merged.tagline) {
      merged.tagline = 'Your Home in Electronics 🏠';
    }
    if (!merged.taglineAr) {
      merged.taglineAr = 'بيتك في عالم الإلكترونيات 🏠';
    }
    // Ensure schedule is properly structured
    if (!merged.openingSchedule) {
      merged.openingSchedule = INITIAL_STORE_SETTINGS.openingSchedule;
    }
    return merged;
  } catch {
    return INITIAL_STORE_SETTINGS;
  }
}

export function saveStoreSettings(settings: StoreSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function saveAnnouncementBar(bar: StoreSettings['announcementBar']): void {
  const settings = getStoreSettings();
  settings.announcementBar = bar;
  saveStoreSettings(settings);
}

// File / Image reading helper with persistent Base64 Data URL
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // 10MB limit check
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('File exceeds maximum size of 10MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
