import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
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
import { fetchDynamicCategories } from '../services/categoryFirestoreService';
import { initializeStorefrontData } from '../services/storefrontDataService';
import { deriveSpecialOfferProducts, storefrontCache } from '../utils/storefrontCacheHelpers';
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
import {
  PromoValidationResult,
  resolveCartItemUnitPrice,
  sanitizeCartQuantity,
  validateAndCalculatePromoDiscount,
} from '../utils/checkoutHelpers';

interface ShopContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isSwitchingLanguage: boolean;
  t: typeof translations.en;
  products: Product[];
  offers: Product[];
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  refreshCategories: (force?: boolean) => Promise<void>;
  brands: Brand[];
  marketingVideos: MarketingVideo[];
  storeSettings: StoreSettings;
  storefrontLoading: boolean;
  storefrontStale: boolean;
  storefrontError: string | null;
  refreshStorefront: (force?: boolean) => Promise<void>;
  refreshData: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (
    product: Product,
    quantity?: number,
    color?: string,
    variant?: ProductVariant,
    colorImage?: string,
    colorPriceAdjustment?: number
  ) => void;
  removeFromCart: (productId: string, color?: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, color?: string, variantId?: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  promoCode: string;
  cartDiscount: number;
  applyPromoCode: (code: string, deliveryFee?: number) => PromoValidationResult;
  clearPromoCode: () => void;
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
  isQuickSearchOpen: boolean;
  setIsQuickSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Navigation & Filtering
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedProductId: string | null;
  selectedVariantId: string | null;
  viewProductDetail: (productId: string, openAsModal?: boolean, variantId?: string) => void;
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
  generateWhatsAppOrderUrl: (
    order:
      | Partial<Order>
      | {
          items: CartItem[];
          customer?: Partial<Order['customer']>;
          total?: number;
          discount?: number;
          paymentMethod?: Order['paymentMethod'];
        }
  ) => string;

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
  const [offers, setOffers] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [marketingVideos, setMarketingVideos] = useState<MarketingVideo[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getStoreSettings());
  const [storefrontLoading, setStorefrontLoading] = useState<boolean>(true);
  const [storefrontStale, setStorefrontStale] = useState<boolean>(false);
  const [storefrontError, setStorefrontError] = useState<string | null>(null);

  // Views & Routing state
  const [currentView, setCurrentView] = useState<string>(() =>
    extractResetTokenFromLocation() ? 'admin' : 'home'
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
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
  const [promoCode, setPromoCode] = useState<string>('');
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
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);

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

  const refreshData = useCallback(() => {
    const cachedProducts = storefrontCache.readEntry<Product[]>('products')?.data;
    const latestProducts = cachedProducts && cachedProducts.length > 0 ? cachedProducts : getProducts();
    const cachedOffers = storefrontCache.readEntry<Product[]>('offers')?.data;
    const latestOffers = cachedOffers ?? deriveSpecialOfferProducts(latestProducts);
    const cachedCategories = storefrontCache.readEntry<Category[]>('categories')?.data;
    const latestCategories =
      cachedCategories && cachedCategories.length > 0 ? cachedCategories : getCategories();
    const cachedBrands = storefrontCache.readEntry<Brand[]>('brands')?.data;
    const latestBrands = cachedBrands && cachedBrands.length > 0 ? cachedBrands : getBrands();

    setProducts(latestProducts);
    setOffers(latestOffers);
    setCategories(latestCategories);
    setBrands(latestBrands);
    setMarketingVideos(getMarketingVideos());
    setStoreSettings(getStoreSettings());
  }, []);

  const refreshCategories = useCallback(async (force = false) => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const liveCategories = await fetchDynamicCategories({ forceRefresh: force });
      if (liveCategories.length > 0) {
        setCategories(liveCategories);
        saveCategories(liveCategories);
      }
    } catch (err) {
      setCategoriesError(err instanceof Error ? err.message : 'Unable to load categories.');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const refreshStorefront = useCallback(async (force = false) => {
    setStorefrontLoading(true);
    setCategoriesLoading(true);
    setStorefrontError(null);
    setCategoriesError(null);
    try {
      const snapshot = await initializeStorefrontData({ forceRefresh: force });
      if (snapshot.products.length > 0) {
        setProducts(snapshot.products);
        setOffers(snapshot.offers);
        saveProducts(snapshot.products);
      }
      if (snapshot.categories.length > 0) {
        setCategories(snapshot.categories);
        saveCategories(snapshot.categories);
      }
      if (snapshot.brands.length > 0) {
        setBrands(snapshot.brands);
      }
      setStorefrontStale(snapshot.isStale);
      if (snapshot.error) {
        setStorefrontError(snapshot.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load storefront catalog.';
      setStorefrontError(msg);
      setCategoriesError(msg);
      setStorefrontStale(true);
    } finally {
      setStorefrontLoading(false);
      setCategoriesLoading(false);
    }
  }, []);

  // Batched storefront initialization on mount using cache-first TTL + deduplicated getDocs
  // (avoids multiple concurrent cold queries and open-ended storefront onSnapshot listeners)
  useEffect(() => {
    initStorage();
    refreshData();

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

    let isMounted = true;
    setStorefrontLoading(true);
    setCategoriesLoading(true);

    initializeStorefrontData()
      .then((snapshot) => {
        if (!isMounted) return;
        if (snapshot.products.length > 0) {
          setProducts(snapshot.products);
          setOffers(snapshot.offers);
          if (!snapshot.fromCache) {
            saveProducts(snapshot.products);
          }
        }
        if (snapshot.categories.length > 0) {
          setCategories(snapshot.categories);
          if (!snapshot.fromCache) {
            saveCategories(snapshot.categories);
          }
        }
        if (snapshot.brands.length > 0) {
          setBrands(snapshot.brands);
        }
        setStorefrontStale(snapshot.isStale);
        setStorefrontError(snapshot.error);
        setCategoriesError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load storefront catalog.';
        setStorefrontError(msg);
        setCategoriesError(msg);
        setStorefrontStale(true);
      })
      .finally(() => {
        if (isMounted) {
          setStorefrontLoading(false);
          setCategoriesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshData]);

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

  // Persist cart & reset promo code if cart becomes empty
  useEffect(() => {
    safeStorageSetItem(typeof window !== 'undefined' ? window.localStorage : null, 'arnaout_cart', JSON.stringify(cart));
    if (cart.length === 0 && promoCode) {
      setPromoCode('');
    }
  }, [cart, promoCode]);

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
    setSelectedVariantId(null);
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

  // State refresh handler lives above initialization effect so effects keep stable reference

  const addToCart = (
    product: Product,
    quantity = 1,
    color?: string,
    variant?: ProductVariant,
    colorImage?: string,
    colorPriceAdjustment?: number
  ) => {
    const maxStock = variant ? variant.stock : product.stock;
    const boundedInitialQty = sanitizeCartQuantity(quantity, maxStock);
    if (boundedInitialQty <= 0) {
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor === color &&
          item.selectedVariant?.id === variant?.id
      );

      const hasAdj =
        typeof colorPriceAdjustment === 'number' &&
        Number.isFinite(colorPriceAdjustment) &&
        colorPriceAdjustment !== 0;

      if (existingIndex > -1) {
        const updated = [...prev];
        const nextQty = sanitizeCartQuantity(updated[existingIndex].quantity + boundedInitialQty, maxStock);
        if (nextQty <= 0) {
          return prev;
        }
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: nextQty,
          ...(colorImage ? { selectedColorImage: colorImage } : {}),
          ...(hasAdj ? { colorPriceAdjustment } : {}),
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: boundedInitialQty,
            selectedColor: color,
            selectedVariant: variant,
            ...(colorImage ? { selectedColorImage: colorImage } : {}),
            ...(hasAdj ? { colorPriceAdjustment } : {}),
          },
        ];
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
    setCart((prev) => {
      const target = prev.find(
        (item) =>
          item.product.id === productId &&
          item.selectedColor === color &&
          item.selectedVariant?.id === variantId
      );
      if (!target) return prev;
      const maxStock = target.selectedVariant ? target.selectedVariant.stock : target.product.stock;
      const clampedQty = sanitizeCartQuantity(quantity, maxStock);
      if (clampedQty <= 0) {
        return prev.filter(
          (item) =>
            !(
              item.product.id === productId &&
              item.selectedColor === color &&
              item.selectedVariant?.id === variantId
            )
        );
      }
      return prev.map((item) => {
        if (
          item.product.id === productId &&
          item.selectedColor === color &&
          item.selectedVariant?.id === variantId
        ) {
          return { ...item, quantity: clampedQty };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCart([]);
    setPromoCode('');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const itemPrice = resolveCartItemUnitPrice(item);
    return Number((sum + itemPrice * item.quantity).toFixed(2));
  }, 0);

  const promoResult = promoCode
    ? validateAndCalculatePromoDiscount(promoCode, cartSubtotal)
    : null;
  const cartDiscount = promoResult && promoResult.isValid ? promoResult.discount : 0;

  const applyPromoCode = (code: string, deliveryFee?: number): PromoValidationResult => {
    const result = validateAndCalculatePromoDiscount(code, cartSubtotal, deliveryFee);
    if (result.isValid) {
      setPromoCode(result.normalizedCode);
    }
    return result;
  };

  const clearPromoCode = () => {
    setPromoCode('');
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => toggleWishlistProductId(prev, productId));
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const viewProductDetail = (productId: string, openAsModal = true, variantId?: string) => {
    if (productId) {
      recordProductView(productId);
    }
    setSelectedProductId(productId);
    setSelectedVariantId(variantId || null);
    const p = products.find((item) => item.id === productId);
    if (openAsModal && p) {
      setQuickViewProductState(p);
    } else {
      setQuickViewProductState(null);
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
  const generateWhatsAppOrderUrl = (
    order:
      | Partial<Order>
      | {
          items: CartItem[];
          customer?: Partial<Order['customer']>;
          total?: number;
          discount?: number;
          paymentMethod?: Order['paymentMethod'];
        }
  ): string => {
    const phone = storeSettings.whatsapp || '96170773067';
    let text = `*New Order Inquiry - ${storeSettings.storeName || 'ON AlAA STORE'} (${storeSettings.phone || '70 773 067'})* 🏠\n\n`;

    if ('id' in order && order.id) {
      text += `*Order Reference:* ${order.id}\n`;
    }
    if (order.customer?.fullName) {
      text += `*Customer:* ${order.customer.fullName}\n`;
      text += `*Phone:* ${order.customer.phone || ''}\n`;
      text += `*Area:* ${order.customer.cityArea || ''}\n`;
      text += `*Address:* ${order.customer.addressLine || ''}\n\n`;
    }

    text += `*Ordered Items:*\n`;
    const items: Array<CartItem | Order['items'][number]> = order.items || cart;
    items.forEach((item, idx: number) => {
      const isOrderItem = 'productName' in item;
      const name = isOrderItem ? item.productName : item.product?.name || 'Item';
      const price = isOrderItem ? item.price : resolveCartItemUnitPrice(item);
      const itemColor = isOrderItem ? item.color : item.selectedColor;
      const itemVariant = isOrderItem ? item.variantName : item.selectedVariant?.name;
      const variantDistinct =
        itemVariant &&
        itemVariant.trim().toLowerCase() !== (itemColor || '').trim().toLowerCase()
          ? itemVariant
          : undefined;
      const detailsList = [itemColor, variantDistinct].filter(Boolean);
      const detailsText = detailsList.length > 0 ? ` (${detailsList.join(' • ')})` : '';
      const lineTotal = Number((price * item.quantity).toFixed(2));
      text += `${idx + 1}. ${name}${detailsText} x${item.quantity} - $${lineTotal}\n`;
    });

    const discount = Number(order.discount) || 0;
    if (discount > 0) {
      text += `\n*Promo Discount:* -$${discount} USD`;
    }
    const total = order.total !== undefined ? order.total : Math.max(0, cartSubtotal - cartDiscount);
    text += `\n*Total Amount:* $${total} USD`;
    if ('paymentMethod' in order && order.paymentMethod) {
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
        offers,
        categories,
        categoriesLoading,
        categoriesError,
        refreshCategories,
        brands,
        marketingVideos,
        storeSettings,
        storefrontLoading,
        storefrontStale,
        storefrontError,
        refreshStorefront,
        refreshData,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        promoCode,
        cartDiscount,
        applyPromoCode,
        clearPromoCode,
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
        isQuickSearchOpen,
        setIsQuickSearchOpen,
        currentView,
        setCurrentView,
        selectedProductId,
        selectedVariantId,
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
