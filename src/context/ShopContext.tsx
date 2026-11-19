import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  saveCategories,
} from '../services/storageService';
import {
  subscribeToLiveProducts,
  seedInitialProductsToCloud,
} from '../services/productFirestoreService';
import {
  fetchDynamicCategories,
  subscribeToLiveCategories,
  seedInitialCategoriesToCloud,
} from '../services/categoryFirestoreService';
import {
  validateAddToCompare,
  toggleCompareList,
  assignCompareSlot,
  swapComparePair as swapComparePairHelper,
} from '../utils/compareHelpers';
import {
  RECENTLY_VIEWED_STORAGE_KEY,
  recordRecentlyViewedId,
  parseStoredRecentlyViewedIds,
  resolveRecentlyViewedProducts,
} from '../utils/recentlyViewedHelpers';
import { safeStorageSetItem } from '../utils/storageQuotaHelpers';
import {
  parseStoredWishlistIds,
  toggleWishlistProductId,
} from '../utils/wishlistHelpers';
import {
  LANGUAGE_STORAGE_KEY,
  DIRECTION_TRANSITION_DURATION_MS,
  applyDocumentLanguageDirection,
  normalizeLanguage,
  readStoredLanguage,
  persistStoredLanguage,
  syncLanguageSettingImmediately,
} from '../utils/languageToggleHelpers';
import { ProductCollectionPreset } from '../utils/navbarMenuHelpers';
import { extractResetTokenFromLocation } from '../services/authService';

interface ShopContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isSwitchingLanguage: boolean;
  t: typeof translations.en;
  products: Product[];
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  refreshCategories: () => Promise<void>;
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

  // Compare Products (Max 3, with dedicated 2-slot side-by-side actions)
  compareList: Product[];
  addToCompare: (product: Product) => { success: boolean; message?: string };
  removeFromCompare: (productId: string) => void;
  clearCompareList: () => void;
  toggleCompare: (product: Product) => void;
  selectCompareSlot: (slotIndex: 0 | 1, product: Product) => void;
  swapComparePair: () => void;
  setComparePair: (pair: Product[]) => void;
  isInCompare: (productId: string) => boolean;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;
  isQrScannerOpen: boolean;
  setIsQrScannerOpen: (open: boolean) => void;

  // Navigation & Filtering
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedProductId: string | null;
  viewProductDetail: (productId: string, openAsModal?: boolean) => void;
  selectedCategorySlug: string | null;
  selectCategory: (slug: string | null) => void;
  selectedBrandName: string | null;
  selectBrand: (brandName: string | null) => void;
  productCollectionPreset: ProductCollectionPreset;
  setProductCollectionPreset: (preset: ProductCollectionPreset) => void;
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
      const initial = readStoredLanguage(window.localStorage);
      if (typeof document !== 'undefined') {
        applyDocumentLanguageDirection(initial, document.documentElement, document.body);
      }
      return initial;
    }
    return 'en';
  });
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState<boolean>(false);
  const langTransitionTimerRef = useRef<number | null>(null);

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
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [marketingVideos, setMarketingVideos] = useState<MarketingVideo[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getStoreSettings());

  // Views & Routing state
  const [currentView, setCurrentView] = useState<string>(() =>
    extractResetTokenFromLocation() ? 'admin' : 'home'
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState<string | null>(null);
  const [productCollectionPreset, setProductCollectionPreset] = useState<ProductCollectionPreset>('all');
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
        return parseStoredWishlistIds(localStorage.getItem('arnaout_wishlist'));
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
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);

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

  const selectCompareSlot = (slotIndex: 0 | 1, product: Product) => {
    setCompareList((prev) => assignCompareSlot(prev, slotIndex, product));
  };

  const swapComparePair = () => {
    setCompareList((prev) => swapComparePairHelper(prev));
  };

  const setComparePair = (pair: Product[]) => {
    setCompareList(pair.slice(0, 2));
  };

  const isInCompare = (productId: string) => {
    return compareList.some((p) => p.id === productId);
  };

  const refreshCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const liveCategories = await fetchDynamicCategories();
      if (liveCategories.length > 0) {
        setCategories(liveCategories);
        saveCategories(liveCategories);
      }
    } catch (err) {
      setCategoriesError(err instanceof Error ? err.message : 'Unable to load categories.');
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Initialize data on mount and subscribe to real-time live product and category updates
  useEffect(() => {
    initStorage();
    refreshData();
    void refreshCategories();

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const deepLinkedProductId = params.get('product');
        if (deepLinkedProductId && deepLinkedProductId.trim()) {
          setSelectedProductId(deepLinkedProductId.trim());
          setCurrentView('product-detail');
        }
      } catch {
        // Ignore malformed URL query
      }
    }

    // Attach real-time cloud listeners for live updates across all devices
    const unsubscribeProducts = subscribeToLiveProducts(
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

    const unsubscribeCategories = subscribeToLiveCategories(
      (liveCategories) => {
        if (liveCategories && liveCategories.length > 0) {
          setCategories(liveCategories);
          saveCategories(liveCategories);
          setCategoriesLoading(false);
          setCategoriesError(null);
        }
      },
      () => {
        seedInitialCategoriesToCloud().catch(console.error);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, []);

  // Keep HTML lang, dir, .rtl/.dir-transitioning classes, and localStorage synchronized globally
  useEffect(() => {
    if (typeof document !== 'undefined') {
      applyDocumentLanguageDirection(lang, document.documentElement, document.body, {
        isTransitioning: isSwitchingLanguage,
      });
    }
    persistStoredLanguage(typeof window !== 'undefined' ? window.localStorage : null, lang);
  }, [lang, isSwitchingLanguage]);

  // Synchronize language setting across tabs/windows when storage changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY && event.newValue) {
        const synced = normalizeLanguage(event.newValue);
        setLangState(synced);
        if (typeof document !== 'undefined') {
          applyDocumentLanguageDirection(synced, document.documentElement, document.body);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (langTransitionTimerRef.current !== null) {
        window.clearTimeout(langTransitionTimerRef.current);
      }
    };
  }, []);

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
    const normalized = typeof productId === 'string' ? productId.trim() : '';
    if (!normalized) return;
    setRecentlyViewedIds((prev) => (prev[0] === normalized ? prev : recordRecentlyViewedId(prev, normalized)));
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
    const normalized = normalizeLanguage(newLang);
    if (normalized === lang) {
      // Still guarantee storage and document lang remain in sync if externally modified
      syncLanguageSettingImmediately({
        nextLang: normalized,
        storage: typeof window !== 'undefined' ? window.localStorage : null,
        htmlEl: typeof document !== 'undefined' ? document.documentElement : null,
        bodyEl: typeof document !== 'undefined' ? document.body : null,
      });
      return;
    }

    // Persist in localStorage and update html[lang], dir, and .rtl immediately upon toggle
    syncLanguageSettingImmediately({
      nextLang: normalized,
      storage: typeof window !== 'undefined' ? window.localStorage : null,
      htmlEl: typeof document !== 'undefined' ? document.documentElement : null,
      bodyEl: typeof document !== 'undefined' ? document.body : null,
      isTransitioning: true,
    });

    setIsSwitchingLanguage(true);
    setLangState(normalized);

    if (typeof window !== 'undefined') {
      if (langTransitionTimerRef.current !== null) {
        window.clearTimeout(langTransitionTimerRef.current);
      }
      langTransitionTimerRef.current = window.setTimeout(() => {
        setIsSwitchingLanguage(false);
        langTransitionTimerRef.current = null;
      }, DIRECTION_TRANSITION_DURATION_MS);
    } else {
      setIsSwitchingLanguage(false);
    }
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
    setWishlist((prev) => toggleWishlistProductId(prev, productId));
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
    setProductCollectionPreset('all');
    if (slug) {
      setSearchQuery('');
    }
    setCurrentView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectBrand = (brandName: string | null) => {
    setSelectedBrandName(brandName);
    setSelectedCategorySlug(null);
    setProductCollectionPreset('all');
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
    const phone = storeSettings.whatsapp || '96170773067';
    let text = `*New Order Inquiry - ${storeSettings.storeName || 'ON AlAA STORE'} (${storeSettings.phone || '70 773 067'})* 🏠\n\n`;

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
        isSwitchingLanguage,
        t,
        products,
        categories,
        categoriesLoading,
        categoriesError,
        refreshCategories,
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
        selectCompareSlot,
        swapComparePair,
        setComparePair,
        isInCompare,
        isCompareModalOpen,
        setIsCompareModalOpen,
        isQrScannerOpen,
        setIsQrScannerOpen,
        currentView,
        setCurrentView,
        selectedProductId,
        viewProductDetail,
        selectedCategorySlug,
        selectCategory,
        selectedBrandName,
        selectBrand,
        productCollectionPreset,
        setProductCollectionPreset,
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
