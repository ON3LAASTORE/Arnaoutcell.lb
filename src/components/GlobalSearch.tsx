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
} from 'lucide-react';
import { LazyImage } from './LazyImage';
import {
  filterProductsGlobally,
  filterProductsByCategorySlug,
  getUniqueMatchingBrands,
  getUniqueMatchingCategories,
  getFilterModeLabels,
  SearchFilterMode,
  MatchedCategoryInfo,
} from '../utils/globalSearchHelpers';
import { addSearchHistoryTerm } from '../utils/quickSearchOverlayHelpers';
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

  // Compute matching categories, brands, and products
  const matchingCategories = useMemo(() => {
    if (filterMode === 'name' || filterMode === 'brand') return [];
    return getUniqueMatchingCategories(scopedProducts, scopedCategories, query).slice(0, 4);
  }, [scopedProducts, scopedCategories, query, filterMode]);

  const matchingBrands = useMemo(() => {
    if (filterMode === 'name' || filterMode === 'category') return [];
    return getUniqueMatchingBrands(scopedProducts, scopedBrands, query).slice(0, 4);
  }, [scopedProducts, scopedBrands, query, filterMode]);

  const matchingProducts = useMemo(() => {
    return filterProductsGlobally(scopedProducts, query, filterMode, categories).slice(0, 6);
  }, [scopedProducts, categories, query, filterMode]);

  const totalInteractiveItems =
    matchingCategories.length + matchingBrands.length + matchingProducts.length;

  // Reset keyboard selected index when query, filter mode, or category scope changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query, filterMode, selectedCategorySlug]);

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

  // Keyboard shortcut listener: '/' or 'Cmd+K' / 'Ctrl+K' focuses visible search input
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
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
  }, []);

  const handleSelectProduct = (product: Product) => {
    trackSearchQuery({
      term: query.trim() || product.name,
      source: 'product_suggestion_click',
      selectedEntityTitle: product.name,
      categoryMatchesCount: matchingCategories.length,
      productMatchesCount: matchingProducts.length,
    });
    if (query.trim()) {
      addSearchHistoryTerm(query.trim());
    }
    viewProductDetail(product.id);
    setIsOpen(false);
    setQuery('');
    if (onCloseMobileMenu) onCloseMobileMenu();
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
      handleSelectProduct(matchingProducts[pIdx]);
      return;
    }

    const trimmed = query.trim();

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
      return isArabic ? 'عمّ تبحث اليوم؟' : 'What are you looking for?';
    }
    return t.searchPlaceholder || 'Search by name, brand, or category...';
  }, [filterMode, isArabic, variant, t.searchPlaceholder]);

  const hasQuery = query.trim().length > 0;
  const hasResults =
    matchingCategories.length > 0 || matchingBrands.length > 0 || matchingProducts.length > 0;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      data-testid={isMobile ? 'mobile-global-search-container' : 'global-search-container'}
    >
      {variant === 'navbar' ? (
        isMobile ? (
          /* Mobile 96TECH-inspired Search Form */
          <form
            onSubmit={handleSubmitSearch}
            role="search"
            aria-label={isArabic ? 'البحث في المتجر' : 'Mobile product search'}
            className="flex items-stretch w-full h-10 rounded-[10px] overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#00BAF2] transition-shadow"
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
            className="flex items-stretch w-full h-11 rounded-[10px] overflow-hidden bg-white shadow-sm ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-[#00BAF2] transition-shadow"
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

          {/* Case 1: Empty Query - Show Quick Category & Brand Filters */}
          {!hasQuery ? (
            <div className="p-3 space-y-3.5">
              {/* Quick Category Shortcuts */}
              {featuredCategories.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Folder className="w-3 h-3 text-[#007AFF]" />
                    <span>{isArabic ? 'تصفية سريعة بالقسم' : 'Quick Filter by Category'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {featuredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat)}
                        className="p-2 rounded-xl bg-[#F5F8FC] dark:bg-[#162038] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-left rtl:text-right transition-all cursor-pointer group flex items-center justify-between gap-1.5"
                      >
                        <span className="text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] truncate">
                          {isArabic ? cat.nameAr : cat.name}
                        </span>
                        <ChevronIcon className="w-3 h-3 text-[#64748B] dark:text-slate-400 group-hover:text-[#007AFF] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Brand Filter Shortcuts */}
              {featuredBrands.length > 0 && (
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
              <div className="pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B] text-[11px] text-[#64748B] dark:text-slate-400 flex items-center justify-between">
                <span>
                  {isArabic
                    ? 'اكتب اسم المنتج، الماركة، أو القسم للبحث الفوري'
                    : 'Search by product name, brand, or category'}
                </span>
                <span className="font-semibold text-[#007AFF] whitespace-nowrap">ON AlAA STORE</span>
              </div>
            </div>
          ) : hasResults ? (
            /* Case 2: Matching Results Found */
            <div className="max-h-[440px] overflow-y-auto divide-y divide-[#DCE5F0]/60 dark:divide-[#1E293B]/60">
              {/* SECTION 1: MATCHING CATEGORIES */}
              {matchingCategories.length > 0 && (
                <div className="p-2 bg-[#F8FAFC]/60 dark:bg-[#111A2E]/60">
                  <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Folder className="w-3 h-3 text-[#007AFF]" />
                    <span>{isArabic ? 'الأقسام المطابقة' : 'Matching Categories'}</span>
                  </div>
                  <div className="space-y-1">
                    {matchingCategories.map((cat, catIdx) => {
                      const isHighlighted = selectedIndex === catIdx;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className={`w-full text-left rtl:text-right px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                            isHighlighted
                              ? 'bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] ring-1 ring-[#007AFF]/30'
                              : 'hover:bg-white dark:hover:bg-[#162038] text-[#172033] dark:text-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] flex-shrink-0 flex items-center justify-center">
                              <Folder className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold leading-tight truncate">
                                {isArabic ? cat.nameAr : cat.name}
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
                          onClick={() => handleSelectBrand(b.name)}
                          className={`w-full text-left rtl:text-right px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                            isHighlighted
                              ? 'bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] ring-1 ring-[#007AFF]/30'
                              : 'hover:bg-white dark:hover:bg-[#162038] text-[#172033] dark:text-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                              {b.logo ? (
                                <LazyImage
                                  src={b.logo}
                                  alt={b.name}
                                  priority={true}
                                  width={28}
                                  height={28}
                                  wrapperClassName="w-full h-full flex items-center justify-center"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Tag className="w-4 h-4 text-[#00D26A]" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold leading-tight truncate">
                                {b.name}
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
                  <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Box className="w-3 h-3 text-[#007AFF]" />
                    <span>{isArabic ? 'المنتجات المطابقة' : 'Matching Products'}</span>
                  </div>
                  <div className="space-y-1">
                    {matchingProducts.map((p, pIdx) => {
                      const globalIdx =
                        matchingCategories.length + matchingBrands.length + pIdx;
                      const isHighlighted = selectedIndex === globalIdx;
                      const hasDiscount = p.originalPrice > p.price;
                      const isLowStock = p.stock > 0 && p.stock <= (p.lowStockThreshold || 3);
                      const isOutOfStock = p.stock === 0;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className={`w-full text-left rtl:text-right p-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer group ${
                            isHighlighted
                              ? 'bg-[#EAF3FF] dark:bg-[#1E293B] ring-1 ring-[#007AFF]/30'
                              : 'hover:bg-[#F5F8FC] dark:hover:bg-[#162038]'
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                            {p.images && p.images[0] ? (
                              <LazyImage
                                src={p.images[0]}
                                alt={p.name}
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
                              {isArabic ? p.nameAr || p.name : p.name}
                            </p>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-extrabold text-[#007AFF] dark:text-[#38BDF8] tabular-nums">
                                ${p.price}
                              </span>
                              {hasDiscount && (
                                <span className="text-[10px] text-[#64748B] dark:text-slate-500 line-through tabular-nums">
                                  ${p.originalPrice}
                                </span>
                              )}
                              {p.sku && (
                                <span className="text-[9px] text-[#64748B] dark:text-slate-500 ml-auto rtl:mr-auto font-mono">
                                  SKU: {p.sku}
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
                  ? 'جرب البحث باسم المنتج أو الماركة (Apple, Samsung, Anker) أو القسم (Phones, Chargers).'
                  : 'Try searching by product name, brand (Apple, Samsung, Anker), or category (Phones, Chargers).'}
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
                  {isArabic
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
