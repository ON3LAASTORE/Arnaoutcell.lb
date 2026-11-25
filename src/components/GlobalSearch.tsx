import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import {
  Search,
  X,
  Tag,
  Box,
  Folder,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  SlidersHorizontal,
  Mic,
  QrCode,
  Hash,
  Clock,
  Trash2,
} from 'lucide-react';
import { LazyImage } from './LazyImage';
import {
  filterProductsGlobally,
  filterProductsByCategorySlug,
  getUniqueMatchingBrands,
  getUniqueMatchingCategories,
  getFilterModeLabels,
  findProductSkuMatch,
  findExactSkuProductMatch,
  getSampleProductSkus,
  resolveProductThumbnailUrl,
  resolveCategoryThumbnailImage,
  SearchFilterMode,
  MatchedCategoryInfo,
} from '../utils/globalSearchHelpers';
import {
  addSearchHistoryTerm,
  splitHighlightedTextSegments,
} from '../utils/quickSearchOverlayHelpers';
import {
  getRecentSkuSearches,
  recordRecentSkuSearch,
  removeRecentSkuSearch,
  clearRecentSkuSearches,
  resolveRecentSkuLookup,
  RECENT_SKU_UPDATED_EVENT,
  RecentSkuSearchEntry,
  ResolvedRecentSkuLookup,
} from '../utils/recentSkuSearches';
import { trackSearchQuery } from '../services/searchAnalyticsService';
import { Product } from '../types';

interface GlobalSearchProps {
  isMobile?: boolean;
  variant?: 'default' | 'navbar';
  onOpenQuickSearch?: () => void;
  onCloseMobileMenu?: () => void;
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isMobile = false,
  variant = 'navbar',
  onOpenQuickSearch,
  onCloseMobileMenu,
  className = '',
}) => {
  const {
    lang,
    t,
    products,
    brands,
    categories,
    selectBrand,
    selectCategory,
    viewProductDetail,
    setSearchQuery,
    setCurrentView,
    setIsQrScannerOpen,
  } = useShop();

  const isArabic = lang === 'ar';
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;
  const ChevronIcon = isArabic ? ChevronLeft : ChevronRight;

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<SearchFilterMode>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [recentSkuEntries, setRecentSkuEntries] = useState<RecentSkuSearchEntry[]>(() =>
    getRecentSkuSearches()
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restrict products to selected navbar category if chosen
  const scopedProducts = useMemo(() => {
    return filterProductsByCategorySlug(products, categories, selectedCategorySlug);
  }, [products, categories, selectedCategorySlug]);

  const scopedBrands = useMemo(() => {
    if (selectedCategorySlug === 'all') return brands;
    const activeBrandNames = new Set(
      scopedProducts
        .filter((p) => p.isPublished !== false && p.brand)
        .map((p) => p.brand.toLowerCase())
    );
    return brands.filter((b) => activeBrandNames.has(b.name.toLowerCase()));
  }, [brands, scopedProducts, selectedCategorySlug]);

  const scopedCategories = useMemo(() => {
    if (selectedCategorySlug === 'all') return categories;
    return categories.filter((c) => c.slug === selectedCategorySlug);
  }, [categories, selectedCategorySlug]);

  const matchingProducts = useMemo(() => {
    return filterProductsGlobally(scopedProducts, query, filterMode, categories).slice(0, 6);
  }, [scopedProducts, categories, query, filterMode]);

  // Compute matching categories and brands (keep compact when matching products exist so both sections appear immediately above the fold)
  const matchingCategories = useMemo(() => {
    if (filterMode === 'name' || filterMode === 'brand' || filterMode === 'sku') return [];
    const maxCats = matchingProducts.length > 0 ? 3 : 4;
    return getUniqueMatchingCategories(scopedProducts, scopedCategories, query).slice(0, maxCats);
  }, [scopedProducts, scopedCategories, query, filterMode, matchingProducts.length]);

  const matchingBrands = useMemo(() => {
    if (filterMode === 'name' || filterMode === 'category' || filterMode === 'sku') return [];
    const maxBrands = matchingProducts.length > 0 ? 2 : 4;
    return getUniqueMatchingBrands(scopedProducts, scopedBrands, query).slice(0, maxBrands);
  }, [scopedProducts, scopedBrands, query, filterMode, matchingProducts.length]);

  const resolvedRecentSkus = useMemo(() => {
    return recentSkuEntries.map((entry) => resolveRecentSkuLookup(entry, products));
  }, [recentSkuEntries, products]);

  const sampleSkus = useMemo(() => {
    const recentSkuSet = new Set(
      resolvedRecentSkus.map((item) => item.displaySku.toLowerCase())
    );
    return getSampleProductSkus(scopedProducts, 6)
      .filter((sku) => !recentSkuSet.has(sku.toLowerCase()))
      .slice(0, 3);
  }, [scopedProducts, resolvedRecentSkus]);

  const exactSkuMatchForQuery = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    return findExactSkuProductMatch(scopedProducts, trimmed);
  }, [scopedProducts, query]);

  const totalInteractiveItems =
    matchingCategories.length + matchingBrands.length + matchingProducts.length;

  // Reset keyboard selected index when query, filter mode, or category scope changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query, filterMode, selectedCategorySlug]);

  // Keep recent SKU searches synced across desktop/mobile search instances & tabs
  useEffect(() => {
    const syncRecentSkus = () => setRecentSkuEntries(getRecentSkuSearches());
    window.addEventListener(RECENT_SKU_UPDATED_EVENT, syncRecentSkus);
    window.addEventListener('storage', syncRecentSkus);
    return () => {
      window.removeEventListener(RECENT_SKU_UPDATED_EVENT, syncRecentSkus);
      window.removeEventListener('storage', syncRecentSkus);
    };
  }, []);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener: '/' focuses inline search input; Cmd/Ctrl+K opens QuickSearchOverlay when provided
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';

      if (isCmdK && onOpenQuickSearch) {
        return;
      }

      if (
        (e.key === '/' || isCmdK) &&
        activeTag !== 'INPUT' &&
        activeTag !== 'TEXTAREA' &&
        activeTag !== 'SELECT'
      ) {
        if (!inputRef.current || inputRef.current.offsetParent === null) {
          return;
        }
        e.preventDefault();
        inputRef.current.focus();
        setIsOpen(true);
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onOpenQuickSearch]);

  const handleSelectProduct = (product: Product, matchedVariantId?: string) => {
    const trimmedQuery = query.trim();
    const skuHit = trimmedQuery ? findProductSkuMatch(product, trimmedQuery) : null;
    const resolvedVariant =
      skuHit?.matchedVariant ||
      (matchedVariantId && Array.isArray(product.variants)
        ? product.variants.find((v) => v.id === matchedVariantId)
        : undefined);
    const canonicalSku =
      skuHit?.matchedSku || resolvedVariant?.sku?.trim() || product.sku?.trim();

    if ((skuHit || filterMode === 'sku') && canonicalSku) {
      setRecentSkuEntries(
        recordRecentSkuSearch({
          sku: canonicalSku,
          product,
          variant: resolvedVariant,
        })
      );
    }

    trackSearchQuery({
      term: trimmedQuery || product.sku || product.name,
      source: 'product_suggestion_click',
      selectedEntityTitle: product.name,
      categoryMatchesCount: matchingCategories.length,
      productMatchesCount: matchingProducts.length,
    });
    if (trimmedQuery) {
      addSearchHistoryTerm(trimmedQuery);
    }
    viewProductDetail(product.id, false, matchedVariantId);
    setIsOpen(false);
    setQuery('');
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleSelectRecentSku = (lookup: ResolvedRecentSkuLookup) => {
    setRecentSkuEntries(
      recordRecentSkuSearch({
        sku: lookup.displaySku,
        product: lookup.product,
        variant: lookup.variant,
      })
    );
    addSearchHistoryTerm(lookup.displaySku);
    trackSearchQuery({
      term: lookup.displaySku,
      source: 'product_suggestion_click',
      selectedEntityTitle: lookup.product?.name || lookup.displaySku,
      categoryMatchesCount: 0,
      productMatchesCount: lookup.product ? 1 : 0,
    });

    if (lookup.product) {
      viewProductDetail(lookup.product.id, false, lookup.variant?.id);
      setIsOpen(false);
      setQuery('');
      if (onCloseMobileMenu) onCloseMobileMenu();
      return;
    }

    setFilterMode('sku');
    setQuery(lookup.displaySku);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleRemoveRecentSku = (sku: string) => {
    setRecentSkuEntries(removeRecentSkuSearch(sku));
  };

  const handleClearRecentSkus = () => {
    setRecentSkuEntries(clearRecentSkuSearches());
  };

  const handleSelectBrand = (brandName: string) => {
    trackSearchQuery({
      term: query.trim() || brandName,
      source: isMobile ? 'mobile_input_submit' : 'desktop_input_submit',
      selectedEntityTitle: brandName,
      categoryMatchesCount: matchingCategories.length,
      productMatchesCount: matchingProducts.length,
    });
    addSearchHistoryTerm(brandName);
    selectBrand(brandName);
    setCurrentView('products');
    setIsOpen(false);
    setQuery('');
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleSelectCategory = (cat: Pick<MatchedCategoryInfo, 'slug' | 'name'>) => {
    trackSearchQuery({
      term: query.trim() || cat.name,
      source: 'category_suggestion_click',
      selectedEntityTitle: cat.name,
      categoryMatchesCount: matchingCategories.length,
      productMatchesCount: matchingProducts.length,
    });
    if (query.trim()) {
      addSearchHistoryTerm(query.trim());
    }
    selectCategory(cat.slug);
    setCurrentView('products');
    setIsOpen(false);
    setQuery('');
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleSubmitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check if keyboard selected index is active
    if (selectedIndex >= 0 && selectedIndex < totalInteractiveItems) {
      if (selectedIndex < matchingCategories.length) {
        handleSelectCategory(matchingCategories[selectedIndex]);
        return;
      }
      if (selectedIndex < matchingCategories.length + matchingBrands.length) {
        const bIdx = selectedIndex - matchingCategories.length;
        handleSelectBrand(matchingBrands[bIdx].name);
        return;
      }
      const pIdx = selectedIndex - matchingCategories.length - matchingBrands.length;
      const picked = matchingProducts[pIdx];
      const skuHit = findProductSkuMatch(picked, query);
      handleSelectProduct(picked, skuHit?.matchedVariant?.id);
      return;
    }

    const trimmed = query.trim();

    // Fast-path direct navigation when customer searches by an exact SKU (or single match in SKU mode)
    if (trimmed && filterMode !== 'brand' && filterMode !== 'category') {
      const exactSkuHit = findExactSkuProductMatch(scopedProducts, trimmed);
      if (exactSkuHit) {
        addSearchHistoryTerm(trimmed);
        setRecentSkuEntries(
          recordRecentSkuSearch({
            sku: exactSkuHit.matchedSku,
            product: exactSkuHit.product,
            variant: exactSkuHit.matchedVariant,
          })
        );
        trackSearchQuery({
          term: trimmed,
          source: isMobile ? 'mobile_input_submit' : 'desktop_input_submit',
          selectedEntityTitle: exactSkuHit.product.name,
          categoryMatchesCount: 0,
          productMatchesCount: 1,
        });
        viewProductDetail(exactSkuHit.product.id, false, exactSkuHit.matchedVariant?.id);
        setIsOpen(false);
        setQuery('');
        if (onCloseMobileMenu) onCloseMobileMenu();
        return;
      }

      if (filterMode === 'sku' && matchingProducts.length === 1) {
        const onlyProduct = matchingProducts[0];
        const skuHit = findProductSkuMatch(onlyProduct, trimmed);
        handleSelectProduct(onlyProduct, skuHit?.matchedVariant?.id);
        return;
      }
    }

    if (selectedCategorySlug && selectedCategorySlug !== 'all') {
      if (trimmed) {
        addSearchHistoryTerm(trimmed);
        trackSearchQuery({
          term: trimmed,
          source: isMobile ? 'mobile_input_submit' : 'desktop_input_submit',
          categoryMatchesCount: 1,
          productMatchesCount: matchingProducts.length,
        });
      }
      selectCategory(selectedCategorySlug);
      setSearchQuery(trimmed);
      setCurrentView('products');
      setIsOpen(false);
      if (onCloseMobileMenu) onCloseMobileMenu();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (trimmed) {
      addSearchHistoryTerm(trimmed);
      trackSearchQuery({
        term: trimmed,
        source: isMobile ? 'mobile_input_submit' : 'desktop_input_submit',
        categoryMatchesCount: matchingCategories.length,
        productMatchesCount: matchingProducts.length,
      });

      const lower = trimmed.toLowerCase();
      const matchedBrand = brands.find((b) => b.name.toLowerCase() === lower);
      const matchedCategory = categories.find(
        (c) =>
          c.name.toLowerCase() === lower ||
          (c.nameAr && c.nameAr.toLowerCase() === lower) ||
          c.slug.toLowerCase() === lower
      );

      if (filterMode === 'brand' && (matchedBrand || matchingBrands.length > 0)) {
        selectBrand(matchedBrand ? matchedBrand.name : matchingBrands[0].name);
      } else if (filterMode === 'category' && (matchedCategory || matchingCategories.length === 1)) {
        const target = matchedCategory || matchingCategories[0];
        selectCategory(target.slug);
      } else if (filterMode === 'all' && matchedBrand) {
        selectBrand(matchedBrand.name);
      } else if (filterMode === 'all' && matchedCategory) {
        selectCategory(matchedCategory.slug);
      } else {
        selectCategory(null);
        setSearchQuery(trimmed);
        setCurrentView('products');
      }

      setIsOpen(false);
      if (onCloseMobileMenu) onCloseMobileMenu();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      selectCategory(null);
      setSearchQuery('');
      setCurrentView('products');
      setIsOpen(false);
      if (onCloseMobileMenu) onCloseMobileMenu();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClear = () => {
    setQuery('');
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalInteractiveItems > 0) {
        setSelectedIndex((prev) => (prev + 1) % totalInteractiveItems);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalInteractiveItems > 0) {
        setSelectedIndex((prev) => (prev <= 0 ? totalInteractiveItems - 1 : prev - 1));
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const filterTabs = getFilterModeLabels(lang);

  // Top featured categories and brands for quick 1-click filtering when input is empty
  const featuredCategories = useMemo(() => {
    return categories.filter((c) => c.featured).slice(0, 6);
  }, [categories]);

  const featuredBrands = useMemo(() => {
    return brands.filter((b) => b.featured).slice(0, 6);
  }, [brands]);

  const selectedCategoryRecord = useMemo(() => {
    if (selectedCategorySlug === 'all') return null;
    return categories.find((c) => c.slug === selectedCategorySlug) || null;
  }, [categories, selectedCategorySlug]);

  const placeholderText = useMemo(() => {
    if (filterMode === 'sku') {
      return isArabic
        ? 'أدخل رمز SKU (مثال: APL-IP16PM-256)...'
        : isMobile
        ? 'Enter SKU (e.g. APL-IP16PM-256)...'
        : 'Enter SKU code (e.g. APL-IP16PM-256)...';
    }
    if (filterMode === 'brand') {
      return isArabic
        ? 'ابحث بالماركة (Apple, Samsung, Anker...)'
        : 'Search by brand (Apple, Samsung, Anker...)';
    }
    if (filterMode === 'category') {
      return isArabic
        ? 'ابحث بالقسم (الهواتف، اللابتوب، الشواحن...)'
        : 'Search by category (Phones, Laptops, Chargers...)';
    }
    if (filterMode === 'name') {
      return isArabic
        ? 'ابحث باسم المنتج أو الجهاز...'
        : 'Search by product name...';
    }
    if (variant === 'navbar') {
      if (isArabic) {
        return 'ابحث بالاسم، الماركة، أو رمز SKU...';
      }
      return isMobile
        ? 'Search product, brand, or SKU...'
        : 'Search by name, brand, or SKU code...';
    }
    return t.searchPlaceholder || 'Search by name, brand, category, or SKU...';
  }, [filterMode, isArabic, isMobile, variant, t.searchPlaceholder]);

  const hasQuery = query.trim().length > 0;
  const hasResults =
    matchingCategories.length > 0 || matchingBrands.length > 0 || matchingProducts.length > 0;

  const featuredCategoriesWithThumbnails = useMemo(
    () =>
      featuredCategories.map((cat) => ({
        cat,
        ...resolveCategoryThumbnailImage(cat, scopedProducts),
      })),
    [featuredCategories, scopedProducts]
  );

  const renderHighlightedText = (text: string) => {
    const segments = splitHighlightedTextSegments(text, query);
    return segments.map((seg, idx) =>
      seg.isMatch ? (
        <mark
          key={idx}
          className="bg-[#007AFF]/12 dark:bg-[#38BDF8]/20 text-[#007AFF] dark:text-[#38BDF8] rounded-[2px] font-extrabold"
        >
          {seg.text}
        </mark>
      ) : (
        <React.Fragment key={idx}>{seg.text}</React.Fragment>
      )
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen ? 'z-50' : ''} ${className}`}
      data-testid={isMobile ? 'mobile-global-search-container' : 'global-search-container'}
    >
      {isOpen && variant === 'navbar' && (
        <div
          aria-hidden="true"
          data-testid={isMobile ? 'mobile-navbar-search-backdrop' : 'navbar-search-backdrop'}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-[#0A0F1D]/45 backdrop-blur-[2px] z-40 transition-opacity"
        />
      )}

      {variant === 'navbar' ? (
        isMobile ? (
          /* Mobile 96TECH-inspired Search Form */
          <form
            onSubmit={handleSubmitSearch}
            role="search"
            aria-label={isArabic ? 'البحث في المتجر' : 'Mobile product search'}
            className="relative z-50 flex items-stretch w-full h-10 rounded-[10px] overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#00BAF2] transition-shadow"
          >
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              aria-label={placeholderText}
              aria-expanded={isOpen}
              role="combobox"
              aria-autocomplete="list"
              data-testid="mobile-global-search-input"
              className="flex-1 min-w-0 px-3.5 bg-white text-[#0F172A] placeholder-slate-400 text-xs focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                data-testid="mobile-global-search-clear"
                aria-label={isArabic ? 'مسح البحث' : 'Clear search'}
                className="px-2 bg-white text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenQuickSearch && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenQuickSearch();
                }}
                aria-label={isArabic ? 'البحث الصوتي' : 'Voice search'}
                className="px-2 bg-white text-slate-400 hover:text-[#00BAF2] transition-colors cursor-pointer"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onCloseMobileMenu) onCloseMobileMenu();
                setIsQrScannerOpen(true);
              }}
              data-testid="mobile-global-search-qr-btn"
              aria-label={isArabic ? 'مسح رمز QR للمنتج' : 'Scan Product QR Code'}
              title={isArabic ? 'مسح رمز QR للمنتج' : 'Scan Product QR Code'}
              className="px-2.5 bg-white text-slate-500 hover:text-[#00BAF2] transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              type="submit"
              data-testid="mobile-global-search-submit"
              aria-label={isArabic ? 'بحث' : 'Search'}
              className="px-4 bg-[#00BAF2] hover:bg-[#00A2D4] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4 stroke-[2.25]" />
            </button>
          </form>
        ) : (
          /* Desktop 96TECH-inspired Multi-Segment Header Search Bar */
          <form
            onSubmit={handleSubmitSearch}
            role="search"
            aria-label={isArabic ? 'البحث في المتجر' : 'Store product search'}
            className="relative z-50 flex items-stretch w-full h-11 rounded-[10px] overflow-hidden bg-white shadow-sm ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-[#00BAF2] transition-shadow"
          >
            {/* Left Category Dropdown Selector */}
            <div className="relative flex items-center bg-[#F1F5F9] border-r rtl:border-r-0 rtl:border-l border-slate-200 shrink-0">
              <select
                value={selectedCategorySlug}
                onChange={(e) => {
                  setSelectedCategorySlug(e.target.value);
                  if (query.trim()) setIsOpen(true);
                }}
                data-testid="global-search-category-select"
                aria-label={isArabic ? 'اختر القسم للبحث' : 'Select category filter'}
                className="appearance-none bg-transparent text-[#334155] text-[13px] font-medium pl-3.5 pr-8 rtl:pl-8 rtl:pr-3.5 h-full cursor-pointer focus:outline-none max-w-[190px] truncate"
              >
                <option value="all">
                  {isArabic ? 'البحث في جميع الأقسام' : 'Search all categories'}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {isArabic ? cat.nameAr : cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2.5 rtl:right-auto rtl:left-2.5"
                aria-hidden="true"
              />
            </div>

            {/* Center Input Field */}
            <div className="relative flex-1 flex items-center min-w-0 bg-white">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText}
                aria-label={placeholderText}
                aria-expanded={isOpen}
                role="combobox"
                aria-autocomplete="list"
                data-testid="global-search-input"
                className={`w-full h-full px-4 ${
                  query && onOpenQuickSearch
                    ? 'pr-24 rtl:pl-24 rtl:pr-4'
                    : query || onOpenQuickSearch
                    ? 'pr-18 rtl:pl-18 rtl:pr-4'
                    : 'pr-10 rtl:pl-10 rtl:pr-4'
                } bg-white text-[#0F172A] placeholder-slate-400 text-sm focus:outline-none [&::-webkit-search-cancel-button]:hidden`}
              />

              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  data-testid="global-search-clear"
                  aria-label={isArabic ? 'مسح البحث' : 'Clear search'}
                  className={`absolute ${
                    onOpenQuickSearch
                      ? 'right-17 rtl:right-auto rtl:left-17'
                      : 'right-10 rtl:right-auto rtl:left-10'
                  } p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {onOpenQuickSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenQuickSearch();
                  }}
                  aria-label={isArabic ? 'البحث الصوتي والسريع' : 'Open voice and quick search'}
                  title={isArabic ? 'البحث الصوتي والسريع' : 'Voice & Quick Search'}
                  className="absolute right-9 rtl:right-auto rtl:left-9 p-1.5 rounded-md text-slate-400 hover:text-[#00BAF2] hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsQrScannerOpen(true);
                }}
                data-testid="global-search-qr-btn"
                aria-label={isArabic ? 'مسح رمز QR للمنتج' : 'Scan Product QR Code'}
                title={isArabic ? 'مسح رمز QR للمنتج' : 'Scan Product QR Code'}
                className="absolute right-2 rtl:right-auto rtl:left-2 p-1.5 rounded-md text-slate-500 hover:text-[#00BAF2] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>

            {/* Right Action Button: Cyan/Teal Search Button */}
            <button
              type="submit"
              data-testid="global-search-submit"
              aria-label={isArabic ? 'بحث' : 'Search'}
              className="px-5 bg-[#00BAF2] hover:bg-[#00A2D4] text-white flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Search className="w-5 h-5 stroke-[2.25]" />
            </button>
          </form>
        )
      ) : (
        /* Standalone Pill Search Variant */
        <form onSubmit={handleSubmitSearch} className="w-full">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              aria-label={t.searchPlaceholder || 'Search products by name, brand, or category'}
              aria-expanded={isOpen}
              role="combobox"
              aria-autocomplete="list"
              className={`w-full bg-[#F5F8FC] dark:bg-[#111A2E] text-[#172033] dark:text-[#F8FAFC] placeholder-[#64748B] dark:placeholder-slate-400 text-xs sm:text-sm rounded-full pl-9 rtl:pr-9 py-2 sm:py-2.5 border border-[#DCE5F0] dark:border-[#1E293B] focus:bg-white dark:focus:bg-[#162038] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all shadow-xs [&::-webkit-search-cancel-button]:hidden ${
                query ? 'pr-26 rtl:pl-26' : 'pr-20 rtl:pl-20'
              }`}
            />

            <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 pointer-events-none" />

            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-19 rtl:right-auto rtl:left-19 p-1 text-[#64748B] hover:text-[#172033] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              className="absolute right-1.5 rtl:right-auto rtl:left-1.5 bg-[#007AFF] hover:bg-[#0066D6] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-xs flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>{isArabic ? 'بحث' : 'Search'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Global Search Multi-Entity Dropdown */}
      {isOpen && (
        <div
          data-testid="global-search-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0E1726] text-[#172033] dark:text-[#F8FAFC] border border-[#DCE5F0] dark:border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl"
        >
          {/* Header Bar with Scope Filter Controls (All / By Name / By Brand / By Category) */}
          <div className="p-2.5 border-b border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC]/90 dark:bg-[#111A2E]/90 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 whitespace-nowrap shrink-0">
                <SlidersHorizontal className="w-3 h-3 text-[#007AFF]" />
                <span>{isArabic ? 'بحث حسب:' : 'Search by:'}</span>
              </div>

              {selectedCategoryRecord && (
                <button
                  type="button"
                  onClick={() => setSelectedCategorySlug('all')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] text-[11px] font-semibold cursor-pointer hover:bg-[#DCEAFE] dark:hover:bg-slate-700 transition-colors"
                  title={isArabic ? 'إلغاء فلتر القسم' : 'Clear category scope'}
                >
                  <span>{isArabic ? selectedCategoryRecord.nameAr : selectedCategoryRecord.name}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Mode Selector Tabs */}
            <div
              role="tablist"
              aria-label={isArabic ? 'نطاق البحث' : 'Search scope'}
              className="flex items-center gap-1 bg-white dark:bg-[#0A0F1D] p-0.5 rounded-xl border border-[#DCE5F0] dark:border-[#1E293B] overflow-x-auto max-w-full"
            >
              {filterTabs.map((tab) => {
                const isActive = filterMode === tab.mode;
                return (
                  <button
                    key={tab.mode}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-testid={`global-search-mode-${tab.mode}`}
                    onClick={() => {
                      setFilterMode(tab.mode);
                      inputRef.current?.focus();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#007AFF] text-white shadow-xs'
                        : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Case 1: Empty Query - Show Recent SKU Searches + Quick SKU Lookup + Category & Brand Filters */}
          {!hasQuery ? (
            <div className="p-3 space-y-3.5 max-h-[440px] overflow-y-auto">
              {/* Recent SKU Searches (Last 5 stored locally) */}
              {resolvedRecentSkus.length > 0 && (
                <div data-testid="global-search-recent-skus">
                  <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#007AFF]" aria-hidden="true" />
                      <span>
                        {isArabic ? 'عمليات البحث الأخيرة (SKU)' : 'Recent Searches'}
                      </span>
                      <span className="text-[10px] font-semibold normal-case text-[#64748B] dark:text-slate-400 tabular-nums">
                        ({resolvedRecentSkus.length}/5)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleClearRecentSkus}
                      data-testid="global-search-recent-skus-clear"
                      aria-label={
                        isArabic ? 'مسح سجل رموز SKU الأخيرة' : 'Clear recent SKU searches'
                      }
                      className="inline-flex items-center gap-1 text-[10px] font-semibold normal-case text-[#64748B] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                      <span>{isArabic ? 'مسح' : 'Clear'}</span>
                    </button>
                  </div>
                  <div className="space-y-1">
                    {resolvedRecentSkus.map((item) => (
                      <div
                        key={item.entry.sku}
                        data-testid={`global-search-recent-sku-item-${item.displaySku}`}
                        className="flex items-center justify-between gap-1 rounded-xl bg-[#F5F8FC] dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] transition-colors group"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectRecentSku(item)}
                          className="flex-1 min-w-0 text-left rtl:text-right px-2.5 py-2 flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EAF3FF] dark:bg-[#1E3A5F] text-[#007AFF] dark:text-[#38BDF8] font-mono text-[11px] font-bold shrink-0">
                              <Hash className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                              <span>{item.displaySku}</span>
                            </span>
                            {item.product && (
                              <span className="text-xs font-medium text-[#172033] dark:text-[#F8FAFC] group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] truncate">
                                {isArabic ? item.displayTitleAr : item.displayTitle}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {typeof item.displayPrice === 'number' && (
                              <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#38BDF8] tabular-nums">
                                ${item.displayPrice}
                              </span>
                            )}
                            <ChevronIcon className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400 group-hover:text-[#007AFF] transition-colors" />
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecentSku(item.entry.sku)}
                          data-testid={`global-search-recent-sku-remove-${item.displaySku}`}
                          aria-label={
                            isArabic
                              ? `إزالة ${item.displaySku} من البحث الأخير`
                              : `Remove ${item.displaySku} from recent searches`
                          }
                          className="pr-2.5 pl-1 rtl:pl-2.5 rtl:pr-1 py-2 text-[#94A3B8] hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick SKU Lookup Examples */}
              {sampleSkus.length > 0 && (
                <div data-testid="global-search-sku-examples">
                  <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-[#007AFF]" />
                      <span>{isArabic ? 'بحث سريع برمز SKU الفريد' : 'Quick Lookup by SKU Code'}</span>
                    </span>
                    <span className="text-[10px] font-medium normal-case text-[#64748B] dark:text-slate-400">
                      {isArabic ? 'اضغط للتجربة' : 'Tap to search'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sampleSkus.map((sku) => (
                      <button
                        key={sku}
                        type="button"
                        data-testid={`global-search-sample-sku-${sku}`}
                        onClick={() => {
                          setFilterMode('sku');
                          setQuery(sku);
                          inputRef.current?.focus();
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F5F8FC] dark:bg-[#162038] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] font-mono text-[11px] font-semibold text-[#172033] dark:text-[#F8FAFC] hover:text-[#007AFF] dark:hover:text-[#38BDF8] transition-colors cursor-pointer"
                      >
                        <Hash className="w-3 h-3 text-[#007AFF] shrink-0" />
                        <span>{sku}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Category Shortcuts with Thumbnails */}
              {featuredCategoriesWithThumbnails.length > 0 && filterMode !== 'sku' && (
                <div>
                  <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Folder className="w-3 h-3 text-[#007AFF]" />
                    <span>{isArabic ? 'تصفية سريعة بالقسم' : 'Quick Filter by Category'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {featuredCategoriesWithThumbnails.map(({ cat, image }) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat)}
                        className="p-2 rounded-xl bg-[#F5F8FC] dark:bg-[#162038] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-left rtl:text-right transition-all cursor-pointer group flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {image ? (
                              <LazyImage
                                src={image}
                                alt={isArabic ? cat.nameAr : cat.name}
                                priority={true}
                                width={28}
                                height={28}
                                wrapperClassName="w-full h-full flex items-center justify-center"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <Folder className="w-3.5 h-3.5 text-[#007AFF]" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] truncate">
                            {isArabic ? cat.nameAr : cat.name}
                          </span>
                        </div>
                        <ChevronIcon className="w-3 h-3 text-[#64748B] dark:text-slate-400 group-hover:text-[#007AFF] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Brand Filter Shortcuts */}
              {featuredBrands.length > 0 && filterMode !== 'sku' && (
                <div>
                  <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-[#007AFF]" />
                    <span>{isArabic ? 'تصفية سريعة بالماركة' : 'Quick Filter by Brand'}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {featuredBrands.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectBrand(b.name)}
                        className="p-2 rounded-xl bg-[#F5F8FC] dark:bg-[#162038] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-center transition-all cursor-pointer group"
                      >
                        <p className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] truncate">
                          {b.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Helpful footer */}
              <div className="pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B] text-[11px] text-[#64748B] dark:text-slate-400 flex items-center justify-between gap-2">
                <span>
                  {isArabic
                    ? 'اكتب اسم المنتج، الماركة، القسم، أو رمز SKU الفريد للانتقال الفوري'
                    : 'Enter a unique SKU code (press Enter to jump directly), product name, brand, or category'}
                </span>
                <span className="font-semibold text-[#007AFF] whitespace-nowrap">ON ALAA STORE</span>
              </div>
            </div>
          ) : hasResults ? (
            /* Case 2: Real-Time Predictive Results Overlay */
            <div
              role="listbox"
              aria-label={isArabic ? 'نتائج البحث الفوري' : 'Predictive search results'}
              className="max-h-[520px] overflow-y-auto divide-y divide-[#DCE5F0]/60 dark:divide-[#1E293B]/60"
            >
              {/* Live Predictive Result Summary Bar */}
              <div className="px-3 py-1.5 bg-[#F8FAFC] dark:bg-[#111A2E] flex items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-slate-400">
                <span>
                  {isArabic
                    ? `نتائج فورية لـ "${query.trim()}"`
                    : `Live matches for "${query.trim()}"`}
                </span>
                <span className="font-semibold tabular-nums text-[#007AFF] dark:text-[#38BDF8]">
                  {isArabic
                    ? [
                        matchingCategories.length > 0 ? `${matchingCategories.length} أقسام` : null,
                        matchingBrands.length > 0 ? `${matchingBrands.length} ماركات` : null,
                        matchingProducts.length > 0 ? `${matchingProducts.length} منتجات` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : [
                        matchingCategories.length > 0
                          ? `${matchingCategories.length} ${matchingCategories.length === 1 ? 'category' : 'categories'}`
                          : null,
                        matchingBrands.length > 0
                          ? `${matchingBrands.length} ${matchingBrands.length === 1 ? 'brand' : 'brands'}`
                          : null,
                        matchingProducts.length > 0
                          ? `${matchingProducts.length} ${matchingProducts.length === 1 ? 'product' : 'products'}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
              </div>

              {/* SECTION 1: MATCHING CATEGORIES WITH THUMBNAILS */}
              {matchingCategories.length > 0 && (
                <div className="p-2 bg-[#F8FAFC]/60 dark:bg-[#111A2E]/60">
                  <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Folder className="w-3 h-3 text-[#007AFF]" />
                    <span>{isArabic ? 'الأقسام المطابقة' : 'Matching Categories'}</span>
                  </div>
                  <div className="space-y-1">
                    {matchingCategories.map((cat, catIdx) => {
                      const isHighlighted = selectedIndex === catIdx;
                      const catTitle = isArabic ? cat.nameAr : cat.name;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          role="option"
                          aria-selected={isHighlighted}
                          data-testid={`global-search-category-${cat.slug}`}
                          onClick={() => handleSelectCategory(cat)}
                          className={`w-full text-left rtl:text-right px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                            isHighlighted
                              ? 'bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] ring-1 ring-[#007AFF]/30'
                              : 'hover:bg-white dark:hover:bg-[#162038] text-[#172033] dark:text-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {cat.image ? (
                                <LazyImage
                                  src={cat.image}
                                  alt={catTitle}
                                  priority={true}
                                  width={40}
                                  height={40}
                                  wrapperClassName="w-full h-full flex items-center justify-center"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <Folder className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 truncate">
                              <p className="text-xs font-bold leading-tight truncate">
                                {renderHighlightedText(catTitle)}
                              </p>
                              <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                                {isArabic ? cat.name : cat.nameAr}
                                {cat.subcategories && cat.subcategories.length > 0
                                  ? ` · ${cat.subcategories.slice(0, 2).join(', ')}`
                                  : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] font-semibold text-[#007AFF] dark:text-[#38BDF8] tabular-nums whitespace-nowrap">
                              {isArabic
                                ? `${cat.count} منتج`
                                : cat.count === 1
                                ? '1 item'
                                : `${cat.count} items`}
                            </span>
                            <ChevronIcon className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-500 group-hover:text-[#007AFF] transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: MATCHING BRANDS */}
              {matchingBrands.length > 0 && (
                <div className="p-2 bg-[#F8FAFC]/40 dark:bg-[#111A2E]/40">
                  <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Tag className="w-3 h-3 text-[#00D26A]" />
                    <span>{isArabic ? 'الماركات المطابقة' : 'Matching Brands'}</span>
                  </div>
                  <div className="space-y-1">
                    {matchingBrands.map((b, bIdx) => {
                      const globalIdx = matchingCategories.length + bIdx;
                      const isHighlighted = selectedIndex === globalIdx;
                      return (
                        <button
                          key={b.name}
                          type="button"
                          role="option"
                          aria-selected={isHighlighted}
                          onClick={() => handleSelectBrand(b.name)}
                          className={`w-full text-left rtl:text-right px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                            isHighlighted
                              ? 'bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] ring-1 ring-[#007AFF]/30'
                              : 'hover:bg-white dark:hover:bg-[#162038] text-[#172033] dark:text-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                              {b.logo ? (
                                <LazyImage
                                  src={b.logo}
                                  alt={b.name}
                                  priority={true}
                                  width={32}
                                  height={32}
                                  wrapperClassName="w-full h-full flex items-center justify-center"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Tag className="w-4 h-4 text-[#00D26A]" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold leading-tight truncate">
                                {renderHighlightedText(b.name)}
                              </p>
                              <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                                {isArabic
                                  ? `عرض كافة أجهزة ${b.name}`
                                  : `Browse all ${b.name} products`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {b.count > 0 && (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                                {isArabic
                                  ? `${b.count} منتج`
                                  : b.count === 1
                                  ? '1 item'
                                  : `${b.count} items`}
                              </span>
                            )}
                            <ChevronIcon className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-500 group-hover:text-[#007AFF] transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: MATCHING PRODUCTS */}
              {matchingProducts.length > 0 && (
                <div className="p-2 bg-white dark:bg-[#0E1726]">
                  <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center justify-between gap-2 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Box className="w-3 h-3 text-[#007AFF]" />
                      <span>
                        {filterMode === 'sku'
                          ? isArabic
                            ? 'نتائج مطابقة لرمز SKU'
                            : 'SKU Matches'
                          : isArabic
                          ? 'المنتجات المطابقة'
                          : 'Matching Products'}
                      </span>
                    </span>
                    {exactSkuMatchForQuery && (
                      <span className="text-[10px] font-semibold normal-case text-emerald-600 dark:text-emerald-400">
                        {isArabic ? 'اضغط Enter للانتقال الفوري' : 'Press Enter to open product'}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {matchingProducts.map((p, pIdx) => {
                      const globalIdx =
                        matchingCategories.length + matchingBrands.length + pIdx;
                      const isHighlighted = selectedIndex === globalIdx;
                      const skuMatch = findProductSkuMatch(p, query);
                      const displayPrice =
                        skuMatch?.matchedVariant && Number.isFinite(skuMatch.matchedVariant.price)
                          ? skuMatch.matchedVariant.price
                          : p.price;
                      const displayStock =
                        skuMatch?.matchedVariant && typeof skuMatch.matchedVariant.stock === 'number'
                          ? skuMatch.matchedVariant.stock
                          : p.stock;
                      const displaySku = skuMatch ? skuMatch.matchedSku : p.sku;
                      const isExactSku = skuMatch?.matchKind === 'exact';
                      const hasDiscount = !skuMatch?.matchedVariant && p.originalPrice > p.price;
                      const isLowStock = displayStock > 0 && displayStock <= (p.lowStockThreshold || 3);
                      const isOutOfStock = displayStock === 0;
                      const productThumb =
                        skuMatch?.matchedVariant?.image?.trim() || resolveProductThumbnailUrl(p);
                      const productTitle = isArabic ? p.nameAr || p.name : p.name;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="option"
                          aria-selected={isHighlighted}
                          data-testid={`global-search-product-${p.id}`}
                          onClick={() => handleSelectProduct(p, skuMatch?.matchedVariant?.id)}
                          className={`w-full text-left rtl:text-right p-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer group ${
                            isHighlighted
                              ? 'bg-[#EAF3FF] dark:bg-[#1E293B] ring-1 ring-[#007AFF]/30'
                              : isExactSku
                              ? 'bg-[#F0F7FF] dark:bg-[#132238] ring-1 ring-[#007AFF]/25 hover:bg-[#E5F1FF] dark:hover:bg-[#192D4A]'
                              : 'hover:bg-[#F5F8FC] dark:hover:bg-[#162038]'
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                            {productThumb ? (
                              <LazyImage
                                src={productThumb}
                                alt={productTitle}
                                priority={true}
                                width={48}
                                height={48}
                                wrapperClassName="w-full h-full flex items-center justify-center"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <Smartphone className="w-5 h-5 text-[#64748B]" />
                            )}
                            {hasDiscount && (
                              <span className="absolute top-0.5 right-0.5 bg-[#DC2626] text-white text-[8px] font-black px-1 rounded-sm">
                                %
                              </span>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[10px] mb-0.5 truncate">
                              <span className="font-bold text-[#007AFF] dark:text-[#38BDF8] truncate">
                                {p.brand}
                              </span>
                              <span aria-hidden="true" className="text-[#64748B] dark:text-slate-500">·</span>
                              <span className="font-medium text-[#64748B] dark:text-slate-400 truncate">
                                {p.category}
                              </span>
                              <span aria-hidden="true" className="text-[#64748B] dark:text-slate-500">·</span>
                              {isOutOfStock ? (
                                <span className="font-semibold text-rose-500 whitespace-nowrap">
                                  {isArabic ? 'نفذت الكمية' : 'Out of stock'}
                                </span>
                              ) : isLowStock ? (
                                <span className="font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center gap-0.5 whitespace-nowrap">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>{isArabic ? 'كمية محدودة' : 'Low stock'}</span>
                                </span>
                              ) : (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5 whitespace-nowrap">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>{isArabic ? 'متوفر' : 'In stock'}</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] truncate leading-tight">
                              {renderHighlightedText(productTitle)}
                              {skuMatch?.matchedVariant ? ` · ${skuMatch.matchedVariant.name}` : ''}
                            </p>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs font-extrabold text-[#007AFF] dark:text-[#38BDF8] tabular-nums">
                                ${displayPrice}
                              </span>
                              {hasDiscount && (
                                <span className="text-[10px] text-[#64748B] dark:text-slate-500 line-through tabular-nums">
                                  ${p.originalPrice}
                                </span>
                              )}
                              {displaySku && (
                                <span
                                  data-testid={`global-search-result-sku-${p.id}`}
                                  className={`inline-flex items-center gap-1 ml-auto rtl:mr-auto rtl:ml-0 px-1.5 py-0.5 rounded font-mono text-[10px] ${
                                    isExactSku
                                      ? 'bg-[#007AFF] text-white font-bold'
                                      : skuMatch
                                      ? 'bg-[#EAF3FF] dark:bg-[#1E3A5F] text-[#007AFF] dark:text-[#38BDF8] font-bold'
                                      : 'bg-[#F5F8FC] dark:bg-[#111A2E] text-[#64748B] dark:text-slate-400'
                                  }`}
                                >
                                  <span>SKU: {renderHighlightedText(displaySku)}</span>
                                  {isExactSku && (
                                    <span className="text-[9px] uppercase tracking-wider opacity-95">
                                      · {isArabic ? 'مطابق' : 'Exact'}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronIcon className="w-4 h-4 text-[#64748B] dark:text-slate-500 group-hover:text-[#007AFF] transition-colors flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Case 3: No Results Found */
            <div className="p-6 text-center bg-white dark:bg-[#0E1726]">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-2">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] mb-1">
                {isArabic ? `لم نجد منتجات تطابق "${query}"` : `No results matching "${query}"`}
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 max-w-xs mx-auto mb-3">
                {isArabic
                  ? 'جرب البحث برمز SKU الفريد، اسم المنتج، الماركة (Apple, Samsung, Anker) أو القسم.'
                  : 'Try searching by unique SKU code (e.g. APL-IP16PM-256), product name, brand, or category.'}
              </p>
              <button
                type="button"
                onClick={() => handleSubmitSearch()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>{isArabic ? 'البحث في كامل المتجر' : 'Search All Products'}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Footer: View Full Catalog Results */}
          {hasQuery && hasResults && (
            <div className="p-2.5 bg-[#F5F8FC] dark:bg-[#111A2E] border-t border-[#DCE5F0] dark:border-[#1E293B]">
              <button
                type="button"
                onClick={() => handleSubmitSearch()}
                className="w-full py-2 px-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>
                  {exactSkuMatchForQuery
                    ? isArabic
                      ? `فتح صفحة المنتج لرمز SKU: ${exactSkuMatchForQuery.matchedSku}`
                      : `Open Product for SKU ${exactSkuMatchForQuery.matchedSku}`
                    : isArabic
                    ? `عرض كافة النتائج لـ "${query}" في الكتالوج`
                    : `View all results for "${query}" in Catalog`}
                </span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
