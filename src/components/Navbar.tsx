import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import {
  Search,
  ShoppingCart,
  Heart,
  Menu,
  X,
  Globe,
  Flame,
  ShieldCheck,
  MapPin,
  Phone,
  Video,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { StoreLogo } from './StoreLogo';
import { querySearchSuggestions } from '../utils/searchSuggestions';
import { SearchSuggestionsDropdown } from './SearchSuggestionsDropdown';
import { trackSearchQuery } from '../services/searchAnalyticsService';
import { Product, Category, Brand } from '../types';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';

export const Navbar: React.FC = () => {
  const {
    lang,
    setLang,
    t,
    cartCount,
    cartSubtotal,
    setIsCartOpen,
    wishlist,
    currentView,
    setCurrentView,
    selectCategory,
    categories,
    brands,
    selectBrand,
    products,
    viewProductDetail,
    setSearchQuery: setGlobalSearch,
    isDarkMode,
    toggleDarkMode,
  } = useShop();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchFocused, setMobileSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Real-time search query matching current products, categories, and brands
  const searchResult = querySearchSuggestions(searchInput, products, categories, brands, {
    maxProducts: 6,
    maxCategories: 4,
    maxBrands: 4,
  });

  const totalInteractiveItems =
    searchResult.brands.length + searchResult.categories.length + searchResult.products.length;

  // Reset selected keyboard index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchInput]);

  // Close search suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchFocused(false);
      }
      if (mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(target)) {
        setMobileSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProduct = (product: Product) => {
    trackSearchQuery({
      term: searchInput.trim() || product.name,
      source: 'product_suggestion_click',
      selectedEntityTitle: product.name,
      categoryMatchesCount: searchResult.categories.length,
      productMatchesCount: searchResult.products.length,
    });
    viewProductDetail(product.id);
    setSearchFocused(false);
    setMobileSearchFocused(false);
    setMobileMenuOpen(false);
    setSearchInput('');
  };

  const handleSelectCategory = (category: Category) => {
    trackSearchQuery({
      term: searchInput.trim() || category.name,
      source: 'category_suggestion_click',
      selectedEntityTitle: category.name,
      categoryMatchesCount: searchResult.categories.length,
      productMatchesCount: searchResult.products.length,
    });
    selectCategory(category.slug);
    setSearchFocused(false);
    setMobileSearchFocused(false);
    setMobileMenuOpen(false);
    setSearchInput('');
  };

  const handleSelectBrand = (brand: Brand) => {
    trackSearchQuery({
      term: searchInput.trim() || brand.name,
      // @ts-expect-error brand click tracking
      source: 'brand_suggestion_click',
      selectedEntityTitle: brand.name,
      categoryMatchesCount: searchResult.categories.length,
      productMatchesCount: searchResult.products.length,
    });
    selectBrand(brand.name);
    setCurrentView('products');
    setSearchFocused(false);
    setMobileSearchFocused(false);
    setMobileMenuOpen(false);
    setSearchInput('');
  };

  const handleSelectPopularTerm = (term: string) => {
    trackSearchQuery({
      term,
      source: 'trending_term_click',
      categoryMatchesCount: 0,
      productMatchesCount: 0,
    });
    setSearchInput(term);
    setSearchFocused(true);
    setMobileSearchFocused(true);
  };

  const handleViewAllResults = () => {
    if (searchInput.trim()) {
      trackSearchQuery({
        term: searchInput.trim(),
        source: 'desktop_input_submit',
        categoryMatchesCount: searchResult.categories.length,
        productMatchesCount: searchResult.products.length,
      });
      setGlobalSearch(searchInput.trim());
      setCurrentView('products');
      setSearchFocused(false);
      setMobileSearchFocused(false);
      setMobileMenuOpen(false);
    } else {
      setCurrentView('products');
      setSearchFocused(false);
      setMobileSearchFocused(false);
      setMobileMenuOpen(false);
    }
  };

  const handleClearSearch = (isMobile = false) => {
    setSearchInput('');
    setSelectedIndex(-1);
    if (isMobile) {
      mobileSearchInputRef.current?.focus();
    } else {
      searchInputRef.current?.focus();
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent, isMobile = false) => {
    if (e) e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < totalInteractiveItems) {
      if (selectedIndex < searchResult.brands.length) {
        handleSelectBrand(searchResult.brands[selectedIndex]);
        return;
      } else if (selectedIndex < searchResult.brands.length + searchResult.categories.length) {
        const catIdx = selectedIndex - searchResult.brands.length;
        handleSelectCategory(searchResult.categories[catIdx]);
        return;
      } else {
        const prodIdx = selectedIndex - searchResult.brands.length - searchResult.categories.length;
        const prod = searchResult.products[prodIdx];
        handleSelectProduct(prod);
        return;
      }
    }

    if (searchInput.trim()) {
      trackSearchQuery({
        term: searchInput.trim(),
        source: isMobile ? 'mobile_input_submit' : 'desktop_input_submit',
        categoryMatchesCount: searchResult.categories.length,
        productMatchesCount: searchResult.products.length,
      });
      setGlobalSearch(searchInput.trim());
      setCurrentView('products');
      setSearchFocused(false);
      setMobileSearchFocused(false);
      setMobileMenuOpen(false);
    }
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
      setSearchFocused(false);
      setMobileSearchFocused(false);
      setSelectedIndex(-1);
    }
  };

  const navLinks = [
    { label: t.specialOffers, view: 'offers', icon: Flame, highlight: true },
    { label: t.newArrivals, view: 'products', filter: 'new' },
    { label: t.bestSellers, view: 'products', filter: 'bestseller' },
    { label: t.brands, view: 'brands' },
    { label: t.marketingVideos, view: 'videos', icon: Video },
    { label: t.storeServices, view: 'services' },
    { label: t.trackOrder, view: 'track-order' },
    { label: t.contactUs, view: 'contact' },
  ];

  return (
    <header
      style={{
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 0px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 0px)',
      }}
      className="sticky top-0 z-40 bg-white/95 dark:bg-[#0A0F1D]/95 backdrop-blur-xl border-b border-[#DCE5F0] dark:border-[#1E293B] shadow-[0_2px_15px_-3px_rgba(0,122,255,0.06)] dark:shadow-[0_2px_20px_-3px_rgba(0,0,0,0.6)] transition-colors duration-200"
    >
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          {/* Logo */}
          <StoreLogo
            size="md"
            onClick={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Search Bar - Real-Time Search Suggestions */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-lg relative mx-2">
            <form onSubmit={(e) => handleSearchSubmit(e, false)} className="w-full">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={handleKeyDown}
                  aria-label={t.searchPlaceholder}
                  aria-expanded={searchFocused}
                  role="combobox"
                  className="w-full bg-[#F5F8FC] dark:bg-[#111A2E] text-[#172033] dark:text-[#F8FAFC] placeholder-[#64748B] dark:placeholder-slate-400 text-sm rounded-full pl-11 pr-24 rtl:pl-24 rtl:pr-11 py-2.5 border border-[#DCE5F0] dark:border-[#1E293B] focus:bg-white dark:focus:bg-[#162038] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                />
                <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />

                {searchInput && (
                  <button
                    type="button"
                    onClick={() => handleClearSearch(false)}
                    className="absolute right-20 rtl:right-auto rtl:left-20 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#172033] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="submit"
                  className="absolute right-1.5 rtl:right-auto rtl:left-1.5 top-1/2 -translate-y-1/2 bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  {lang === 'ar' ? 'بحث' : 'Search'}
                </button>
              </div>
            </form>

            {/* Real-time Search Suggestion Dropdown */}
            {searchFocused && (
              <SearchSuggestionsDropdown
                query={searchInput}
                brands={searchResult.brands}
                categories={searchResult.categories}
                products={searchResult.products}
                allCategories={categories}
                allBrands={brands}
                totalBrandMatches={searchResult.totalBrandMatches}
                totalCategoryMatches={searchResult.totalCategoryMatches}
                totalProductMatches={searchResult.totalProductMatches}
                lang={lang}
                selectedIndex={selectedIndex}
                onSelectProduct={handleSelectProduct}
                onSelectCategory={handleSelectCategory}
                onSelectBrand={handleSelectBrand}
                onSelectPopularTerm={handleSelectPopularTerm}
                onViewAllResults={handleViewAllResults}
                onClose={() => setSearchFocused(false)}
              />
            )}
          </div>

          {/* Quick Actions & Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* WhatsApp 3D direct link */}
            <a
              href="https://wa.me/96181900916"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all group hover:shadow-sm"
              title="WhatsApp: 81 900 916"
            >
              <WhatsApp3DIcon size={18} />
              <span>81 900 916</span>
            </a>

            {/* Call button */}
            <a
              href="tel:81900916"
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] text-xs font-semibold transition-all group"
            >
              <Phone className="w-3.5 h-3.5 text-[#007AFF] group-hover:scale-110 transition-transform" />
              <span>81 900 916</span>
            </a>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-xs font-bold text-[#172033] dark:text-[#F8FAFC] transition-colors cursor-pointer"
              title="Change Language / تغيير اللغة"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-[#007AFF]" />
              <span className="font-bold">{lang === 'en' ? 'AR' : 'EN'}</span>
            </button>

            {/* Global Dark Mode Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center justify-center p-2 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] transition-colors cursor-pointer group shadow-xs"
              title={
                isDarkMode
                  ? (lang === 'ar' ? 'التبديل إلى الوضع الفاتح' : 'Switch to Light Mode')
                  : (lang === 'ar' ? 'التبديل إلى الوضع الداكن' : 'Switch to Dark Mode')
              }
              aria-label={isDarkMode ? t.lightMode : t.darkMode}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-90 group-hover:scale-110 transition-all duration-300 fill-amber-400/20" />
              ) : (
                <Moon className="w-4 h-4 text-[#007AFF] group-hover:-rotate-12 group-hover:scale-110 transition-all duration-300 fill-[#007AFF]/20" />
              )}
            </button>

            {/* Wishlist */}
            <button
              onClick={() => setCurrentView('wishlist')}
              className="hidden sm:flex relative p-2 rounded-xl text-[#64748B] dark:text-slate-300 hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:bg-[#EAF3FF]/50 dark:hover:bg-[#111A2E] transition-colors cursor-pointer"
              title={t.wishlist}
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#007AFF]/25 transition-all cursor-pointer"
              aria-label="Shopping Cart"
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-[#007AFF] font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-bold">${cartSubtotal}</span>
            </button>

            {/* Admin Portal Shortcut */}
            <button
              onClick={() => setCurrentView('admin')}
              className="hidden lg:flex p-2 rounded-xl text-[#64748B] dark:text-slate-300 hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:bg-[#EAF3FF] dark:hover:bg-[#111A2E] border border-transparent hover:border-[#BAE6FD] dark:hover:border-slate-700 transition-all cursor-pointer"
              title={t.adminPortal}
              aria-label="Admin Portal"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white hover:bg-[#F5F8FC] dark:hover:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dedicated Global Search Bar (Directly accessible on mobile/tablet) */}
        <div ref={mobileSearchContainerRef} className="md:hidden pb-3 relative">
          <form onSubmit={(e) => handleSearchSubmit(e, true)}>
            <div className="relative">
              <input
                ref={mobileSearchInputRef}
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setMobileSearchFocused(true)}
                onKeyDown={handleKeyDown}
                aria-label={t.searchPlaceholder}
                className="w-full bg-[#F5F8FC] dark:bg-[#111A2E] text-[#172033] dark:text-[#F8FAFC] placeholder-[#64748B] dark:placeholder-slate-400 text-xs sm:text-sm rounded-full pl-10 pr-22 rtl:pl-22 rtl:pr-10 py-2.5 border border-[#DCE5F0] dark:border-[#1E293B] focus:outline-none focus:border-[#007AFF] shadow-xs"
              />
              <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

              {searchInput && (
                <button
                  type="button"
                  onClick={() => handleClearSearch(true)}
                  className="absolute right-18 rtl:right-auto rtl:left-18 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#172033] dark:hover:text-white rounded-full cursor-pointer z-10"
                  aria-label="Clear mobile search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="submit"
                className="absolute right-1.5 rtl:right-auto rtl:left-1.5 top-1/2 -translate-y-1/2 bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer shadow-xs z-10"
              >
                {lang === 'ar' ? 'بحث' : 'Search'}
              </button>
            </div>
          </form>

          {/* Mobile Real-time Search Suggestions Dropdown */}
          {mobileSearchFocused && (
            <SearchSuggestionsDropdown
              query={searchInput}
              brands={searchResult.brands}
              categories={searchResult.categories}
              products={searchResult.products}
              allCategories={categories}
              allBrands={brands}
              totalBrandMatches={searchResult.totalBrandMatches}
              totalCategoryMatches={searchResult.totalCategoryMatches}
              totalProductMatches={searchResult.totalProductMatches}
              lang={lang}
              selectedIndex={selectedIndex}
              onSelectProduct={handleSelectProduct}
              onSelectCategory={handleSelectCategory}
              onSelectBrand={handleSelectBrand}
              onSelectPopularTerm={handleSelectPopularTerm}
              onViewAllResults={handleViewAllResults}
              onClose={() => setMobileSearchFocused(false)}
            />
          )}
        </div>

        {/* Desktop Secondary Navigation Bar */}
        <div className="hidden md:flex items-center justify-between py-2.5 border-t border-[#DCE5F0] dark:border-[#1E293B] text-xs font-semibold">
          <div className="flex items-center gap-6">
            {/* Categories Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setCategoriesDropdownOpen(true)}
              onMouseLeave={() => setCategoriesDropdownOpen(false)}
            >
              <button
                onClick={() => setCurrentView('categories')}
                className="flex items-center gap-1.5 text-[#172033] dark:text-[#F8FAFC] hover:text-[#007AFF] dark:hover:text-[#38BDF8] py-1 transition-colors cursor-pointer"
              >
                <span>{t.allCategories}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>

              {categoriesDropdownOpen && (
                <div className="absolute top-full left-0 w-72 bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] rounded-2xl shadow-xl p-3 z-50 grid grid-cols-1 gap-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-[#007AFF] uppercase tracking-wider border-b border-[#DCE5F0] dark:border-[#1E293B] mb-1 flex justify-between bg-[#F5F8FC] dark:bg-[#111A2E] rounded-lg">
                    <span>{lang === 'ar' ? 'الأقسام الرئيسية' : 'Popular Departments'}</span>
                    <button
                      onClick={() => {
                        setCurrentView('categories');
                        setCategoriesDropdownOpen(false);
                      }}
                      className="text-[#64748B] dark:text-slate-400 hover:text-[#007AFF] dark:hover:text-[#38BDF8] underline text-[10px]"
                    >
                      {lang === 'ar' ? 'عرض الكل' : 'View All'}
                    </button>
                  </div>
                  {categories.slice(0, 10).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        selectCategory(cat.slug);
                        setCategoriesDropdownOpen(false);
                      }}
                      className="w-full text-left rtl:text-right px-3 py-2 rounded-lg text-[#172033] dark:text-slate-200 hover:bg-[#EAF3FF] dark:hover:bg-[#1A253C] hover:text-[#007AFF] dark:hover:text-[#38BDF8] text-xs transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span>{lang === 'ar' ? cat.nameAr : cat.name}</span>
                      <span className="text-[10px] text-[#64748B] dark:text-slate-500">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation links */}
            {navLinks.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentView(item.view);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1 py-1 transition-colors cursor-pointer ${
                  currentView === item.view
                    ? 'text-[#007AFF] border-b-2 border-[#007AFF] font-bold'
                    : item.highlight
                    ? 'text-[#007AFF] hover:text-[#0066D6] dark:text-[#38BDF8] dark:hover:text-sky-300 font-bold'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#007AFF] dark:hover:text-[#38BDF8]'
                }`}
              >
                {item.icon && <item.icon className="w-3.5 h-3.5" />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Saida store location pill */}
          <div
            onClick={() => setCurrentView('contact')}
            className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 hover:text-[#007AFF] dark:hover:text-[#38BDF8] cursor-pointer transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-[#007AFF]" />
            <span className="truncate max-w-xs">{t.saidaStore}</span>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-[#0A0F1D] border-b border-[#DCE5F0] dark:border-[#1E293B] px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200 shadow-lg">
          {/* Quick Category Navigation Shortcuts */}
          <div className="pt-1">
            <button
              onClick={() => {
                setCurrentView('categories');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#007AFF]/10 text-[#007AFF] dark:text-[#38BDF8] font-bold text-xs"
            >
              <span>{lang === 'ar' ? 'تصفح كافة الأقسام (35 قسماً)' : 'Browse All 35 Departments'}</span>
              <span>→</span>
            </button>
          </div>

          {/* Mobile Theme Toggle Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white dark:bg-[#1E293B] border border-[#DCE5F0] dark:border-slate-700 shadow-xs">
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                ) : (
                  <Moon className="w-4 h-4 text-[#007AFF] fill-[#007AFF]/20" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">
                  {isDarkMode ? t.darkMode : t.lightMode}
                </div>
                <div className="text-[10px] text-[#64748B] dark:text-slate-400">
                  {lang === 'ar' ? 'المظهر الليلي المريح للعين' : 'Sleek OLED dark experience'}
                </div>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              {isDarkMode
                ? (lang === 'ar' ? 'تفعيل الفاتح' : 'Light Mode')
                : (lang === 'ar' ? 'تفعيل الداكن' : 'Dark Mode')}
            </button>
          </div>

          {/* Mobile Links */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              onClick={() => {
                setCurrentView('offers');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#EAF3FF] dark:bg-[#1E293B] border border-[#BAE6FD] dark:border-[#007AFF]/40 text-[#007AFF] dark:text-[#38BDF8] font-bold flex items-center gap-2"
            >
              <Flame className="w-4 h-4 text-[#007AFF]" />
              <span>{t.specialOffers}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('categories');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF] dark:hover:bg-[#162038]"
            >
              <span>{t.allCategories}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('brands');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF] dark:hover:bg-[#162038]"
            >
              <span>{t.brands}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('videos');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF] dark:hover:bg-[#162038]"
            >
              <Video className="w-4 h-4 text-[#007AFF]" />
              <span>{t.marketingVideos}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('services');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF] dark:hover:bg-[#162038]"
            >
              <span>{t.storeServices}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('wishlist');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] font-semibold flex items-center justify-between hover:bg-[#EAF3FF] dark:hover:bg-[#162038]"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#DC2626]" />
                <span>{t.wishlist}</span>
              </div>
              {wishlist.length > 0 && (
                <span className="bg-[#DC2626] text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                  {wishlist.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setCurrentView('track-order');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF] dark:hover:bg-[#162038]"
            >
              <span>{t.trackOrder}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400">
            <a href="tel:81900916" className="flex items-center gap-1.5 text-[#007AFF] font-bold">
              <Phone className="w-3.5 h-3.5" />
              <span>81 900 916</span>
            </a>
            <button
              onClick={() => {
                setCurrentView('admin');
                setMobileMenuOpen(false);
              }}
              className="text-[#64748B] dark:text-slate-400 hover:text-[#007AFF] dark:hover:text-[#38BDF8] flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t.adminPortal}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
