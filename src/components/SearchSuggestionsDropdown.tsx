import React, { useState } from 'react';
import { Product, Category, Brand } from '../types';
import { CategorySuggestion, BrandSuggestion, POPULAR_SEARCH_TERMS } from '../utils/searchSuggestions';
import {
  Search,
  Sparkles,
  TrendingUp,
  Folder,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Tablet,
  BatteryCharging,
  Zap,
  Cable,
  Speaker,
  Gamepad2,
  Gamepad,
  Mic2,
  Shield,
  Car,
  Maximize2,
  Briefcase,
  Camera,
  Mic,
  Keyboard,
  Cpu,
  HardDrive,
  Wifi,
  Home,
  Sun,
  Compass,
  Heart,
  Eye,
  Aperture,
  Printer,
  Battery,
  Wrench,
  Coffee,
  Hammer,
  Box,
  Layers,
  SearchX,
  CheckCircle2,
  Tag,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Tablet,
  BatteryCharging,
  Zap,
  Cable,
  Speaker,
  Gamepad2,
  Gamepad,
  Mic2,
  Shield,
  Car,
  Maximize2,
  Briefcase,
  Camera,
  Mic,
  Keyboard,
  Cpu,
  HardDrive,
  Wifi,
  Home,
  Sun,
  Compass,
  Heart,
  Eye,
  Aperture,
  Printer,
  Battery,
  Wrench,
  Coffee,
  Hammer,
  Box,
  Layers,
};

interface SearchSuggestionsDropdownProps {
  query: string;
  brands?: BrandSuggestion[];
  categories: CategorySuggestion[];
  products: Product[];
  allCategories?: Category[];
  allBrands?: Brand[];
  totalBrandMatches?: number;
  totalCategoryMatches: number;
  totalProductMatches: number;
  lang: 'en' | 'ar';
  selectedIndex: number;
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (category: Category) => void;
  onSelectBrand?: (brand: Brand) => void;
  onSelectPopularTerm: (term: string) => void;
  onViewAllResults: () => void;
  onClose: () => void;
}

export const SearchSuggestionsDropdown: React.FC<SearchSuggestionsDropdownProps> = ({
  query,
  brands = [],
  categories,
  products,
  allCategories = [],
  allBrands = [],
  totalBrandMatches = 0,
  totalCategoryMatches,
  totalProductMatches,
  lang,
  selectedIndex,
  onSelectProduct,
  onSelectCategory,
  onSelectBrand,
  onSelectPopularTerm,
  onViewAllResults,
}) => {
  const isArabic = lang === 'ar';
  const hasQuery = query.trim().length > 0;
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;
  const ChevronIcon = isArabic ? ChevronLeft : ChevronRight;

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'products' | 'brands' | 'categories'>('all');

  // Render when user has focused search bar but hasn't typed anything yet
  if (!hasQuery) {
    const popularCategories = allCategories
      .filter((c) => c.featured)
      .slice(0, 6);

    const popularBrands = allBrands
      .filter((b) => b.featured)
      .slice(0, 6);

    return (
      <div
        data-testid="search-suggestions-empty"
        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl"
      >
        {/* Trending Searches Header */}
        <div className="p-3 border-b border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC]/80 dark:bg-[#111A2E]/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">
            <TrendingUp className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>{isArabic ? 'عمليات البحث الشائعة' : 'Trending Searches'}</span>
          </div>
        </div>

        {/* Popular Search Pills */}
        <div className="p-3 border-b border-[#DCE5F0] dark:border-[#1E293B] bg-white dark:bg-[#0E1726]">
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SEARCH_TERMS.map((term, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPopularTerm(term)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5F8FC] dark:bg-[#162038] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] text-[#172033] dark:text-slate-300 hover:text-[#007AFF] dark:hover:text-[#38BDF8] border border-[#DCE5F0] dark:border-[#1E293B] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-3 h-3 text-[#64748B] dark:text-slate-400" />
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Brands Shortcuts */}
        {popularBrands.length > 0 && (
          <div className="p-3 border-b border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC]/40 dark:bg-[#111A2E]/40">
            <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-[#007AFF]" />
              <span>{isArabic ? 'الماركات المميزة' : 'Featured Brands'}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {popularBrands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectBrand?.(b)}
                  className="p-2 rounded-xl bg-white dark:bg-[#162038] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] text-center transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] truncate">
                    {b.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Categories Grid */}
        <div className="p-3 bg-white dark:bg-[#0E1726]">
          <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Folder className="w-3 h-3 text-[#007AFF]" />
            <span>{isArabic ? 'الأقسام الرئيسية' : 'Popular Departments'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {popularCategories.map((cat) => {
              const IconComponent = ICON_MAP[cat.iconName] || Smartphone;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-[#F5F8FC] dark:bg-[#162038] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] text-left rtl:text-right transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded-lg bg-white dark:bg-[#1E293B] text-[#007AFF] shadow-xs group-hover:scale-105 transition-transform">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#172033] dark:text-slate-300 group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] truncate">
                    {isArabic ? cat.nameAr : cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Saida Store Assurance Footnote */}
        <div className="px-3 py-2 bg-[#F5F8FC]/80 dark:bg-[#111A2E]/80 border-t border-[#DCE5F0] dark:border-[#1E293B] text-[11px] text-[#64748B] dark:text-slate-400 flex items-center justify-between">
          <span>{isArabic ? 'صيدا — ساحة النجمة • توصيل لكافة لبنان' : 'Saida Nijme Square • Fast Lebanon Dispatch'}</span>
          <span className="font-mono text-[#007AFF]">ARNAOUT 2027</span>
        </div>
      </div>
    );
  }

  const hasMatches = brands.length > 0 || categories.length > 0 || products.length > 0;

  // Filter items based on active tab
  const showBrands = (activeFilterTab === 'all' || activeFilterTab === 'brands') && brands.length > 0;
  const showCategories = (activeFilterTab === 'all' || activeFilterTab === 'categories') && categories.length > 0;
  const showProducts = (activeFilterTab === 'all' || activeFilterTab === 'products') && products.length > 0;

  return (
    <div
      data-testid="search-suggestions-dropdown"
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl"
    >
      {/* Top Header Summary & Quick Filter Tabs */}
      <div className="p-2.5 border-b border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC]/90 dark:bg-[#111A2E]/90 space-y-2">
        <div className="flex justify-between items-center text-[11px] font-semibold text-[#64748B] dark:text-slate-400">
          <span className="flex items-center gap-1.5 text-[#007AFF] dark:text-[#38BDF8] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isArabic ? 'نتائج البحث الفورية' : 'Instant Search Results'}</span>
          </span>
          <span>
            {isArabic
              ? `${totalBrandMatches} ماركات • ${totalCategoryMatches} أقسام • ${totalProductMatches} منتجات`
              : `${totalBrandMatches} brands • ${totalCategoryMatches} categories • ${totalProductMatches} products`}
          </span>
        </div>

        {/* Interactive Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-0.5">
          <button
            type="button"
            onClick={() => setActiveFilterTab('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-[11px] whitespace-nowrap ${
              activeFilterTab === 'all'
                ? 'bg-[#007AFF] text-white shadow-xs'
                : 'bg-white dark:bg-[#162038] text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
            }`}
          >
            {isArabic ? 'الكل' : 'All'}
          </button>

          {brands.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilterTab('brands')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-[11px] whitespace-nowrap flex items-center gap-1 ${
                activeFilterTab === 'brands'
                  ? 'bg-[#00D26A] text-slate-950 shadow-xs'
                  : 'bg-white dark:bg-[#162038] text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              <span>{isArabic ? 'الماركات' : 'Brands'}</span>
              <span className="opacity-75">({totalBrandMatches})</span>
            </button>
          )}

          {categories.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilterTab('categories')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-[11px] whitespace-nowrap flex items-center gap-1 ${
                activeFilterTab === 'categories'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'bg-white dark:bg-[#162038] text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              <span>{isArabic ? 'الأقسام' : 'Categories'}</span>
              <span className="opacity-75">({totalCategoryMatches})</span>
            </button>
          )}

          {products.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilterTab('products')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-[11px] whitespace-nowrap flex items-center gap-1 ${
                activeFilterTab === 'products'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'bg-white dark:bg-[#162038] text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              <span>{isArabic ? 'المنتجات' : 'Products'}</span>
              <span className="opacity-75">({totalProductMatches})</span>
            </button>
          )}
        </div>
      </div>

      {hasMatches ? (
        <div className="max-h-[460px] overflow-y-auto divide-y divide-[#DCE5F0]/60 dark:divide-[#1E293B]/60">
          {/* SECTION 1: MATCHING BRANDS */}
          {showBrands && (
            <div className="p-2 bg-white dark:bg-[#0E1726]">
              <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Tag className="w-3 h-3 text-[#00D26A]" />
                <span>{isArabic ? 'الماركات المطابقة' : 'Matching Brands'}</span>
              </div>
              <div className="space-y-1">
                {brands.map((b, bIdx) => {
                  const isHighlighted = selectedIndex === bIdx;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectBrand?.(b)}
                      className={`w-full text-left rtl:text-right px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                        isHighlighted
                          ? 'bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] ring-1 ring-[#007AFF]/30'
                          : 'hover:bg-[#F5F8FC] dark:hover:bg-[#162038] text-[#172033] dark:text-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#F5F8FC] dark:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                          {b.logo ? (
                            <img src={b.logo} alt={b.name} className="w-full h-full object-contain" />
                          ) : (
                            <Tag className="w-4 h-4 text-[#00D26A]" />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold leading-tight truncate flex items-center gap-1.5">
                            <span>{b.name}</span>
                            <span className="text-[10px] text-[#00D26A] font-semibold">Official Brand</span>
                          </p>
                          {b.description && (
                            <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                              {b.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {b.productCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                            {isArabic ? `${b.productCount} منتج` : `${b.productCount} devices`}
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

          {/* SECTION 2: MATCHING CATEGORIES */}
          {showCategories && (
            <div className="p-2 bg-white dark:bg-[#0E1726]">
              <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Folder className="w-3 h-3 text-[#007AFF]" />
                <span>{isArabic ? 'الأقسام المطابقة' : 'Matching Categories'}</span>
              </div>
              <div className="space-y-1">
                {categories.map((cat, catIdx) => {
                  const IconComponent = ICON_MAP[cat.iconName] || Smartphone;
                  const globalIdx = brands.length + catIdx;
                  const isHighlighted = selectedIndex === globalIdx;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onSelectCategory(cat)}
                      className={`w-full text-left rtl:text-right px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                        isHighlighted
                          ? 'bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] ring-1 ring-[#007AFF]/30'
                          : 'hover:bg-[#F5F8FC] dark:hover:bg-[#162038] text-[#172033] dark:text-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg transition-transform group-hover:scale-105 ${
                            isHighlighted
                              ? 'bg-[#007AFF] text-white'
                              : 'bg-[#F5F8FC] dark:bg-[#1E293B] text-[#007AFF]'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold leading-tight truncate">
                            {isArabic ? cat.nameAr : cat.name}
                          </p>
                          {cat.subcategories && cat.subcategories.length > 0 && (
                            <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                              {cat.subcategories.slice(0, 3).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cat.productCount > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8]">
                            {isArabic ? `${cat.productCount} منتج` : `${cat.productCount} items`}
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
          {showProducts && (
            <div className="p-2 bg-white dark:bg-[#0E1726]">
              <div className="px-2 py-1 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Box className="w-3 h-3 text-[#007AFF]" />
                <span>{isArabic ? 'المنتجات المطابقة' : 'Matching Products'}</span>
              </div>
              <div className="space-y-1">
                {products.map((p, pIdx) => {
                  const globalIdx = brands.length + categories.length + pIdx;
                  const isHighlighted = selectedIndex === globalIdx;
                  const hasDiscount = p.originalPrice > p.price;
                  const isLowStock = p.stock > 0 && p.stock <= (p.lowStockThreshold || 3);
                  const isOutOfStock = p.stock === 0;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectProduct(p)}
                      className={`w-full text-left rtl:text-right p-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer group ${
                        isHighlighted
                          ? 'bg-[#EAF3FF] dark:bg-[#1E293B] ring-1 ring-[#007AFF]/30'
                          : 'hover:bg-[#F5F8FC] dark:hover:bg-[#162038]'
                      }`}
                    >
                      {/* Product Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                        {p.images && p.images[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
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

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-[#007AFF] dark:text-[#38BDF8] px-1.5 py-0.2 rounded bg-[#EAF3FF] dark:bg-[#111A2E]">
                            {p.brand}
                          </span>
                          {isOutOfStock ? (
                            <span className="text-[9px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded">
                              {isArabic ? 'نفذت الكمية' : 'Out of stock'}
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded">
                              {isArabic ? 'كمية محدودة' : 'Low stock'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>{isArabic ? 'متوفر' : 'In stock'}</span>
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
        /* Empty State */
        <div className="p-8 text-center bg-white dark:bg-[#0E1726]">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-3">
            <SearchX className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] mb-1">
            {isArabic ? `لم نجد نتائج مطابقة لـ "${query}"` : `No direct matches for "${query}"`}
          </p>
          <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-sm mx-auto mb-4">
            {isArabic
              ? 'تأكد من كتابة الكلمات بشكل صحيح، أو ابحث عن ماركة مثل Oppo أو Apple أو Samsung أو Anker.'
              : 'Try checking your spelling, or search for brands like Oppo, Apple, Samsung, or Anker.'}
          </p>

          <button
            type="button"
            onClick={onViewAllResults}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <span>{isArabic ? 'البحث في كامل الكتالوج' : 'Search Entire Catalog'}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Footer Action: View Full Catalog Results */}
      {hasMatches && (
        <div className="p-2.5 bg-[#F5F8FC] dark:bg-[#111A2E] border-t border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between">
          <button
            type="button"
            onClick={onViewAllResults}
            className="w-full py-2 px-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>
              {isArabic
                ? `عرض كافة النتائج لـ "${query}" (${totalBrandMatches + totalCategoryMatches + totalProductMatches})`
                : `View all results for "${query}" (${totalBrandMatches + totalCategoryMatches + totalProductMatches})`}
            </span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
