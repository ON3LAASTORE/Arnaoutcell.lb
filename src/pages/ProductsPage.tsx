import React, { useState, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from '../components/ProductCard';
import {
  Filter,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const {
    lang,
    t,
    products,
    categories,
    brands,
    selectedCategorySlug,
    selectCategory,
    selectedBrandName,
    selectBrand,
    searchQuery,
    setSearchQuery,
  } = useShop();

  const [sortOption, setSortOption] = useState<string>('recommended');
  const [priceMax, setPriceMax] = useState<number>(3000);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [onlyOffers, setOnlyOffers] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'column'>('grid');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Active Category name lookup
  const activeCategory = selectedCategorySlug
    ? categories.find((c) => c.slug === selectedCategorySlug)
    : null;

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.isPublished)
      .filter((p) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchNameAr = p.nameAr && p.nameAr.includes(q);
          const matchBrand = p.brand.toLowerCase().includes(q);
          const matchCategory = p.category.toLowerCase().includes(q);
          const matchSku = p.sku.toLowerCase().includes(q);
          if (!matchName && !matchNameAr && !matchBrand && !matchCategory && !matchSku) return false;
        }

        // Category filter
        if (selectedCategorySlug && activeCategory) {
          if (p.category.toLowerCase() !== activeCategory.name.toLowerCase()) return false;
        }

        // Brand filter
        if (selectedBrandName) {
          if (p.brand.toLowerCase() !== selectedBrandName.toLowerCase()) return false;
        }

        // Price filter
        if (p.price > priceMax) return false;

        // Stock filter
        if (onlyInStock && p.stock <= 0) return false;

        // Offers filter
        if (onlyOffers && !p.isSpecialOffer) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price_asc') return a.price - b.price;
        if (sortOption === 'price_desc') return b.price - a.price;
        if (sortOption === 'discount') return (b.discountPercentage || 0) - (a.discountPercentage || 0);
        if (sortOption === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return b.rating - a.rating; // recommended
      });
  }, [
    products,
    searchQuery,
    selectedCategorySlug,
    activeCategory,
    selectedBrandName,
    priceMax,
    onlyInStock,
    onlyOffers,
    sortOption,
  ]);

  const clearAllFilters = () => {
    selectCategory(null);
    selectBrand(null);
    setSearchQuery('');
    setPriceMax(3000);
    setOnlyInStock(false);
    setOnlyOffers(false);
    setSortOption('recommended');
  };

  const hasActiveFilters =
    Boolean(selectedCategorySlug) ||
    Boolean(selectedBrandName) ||
    Boolean(searchQuery.trim()) ||
    priceMax < 3000 ||
    onlyInStock ||
    onlyOffers;

  return (
    <div className="py-8 md:py-14 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title & Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#DCE5F0]">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#172033] tracking-tight">
              {activeCategory
                ? lang === 'ar'
                  ? activeCategory.nameAr
                  : activeCategory.name
                : selectedBrandName
                ? `${selectedBrandName} Tech Catalog`
                : searchQuery
                ? `${lang === 'ar' ? 'نتائج البحث عن:' : 'Search Results for:'} "${searchQuery}"`
                : lang === 'ar'
                ? 'كافة المنتجات والإلكترونيات'
                : 'All Products & Electronics'}
            </h1>
            <p className="text-[#64748B] text-xs sm:text-sm mt-1">
              {lang === 'ar'
                ? `عرض ${filteredProducts.length} منتج متوفر للتوصيل في لبنان أو الاستلام من صيدا.`
                : `Showing ${filteredProducts.length} products available for Lebanon delivery or Saida pickup.`}
            </p>
          </div>

          {/* Controls: View toggle, Sort, Mobile filter button */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Mobile Filter Trigger */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden px-3.5 py-2 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Filter className="w-4 h-4 text-[#007AFF]" />
              <span>{t.filterBy}</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl px-3 py-1.5 text-xs">
              <span className="text-[#64748B] font-semibold">{t.sortBy}:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                aria-label={t.sortBy}
                className="bg-transparent text-[#172033] font-bold focus:outline-none cursor-pointer"
              >
                <option value="recommended">{t.sortRecommended}</option>
                <option value="price_asc">{t.sortPriceLow}</option>
                <option value="price_desc">{t.sortPriceHigh}</option>
                <option value="discount">{t.sortDiscount}</option>
                <option value="newest">{t.sortNewest}</option>
              </select>
            </div>

            {/* Layout Toggle */}
            <div className="hidden sm:flex items-center bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('column')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'column' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
                }`}
                title="Column View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Layout: Sidebar Filter + Product Catalog */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="p-5 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-6 sticky top-28 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
                <div className="flex items-center gap-2 font-bold text-[#172033] text-sm">
                  <SlidersHorizontal className="w-4 h-4 text-[#007AFF]" />
                  <span>{t.filterBy}</span>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-[#DC2626] hover:underline cursor-pointer font-semibold"
                  >
                    {t.clearFilters}
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[#172033] font-semibold">{t.priceRange}</span>
                  <span className="font-bold text-[#007AFF]">$0 - ${priceMax}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="3000"
                  step="20"
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  aria-label={t.priceRange}
                  className="w-full accent-[#007AFF] bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-[#DCE5F0] text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer text-[#172033]">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="rounded accent-[#007AFF] w-4 h-4"
                  />
                  <span>{lang === 'ar' ? 'متوفر في المخزون فقط' : 'In-Stock Only'}</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-[#172033]">
                  <input
                    type="checkbox"
                    checked={onlyOffers}
                    onChange={(e) => setOnlyOffers(e.target.checked)}
                    className="rounded accent-[#007AFF] w-4 h-4"
                  />
                  <span>{lang === 'ar' ? 'عروض وتخفيضات خاصة فقط' : 'Special Offers & Deals Only'}</span>
                </label>
              </div>

              {/* Brands Filter */}
              <div className="pt-3 border-t border-[#DCE5F0]">
                <span className="text-xs font-bold text-[#172033] uppercase tracking-wider block mb-2.5">
                  {t.brands}
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  <button
                    onClick={() => selectBrand(null)}
                    className={`w-full text-left rtl:text-right px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      !selectedBrandName
                        ? 'bg-[#EAF3FF] text-[#007AFF] font-bold'
                        : 'text-[#64748B] hover:text-[#172033] hover:bg-white'
                    }`}
                  >
                    {lang === 'ar' ? 'كافة الماركات' : 'All Brands'}
                  </button>
                  {brands.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => selectBrand(b.name === selectedBrandName ? null : b.name)}
                      className={`w-full text-left rtl:text-right px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex justify-between ${
                        selectedBrandName === b.name
                          ? 'bg-[#EAF3FF] text-[#007AFF] font-bold'
                          : 'text-[#64748B] hover:text-[#172033] hover:bg-white'
                      }`}
                    >
                      <span>{b.name}</span>
                      {b.productCount ? <span className="text-slate-400">({b.productCount})</span> : null}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories Filter */}
              <div className="pt-3 border-t border-[#DCE5F0]">
                <span className="text-xs font-bold text-[#172033] uppercase tracking-wider block mb-2.5">
                  {t.allCategories}
                </span>
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  <button
                    onClick={() => selectCategory(null)}
                    className={`w-full text-left rtl:text-right px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      !selectedCategorySlug
                        ? 'bg-[#EAF3FF] text-[#007AFF] font-bold'
                        : 'text-[#64748B] hover:text-[#172033] hover:bg-white'
                    }`}
                  >
                    {lang === 'ar' ? 'كافة الأقسام' : 'All Categories'}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCategory(c.slug === selectedCategorySlug ? null : c.slug)}
                      className={`w-full text-left rtl:text-right px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        selectedCategorySlug === c.slug
                          ? 'bg-[#EAF3FF] text-[#007AFF] font-bold'
                          : 'text-[#64748B] hover:text-[#172033] hover:bg-white'
                      }`}
                    >
                      {lang === 'ar' ? c.nameAr : c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Listing Grid / Column */}
          <main className="lg:col-span-3">
            {/* Active filters pill list */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-xs text-[#64748B]">{lang === 'ar' ? 'التصفيات النشطة:' : 'Active Filters:'}</span>
                {selectedCategorySlug && activeCategory && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD] text-xs font-semibold">
                    {lang === 'ar' ? activeCategory.nameAr : activeCategory.name}
                    <X
                      className="w-3.5 h-3.5 cursor-pointer hover:text-[#007AFF]"
                      onClick={() => selectCategory(null)}
                    />
                  </span>
                )}
                {selectedBrandName && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD] text-xs font-semibold">
                    {selectedBrandName}
                    <X
                      className="w-3.5 h-3.5 cursor-pointer hover:text-[#007AFF]"
                      onClick={() => selectBrand(null)}
                    />
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F5F8FC] text-[#172033] border border-[#DCE5F0] text-xs font-semibold">
                    "{searchQuery}"
                    <X
                      className="w-3.5 h-3.5 cursor-pointer hover:text-[#007AFF]"
                      onClick={() => setSearchQuery('')}
                    />
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-[#DC2626] hover:underline font-semibold ml-2"
                >
                  {t.clearFilters}
                </button>
              </div>
            )}

            {filteredProducts.length > 0 ? (
              <div
                className={`grid gap-5 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    layout={viewMode === 'grid' ? 'grid' : 'column'}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-[#F5F8FC] rounded-3xl border border-dashed border-[#DCE5F0] p-8">
                <Sparkles className="w-12 h-12 text-[#64748B] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#172033] mb-1">
                  {lang === 'ar' ? 'لم نجد منتجات مطابقة لخياراتك' : 'No products matched your criteria'}
                </h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto mb-6">
                  {lang === 'ar'
                    ? 'جرب تقليل شروط التصفية أو البحث عن مسمى آخر أو تواصل معنا عبر واتساب للمساعدة.'
                    : 'Try broadening your filters or contact our Saida shop directly at 03 099 889.'}
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 rounded-xl bg-[#007AFF] text-white font-bold text-xs hover:bg-[#0066D6] transition-colors cursor-pointer shadow-sm"
                >
                  {t.clearFilters}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          <div
            onClick={() => setMobileFilterOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />
          <div className="relative ml-auto rtl:ml-0 rtl:mr-auto w-full max-w-xs bg-white h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <h3 className="font-bold text-[#172033] text-base">{t.filterBy}</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Price Max */}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[#172033] font-semibold">{t.priceRange}</span>
                <span className="text-[#007AFF] font-bold">${priceMax}</span>
              </div>
              <input
                type="range"
                min="20"
                max="3000"
                step="20"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                aria-label={t.priceRange}
                className="w-full accent-[#007AFF]"
              />
            </div>

            {/* Brands */}
            <div>
              <span className="text-xs font-bold text-[#172033] block mb-2">{t.brands}</span>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      selectBrand(b.name === selectedBrandName ? null : b.name);
                      setMobileFilterOpen(false);
                    }}
                    className={`w-full text-left rtl:text-right px-2 py-1 rounded text-xs ${
                      selectedBrandName === b.name ? 'text-[#007AFF] font-bold' : 'text-[#64748B]'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear button */}
            <div className="pt-4 border-t border-[#DCE5F0]">
              <button
                onClick={() => {
                  clearAllFilters();
                  setMobileFilterOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-[#F5F8FC] text-[#DC2626] font-bold text-xs border border-[#DCE5F0]"
              >
                {t.clearFilters}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
