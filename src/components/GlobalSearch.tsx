import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import {
  Search,
  X,
  Tag,
  Box,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  SlidersHorizontal,
} from 'lucide-react';
import { LazyImage } from './LazyImage';
import {
  filterProductsByNameOrBrand,
  getUniqueMatchingBrands,
  getFilterModeLabels,
  SearchFilterMode,
} from '../utils/globalSearchHelpers';
import { trackSearchQuery } from '../services/searchAnalyticsService';
import { Product, Brand } from '../types';

interface GlobalSearchProps {
  isMobile?: boolean;
  onCloseMobileMenu?: () => void;
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isMobile = false,
  onCloseMobileMenu,
  className = '',
}) => {
  const {
    lang,
    t,
    products,
    brands,
    selectBrand,
    viewProductDetail,
    setSearchQuery,
    setCurrentView,
  } = useShop();

  const isArabic = lang === 'ar';
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;
  const ChevronIcon = isArabic ? ChevronLeft : ChevronRight;

  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<SearchFilterMode>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute matching products and brands
  const matchingProducts = useMemo(() => {
    return filterProductsByNameOrBrand(products, query, filterMode).slice(0, 6);
  }, [products, query, filterMode]);

  const matchingBrands = useMemo(() => {
    if (filterMode === 'name') return [];
    return getUniqueMatchingBrands(products, brands, query).slice(0, 4);
  }, [products, brands, query, filterMode]);

  const totalInteractiveItems = matchingBrands.length + matchingProducts.length;

  // Reset keyboard selected index when query or filter mode changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query, filterMode]);

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

  // Keyboard shortcut listener: '/' or 'Cmd+K' / 'Ctrl+K' focuses search
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
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
      categoryMatchesCount: 0,
      productMatchesCount: matchingProducts.length,
    });
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
      categoryMatchesCount: 0,
      productMatchesCount: matchingProducts.length,
    });
    selectBrand(brandName);
    setCurrentView('products');
    setIsOpen(false);
    setQuery('');
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleSubmitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check if keyboard selected index is active
    if (selectedIndex >= 0 && selectedIndex < totalInteractiveItems) {
      if (selectedIndex < matchingBrands.length) {
        handleSelectBrand(matchingBrands[selectedIndex].name);
        return;
      } else {
        const pIdx = selectedIndex - matchingBrands.length;
        handleSelectProduct(matchingProducts[pIdx]);
        return;
      }
    }

    if (query.trim()) {
      trackSearchQuery({
        term: query.trim(),
        source: isMobile ? 'mobile_input_submit' : 'desktop_input_submit',
        categoryMatchesCount: 0,
        productMatchesCount: matchingProducts.length,
      });

      // If user typed an exact brand name or filterMode is 'brand'
      const matchedBrand = brands.find(
        (b) => b.name.toLowerCase() === query.trim().toLowerCase()
      );

      if (filterMode === 'brand' || matchedBrand) {
        selectBrand(matchedBrand ? matchedBrand.name : query.trim());
      } else {
        setSearchQuery(query.trim());
        setCurrentView('products');
      }

      setIsOpen(false);
      if (onCloseMobileMenu) onCloseMobileMenu();
    } else {
      setCurrentView('products');
      setIsOpen(false);
      if (onCloseMobileMenu) onCloseMobileMenu();
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

  // Top featured brand pills for quick 1-click filtering
  const featuredBrands = useMemo(() => {
    return brands.filter((b) => b.featured).slice(0, 6);
  }, [brands]);

  const hasQuery = query.trim().length > 0;
  const hasResults = matchingBrands.length > 0 || matchingProducts.length > 0;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      data-testid="global-search-container"
    >
      <form onSubmit={handleSubmitSearch} className="w-full">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              filterMode === 'brand'
                ? isArabic
                  ? 'ابحث بالماركة (Apple, Samsung, Oppo...)'
                  : 'Search by brand (Apple, Samsung, Oppo...)'
                : filterMode === 'name'
                ? isArabic
                  ? 'ابحث باسم المنتج أو الجهاز...'
                  : 'Search by product name...'
                : t.searchPlaceholder || 'Search products or brands...'
            }
            aria-label={t.searchPlaceholder || 'Search products or brands'}
            aria-expanded={isOpen}
            role="combobox"
            className="w-full bg-[#F5F8FC] dark:bg-[#111A2E] text-[#172033] dark:text-[#F8FAFC] placeholder-[#64748B] dark:placeholder-slate-400 text-xs sm:text-sm rounded-full pl-10 pr-28 rtl:pl-28 rtl:pr-10 py-2 sm:py-2.5 border border-[#DCE5F0] dark:border-[#1E293B] focus:bg-white dark:focus:bg-[#162038] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all shadow-xs"
          />

          {/* Left Search Icon */}
          <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-22 rtl:right-auto rtl:left-22 p-1 text-[#64748B] hover:text-[#172033] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Desktop Keyboard Shortcut Badge */}
          {!query && !isMobile && (
            <div className="hidden lg:flex items-center gap-0.5 absolute right-20 rtl:right-auto rtl:left-20 pointer-events-none text-[10px] text-[#64748B] dark:text-slate-400 font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
              <span>/</span>
            </div>
          )}

          {/* Submit Search Button */}
          <button
            type="submit"
            className="absolute right-1.5 rtl:right-auto rtl:left-1.5 bg-[#007AFF] hover:bg-[#0066D6] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-xs flex items-center gap-1"
          >
            <span>{isArabic ? 'بحث' : 'Search'}</span>
          </button>
        </div>
      </form>

      {/* Global Search Dropdown */}
      {isOpen && (
        <div
          data-testid="global-search-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl"
        >
          {/* Header Bar with Scope Filter Controls (All / By Name / By Brand) */}
          <div className="p-2.5 border-b border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC]/90 dark:bg-[#111A2E]/90 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400">
              <SlidersHorizontal className="w-3 h-3 text-[#007AFF]" />
              <span>{isArabic ? 'تصفية حسب:' : 'Filter by:'}</span>
            </div>

            {/* Filter Mode Selector Pills */}
            <div className="flex items-center gap-1 bg-white dark:bg-[#0A0F1D] p-0.5 rounded-xl border border-[#DCE5F0] dark:border-[#1E293B]">
              {filterTabs.map((tab) => {
                const isActive = filterMode === tab.mode;
                return (
                  <button
                    key={tab.mode}
                    type="button"
                    onClick={() => {
                      setFilterMode(tab.mode);
                      inputRef.current?.focus();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

          {/* Case 1: Empty Query - Show Quick Brand Filters & Popular Searches */}
          {!hasQuery ? (
            <div className="p-3 space-y-3">
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
                        {b.productCount !== undefined && b.productCount > 0 && (
                          <span className="text-[9px] text-[#64748B] dark:text-slate-400">
                            {b.productCount} {isArabic ? 'منتج' : 'items'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Helpful footer */}
              <div className="pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B] text-[11px] text-[#64748B] dark:text-slate-400 flex items-center justify-between">
                <span>
                  {isArabic
                    ? 'اكتب اسم الهاتف أو الماركة للبحث الفوري'
                    : 'Type product name or brand to filter instantly'}
                </span>
                <span className="font-semibold text-[#007AFF]">ARNAOUT CELL</span>
              </div>
            </div>
          ) : hasResults ? (
            /* Case 2: Matching Results Found */
            <div className="max-h-[460px] overflow-y-auto divide-y divide-[#DCE5F0]/60 dark:divide-[#1E293B]/60">
              {/* SECTION: MATCHING BRANDS */}
              {matchingBrands.length > 0 && (
                <div className="p-2 bg-[#F8FAFC]/50 dark:bg-[#111A2E]/50">
                  <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Tag className="w-3 h-3 text-[#00D26A]" />
                    <span>{isArabic ? 'الماركات المطابقة' : 'Matching Brands'}</span>
                  </div>
                  <div className="space-y-1">
                    {matchingBrands.map((b, bIdx) => {
                      const isHighlighted = selectedIndex === bIdx;
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
                              <p className="text-xs font-bold leading-tight truncate flex items-center gap-1.5">
                                <span>{b.name}</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40">
                                  {isArabic ? 'تصفية بالماركة' : 'Filter by Brand'}
                                </span>
                              </p>
                              <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                                {isArabic
                                  ? `عرض كافة أجهزة ${b.name}`
                                  : `Browse all ${b.name} devices & accessories`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {b.count > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                {isArabic ? `${b.count} منتج` : `${b.count} devices`}
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

              {/* SECTION: MATCHING PRODUCTS */}
              {matchingProducts.length > 0 && (
                <div className="p-2 bg-white dark:bg-[#0E1726]">
                  <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Box className="w-3 h-3 text-[#007AFF]" />
                    <span>{isArabic ? 'المنتجات المطابقة' : 'Matching Products'}</span>
                  </div>
                  <div className="space-y-1">
                    {matchingProducts.map((p, pIdx) => {
                      const globalIdx = matchingBrands.length + pIdx;
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
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {/* Brand pill */}
                              <span className="text-[10px] font-bold text-[#007AFF] dark:text-[#38BDF8] px-1.5 py-0.2 rounded bg-[#EAF3FF] dark:bg-[#111A2E]">
                                {p.brand}
                              </span>

                              {/* Inventory / Stock status */}
                              {isOutOfStock ? (
                                <span className="text-[9px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded">
                                  {isArabic ? 'نفذت الكمية' : 'Out of stock'}
                                </span>
                              ) : isLowStock ? (
                                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>{isArabic ? 'كمية محدودة' : 'Low stock'}</span>
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>{isArabic ? 'متوفر' : 'In stock'}</span>
                                </span>
                              )}

                              {p.isBestSeller && (
                                <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                                  🔥 {isArabic ? 'الأكثر طلباً' : 'Bestseller'}
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] truncate leading-tight">
                              {isArabic ? p.nameAr || p.name : p.name}
                            </p>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-extrabold text-[#007AFF] dark:text-[#38BDF8]">
                                ${p.price}
                              </span>
                              {hasDiscount && (
                                <span className="text-[10px] text-[#64748B] dark:text-slate-500 line-through">
                                  ${p.originalPrice}
                                </span>
                              )}
                              {p.sku && (
                                <span className="text-[9px] text-[#64748B] dark:text-slate-500 ml-auto rtl:mr-auto">
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
                {isArabic ? `لم نجد منتجات تطابق "${query}"` : `No products matching "${query}"`}
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 max-w-xs mx-auto mb-3">
                {isArabic
                  ? 'جرب البحث باسم ماركة مثل Apple أو Samsung أو Anker أو تفضل بزيارة الكتالوج.'
                  : 'Try searching by brand like Apple, Samsung, or Anker, or search the full catalog.'}
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
