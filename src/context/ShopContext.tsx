import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Product,
  Category,
  Brand,
  MarketingVideo,
  CartItem,
  Order,
  StoreSettings,
  Language,
  ProductVariant,
} from '../types';
import { translations } from '../locales/translations';
import {
  initStorage,
  getProducts,
  getCategories,
  getBrands,
  getMarketingVideos,
  getStoreSettings,
  createOrder as createOrderStorage,
  saveProducts,
} from '../services/storageService';
import {
  subscribeToLiveProducts,
  seedInitialProductsToCloud,
} from '../services/productFirestoreService';
import { validateAddToCompare, toggleCompareList } from '../utils/compareHelpers';
import {
  RECENTLY_VIEWED_STORAGE_KEY,
  recordRecentlyViewedId,
  parseStoredRecentlyViewedIds,
  resolveRecentlyViewedProducts,
} from '../utils/recentlyViewedHelpers';
import { safeStorageSetItem } from '../utils/storageQuotaHelpers';
import {
  applyDocumentLanguageDirection,
  normalizeLanguage,
} from '../utils/languageToggleHelpers';

interface ShopContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.en;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  marketingVideos: MarketingVideo[];
  storeSettings: StoreSettings;
  refreshData: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, color?: string, variant?: ProductVariant) => void;
  removeFromCart: (productId: string, color?: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, color?: string, variantId?: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Compare Products (Max 3)
  compareList: Product[];
  addToCompare: (product: Product) => { success: boolean; message?: string };
  removeFromCompare: (productId: string) => void;
  clearCompareList: () => void;
  toggleCompare: (product: Product) => void;
  isInCompare: (productId: string) => boolean;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;

  // Navigation & Filtering
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedProductId: string | null;
  viewProductDetail: (productId: string, openAsModal?: boolean) => void;
  selectedCategorySlug: string | null;
  selectCategory: (slug: string | null) => void;
  selectedBrandName: string | null;
  selectBrand: (brandName: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Modals & Active state
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  recentlyViewedProducts: Product[];
  recordProductView: (productId: string) => void;
  removeFromRecentlyViewed: (productId: string) => void;
  clearRecentlyViewed: () => void;
  lastCompletedOrder: Order | null;
  setLastCompletedOrder: (order: Order | null) => void;
  submitOrder: (orderData: Omit<Order, 'id' | 'orderDate' | 'statusHistory'>) => Order;
  generateWhatsAppOrderUrl: (order: Partial<Order> | { items: CartItem[]; customer?: any; total?: number }) => string;

  // Theme / Dark Mode
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      try {
        return normalizeLanguage(localStorage.getItem('arnaout_lang'));
      } catch {
        return 'en';
      }
    }
    return 'en';
  });

  // Dark Mode Theme State & Persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('arnaout_theme');
        if (saved) return saved === 'dark';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch {
        return false;
      }
    }
    return false;
  });

  // Synchronize document.documentElement 'dark' class
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDarkMode) {
        root.classList.add('dark');
        safeStorageSetItem(typeof window !== 'undefined' ? window.localStorage : null, 'arnaout_theme', 'dark');
      } else {
        root.classList.remove('dark');
        safeStorageSetItem(typeof window !== 'undefined' ? window.localStorage : null, 'arnaout_theme', 'light');
      }
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
  const setDarkMode = (dark: boolean) => setIsDarkMode(dark);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [marketingVideos, setMarketingVideos] = useState<MarketingVideo[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getStoreSettings());

  // Views & Routing state
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart & Wishlist
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('arnaout_cart');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('arnaout_wishlist');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [quickViewProduct, setQuickViewProductState] = useState<Product | null>(null);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return parseStoredRecentlyViewedIds(localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY));
      } catch {
        return [];
      }
    }
    return [];
  });
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);

  // Compare Products State & Persistence (up to 3 products)
  const [compareList, setCompareList] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('arnaout_compare_list');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        safeStorageSetItem(window.localStorage, 'arnaout_compare_list', JSON.stringify(compareList));
      } catch {
        // storage fallback
      }
    }
  }, [compareList]);

  const addToCompare = (product: Product) => {
    const validation = validateAddToCompare(compareList, product);
    if (!validation.canAdd) {
      return {
        success: false,
        message: lang === 'ar' ? validation.messageAr : validation.messageEn,
      };
    }
    setCompareList((prev) => [...prev, product]);
    return { success: true };
  };

  const removeFromCompare = (productId: string) => {
    setCompareList((prev) => prev.filter((p) => p.id !== productId));
  };

  const clearCompareList = () => {
    setCompareList([]);
  };

  const toggleCompare = (product: Product) => {
    const res = toggleCompareList(compareList, product);
    setCompareList(res.updatedList);
  };

  const isInCompare = (productId: string) => {
    return compareList.some((p) => p.id === productId);
  };

  // Initialize data on mount and subscribe to real-time live product updates
  useEffect(() => {
    initStorage();
    refreshData();

    // Attach real-time cloud listener for live updates across all devices
    const unsubscribe = subscribeToLiveProducts(
      (liveProducts) => {
        if (liveProducts && liveProducts.length > 0) {
          setProducts(liveProducts);
          saveProducts(liveProducts);
        }
      },
      () => {
        // If cloud database is empty, seed initial catalog
        seedInitialProductsToCloud().catch(console.error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Update HTML direction and .rtl class when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      applyDocumentLanguageDirection(lang, document.documentElement, document.body);
    }
    safeStorageSetItem(typeof window !== 'undefined' ? window.localStorage : null, 'arnaout_lang', lang);
  }, [lang]);

  // Persist cart
  useEffect(() => {
    safeStorageSetItem(typeof window !== 'undefined' ? window.localStorage : null, 'arnaout_cart', JSON.stringify(cart));
  }, [cart]);

  // Persist wishlist
  useEffect(() => {
    safeStorageSetItem(typeof window !== 'undefined' ? window.localStorage : null, 'arnaout_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Persist recently viewed product IDs (max 5)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeStorageSetItem(window.localStorage, RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(recentlyViewedIds));
    }
  }, [recentlyViewedIds]);

  const recordProductView = (productId: string) => {
    setRecentlyViewedIds((prev) => recordRecentlyViewedId(prev, productId));
  };

  const removeFromRecentlyViewed = (productId: string) => {
    setRecentlyViewedIds((prev) => prev.filter((id) => id !== productId));
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewedIds([]);
  };

  const setQuickViewProduct = (product: Product | null) => {
    if (product?.id) {
      recordProductView(product.id);
    }
    setQuickViewProductState(product);
  };

  const recentlyViewedProducts = resolveRecentlyViewedProducts(recentlyViewedIds, products);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const refreshData = () => {
    setProducts(getProducts());
    setCategories(getCategories());
    setBrands(getBrands());
    setMarketingVideos(getMarketingVideos());
    setStoreSettings(getStoreSettings());
  };

  const addToCart = (product: Product, quantity = 1, color?: string, variant?: ProductVariant) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor === color &&
          item.selectedVariant?.id === variant?.id
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        // Don't exceed available stock
        const maxStock = variant ? variant.stock : product.stock;
        updated[existingIndex].quantity = Math.min(newQty, maxStock);
        return updated;
      } else {
        return [...prev, { product, quantity, selectedColor: color, selectedVariant: variant }];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, color?: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.selectedColor === color &&
            item.selectedVariant?.id === variantId
          )
      )
    );
  };

  const updateCartQuantity = (productId: string, quantity: number, color?: string, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, color, variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (
          item.product.id === productId &&
          item.selectedColor === color &&
          item.selectedVariant?.id === variantId
        ) {
          const maxStock = item.selectedVariant ? item.selectedVariant.stock : item.product.stock;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
    return sum + itemPrice * item.quantity;
  }, 0);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const viewProductDetail = (productId: string, openAsModal = true) => {
    if (productId) {
      recordProductView(productId);
    }
    setSelectedProductId(productId);
    const p = products.find((item) => item.id === productId);
    if (openAsModal && p) {
      setQuickViewProductState(p);
    } else {
      setCurrentView('product-detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectCategory = (slug: string | null) => {
    setSelectedCategorySlug(slug);
    setSelectedBrandName(null);
    if (slug) {
      setSearchQuery('');
    }
    setCurrentView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectBrand = (brandName: string | null) => {
    setSelectedBrandName(brandName);
    setSelectedCategorySlug(null);
    if (brandName) {
      setSearchQuery('');
    }
    setCurrentView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitOrder = (orderData: Omit<Order, 'id' | 'orderDate' | 'statusHistory'>): Order => {
    const order = createOrderStorage(orderData);
    setLastCompletedOrder(order);
    clearCart();
    refreshData(); // Refresh product stocks
    return order;
  };

  // Generate WhatsApp Order link for store
  const generateWhatsAppOrderUrl = (order: any): string => {
    const phone = storeSettings.whatsapp || '9613986718';
    let text = `*New Order Inquiry - ${storeSettings.storeName || 'ON AlAA STORE'} (${storeSettings.phone || '03 986 718'})* 🏠\n\n`;

    if (order.id) {
      text += `*Order Reference:* ${order.id}\n`;
    }
    if (order.customer?.fullName) {
      text += `*Customer:* ${order.customer.fullName}\n`;
      text += `*Phone:* ${order.customer.phone}\n`;
      text += `*Area:* ${order.customer.cityArea}\n`;
      text += `*Address:* ${order.customer.addressLine}\n\n`;
    }

    text += `*Ordered Items:*\n`;
    const items = order.items || cart;
    items.forEach((item: any, idx: number) => {
      const name = item.productName || item.product?.name;
      const price = item.price || (item.selectedVariant ? item.selectedVariant.price : item.product.price);
      const color = item.color || item.selectedColor ? ` (${item.color || item.selectedColor})` : '';
      text += `${idx + 1}. ${name}${color} x${item.quantity} - $${price * item.quantity}\n`;
    });

    const total = order.total !== undefined ? order.total : cartSubtotal;
    text += `\n*Total Amount:* $${total} USD`;
    if (order.paymentMethod) {
      text += `\n*Payment Method:* ${order.paymentMethod.toUpperCase()}`;
    }
    text += `\n\n_Thank you for contacting ${storeSettings.storeName || 'ON AlAA STORE'} (Chouf • All Lebanon Delivery)!_`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const t = translations[lang];

  return (
    <ShopContext.Provider
      value={{
        lang,
        setLang,
        t,
        products,
        categories,
        brands,
        marketingVideos,
        storeSettings,
        refreshData,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        wishlist,
        toggleWishlist,
        isInWishlist,
        compareList,
        addToCompare,
        removeFromCompare,
        clearCompareList,
        toggleCompare,
        isInCompare,
        isCompareModalOpen,
        setIsCompareModalOpen,
        currentView,
        setCurrentView,
        selectedProductId,
        viewProductDetail,
        selectedCategorySlug,
        selectCategory,
        selectedBrandName,
        selectBrand,
        searchQuery,
        setSearchQuery,
        quickViewProduct,
        setQuickViewProduct,
        recentlyViewedProducts,
        recordProductView,
        removeFromRecentlyViewed,
        clearRecentlyViewed,
        lastCompletedOrder,
        setLastCompletedOrder,
        submitOrder,
        generateWhatsAppOrderUrl,
        isDarkMode,
        toggleDarkMode,
        setDarkMode,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
