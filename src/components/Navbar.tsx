import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import {
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  Search,
  Heart,
  Sun,
  Moon,
  ShieldCheck,
  MapPin,
  Phone,
  Flame,
  Video,
  Mic,
} from 'lucide-react';
import { StoreLogo } from './StoreLogo';
import { QuickSearchOverlay } from './QuickSearchOverlay';
import { LazyImage } from './LazyImage';
import { trackSearchQuery } from '../services/searchAnalyticsService';
import { addSearchHistoryTerm } from '../utils/quickSearchOverlayHelpers';
import {
  getHeaderSubNavLinks,
  isHeaderSubNavActive,
  filterHeaderSearchProducts,
  SubNavLinkItem,
} from '../utils/headerSearchHelpers';
import { getHamburgerMenuItems, HamburgerMenuItem } from '../utils/navbarMenuHelpers';

export const Navbar: React.FC = () => {
  const {
    lang,
    t,
    setLang,
    cartCount,
    setIsCartOpen,
    wishlist,
    currentView,
    setCurrentView,
    selectCategory,
    selectBrand,
    productCollectionPreset,
    setProductCollectionPreset,
    setSearchQuery,
    categories,
    products,
    viewProductDetail,
    isDarkMode,
    toggleDarkMode,
  } = useShop();

  const toggleLanguage = () => setLang(lang === 'ar' ? 'en' : 'ar');

  const isArabic = lang === 'ar';

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [headerQuery, setHeaderQuery] = useState<string>('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState<boolean>(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState<boolean>(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  const subNavLinks = useMemo(() => getHeaderSubNavLinks(lang), [lang]);
  const mobileDrawerItems = useMemo(() => getHamburgerMenuItems(lang), [lang]);

  const liveSearchResults = useMemo(() => {
    if (!headerQuery.trim()) return [];
    return filterHeaderSearchProducts(
      products,
      categories,
      headerQuery,
      selectedCategorySlug
    ).slice(0, 6);
  }, [products, categories, headerQuery, selectedCategorySlug]);

  const handleNavigateSubLink = useCallback(
    (item: SubNavLinkItem) => {
      if (item.view === 'products') {
        selectCategory(null);
        selectBrand(null);
        setProductCollectionPreset(item.filterPreset || 'all');
      } else {
        setProductCollectionPreset('all');
        setCurrentView(item.view);
      }
      setCategoriesDropdownOpen(false);
      setSearchDropdownOpen(false);
      setMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [selectCategory, selectBrand, setProductCollectionPreset, setCurrentView]
  );

  const handleNavigateMobileItem = useCallback(
    (item: HamburgerMenuItem) => {
      if (item.view === 'products') {
        selectCategory(null);
        selectBrand(null);
        setProductCollectionPreset(item.filterPreset || 'all');
      } else {
        setProductCollectionPreset('all');
        setCurrentView(item.view);
      }
      setMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [selectCategory, selectBrand, setProductCollectionPreset, setCurrentView]
  );

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = headerQuery.trim();

    if (trimmed) {
      addSearchHistoryTerm(trimmed);
      trackSearchQuery({
        term: trimmed,
        source: 'desktop_input_submit',
        categoryMatchesCount: selectedCategorySlug !== 'all' ? 1 : 0,
        productMatchesCount: liveSearchResults.length,
      });
    }

    if (selectedCategorySlug && selectedCategorySlug !== 'all') {
      selectCategory(selectedCategorySlug);
    } else {
      selectCategory(null);
    }

    selectBrand(null);
    setSearchQuery(trimmed);
    setCurrentView('products');
    setSearchDropdownOpen(false);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchDropdownOpen(false);
      }
      if (categoriesDropdownRef.current && !categoriesDropdownRef.current.contains(target)) {
        setCategoriesDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchDropdownOpen(false);
        setCategoriesDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Keyboard shortcut ('/' or Cmd/Ctrl+K) focuses search or opens Quick Search
  useEffect(() => {
    const handleQuickSearchShortcut = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (
        (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) &&
        activeTag !== 'INPUT' &&
        activeTag !== 'TEXTAREA' &&
        activeTag !== 'SELECT'
      ) {
        event.preventDefault();
        if (window.innerWidth >= 768 && searchInputRef.current) {
          searchInputRef.current.focus();
          setSearchDropdownOpen(true);
        } else {
          setQuickSearchOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleQuickSearchShortcut);
    return () => window.removeEventListener('keydown', handleQuickSearchShortcut);
  }, []);

  return (
    <header
      style={{
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 0px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 0px)',
      }}
      className="relative md:sticky md:top-0 z-40 w-full max-w-full bg-[#161A1D] text-white border-b border-white/[0.08] shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
    >
      {/* Top Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 lg:gap-8 py-3.5 sm:py-4">
          {/* Left Side: Brand Logo & Name */}
          <StoreLogo
            size="md"
            inverted={true}
            showTagline={false}
            onClick={() => {
              setProductCollectionPreset('all');
              setCurrentView('home');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Center: Advanced E-Commerce Search Bar (Desktop & Tablet) */}
          <div
            ref={searchContainerRef}
            className="hidden md:block flex-1 max-w-2xl relative"
          >
            <form
              onSubmit={handleHeaderSearchSubmit}
              role="search"
              aria-label={isArabic ? 'البحث في المتجر' : 'Store product search'}
              className="flex items-stretch w-full h-11 rounded-[10px] overflow-hidden bg-white shadow-sm ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-[#00BAF2] transition-shadow"
            >
              {/* Left Category Dropdown Selector */}
              <div className="relative flex items-center bg-[#F1F5F9] border-r rtl:border-r-0 rtl:border-l border-slate-200 shrink-0">
                <select
                  value={selectedCategorySlug}
                  onChange={(e) => setSelectedCategorySlug(e.target.value)}
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
                  ref={searchInputRef}
                  type="search"
                  value={headerQuery}
                  onChange={(e) => {
                    setHeaderQuery(e.target.value);
                    setSearchDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (headerQuery.trim()) setSearchDropdownOpen(true);
                  }}
                  placeholder={isArabic ? 'عمّ تبحث اليوم؟' : 'What are you looking for?'}
                  aria-label={isArabic ? 'عمّ تبحث اليوم؟' : 'What are you looking for?'}
                  className="w-full h-full px-4 pr-10 rtl:pl-10 rtl:pr-4 bg-white text-[#0F172A] placeholder-slate-400 text-sm focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                {/* Quick Search / Voice Search Trigger */}
                <button
                  type="button"
                  onClick={() => setQuickSearchOpen(true)}
                  aria-label={isArabic ? 'البحث الصوتي والسريع' : 'Open voice and quick search'}
                  title={isArabic ? 'البحث الصوتي والسريع' : 'Voice & Quick Search'}
                  className="absolute right-2 rtl:right-auto rtl:left-2 p-1.5 rounded-md text-slate-400 hover:text-[#00BAF2] hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>

              {/* Right Action Button: Cyan/Teal Search Button */}
              <button
                type="submit"
                aria-label={isArabic ? 'بحث' : 'Search'}
                className="px-5 bg-[#00BAF2] hover:bg-[#00A2D4] text-white flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Search className="w-5 h-5 stroke-[2.25]" />
              </button>
            </form>

            {/* Live Search Results Dropdown */}
            {searchDropdownOpen && headerQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0E1726] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 text-slate-900 dark:text-slate-100">
                {liveSearchResults.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                    {liveSearchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          viewProductDetail(product.id);
                          setSearchDropdownOpen(false);
                          setHeaderQuery('');
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-[#162038] text-left rtl:text-right transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#111A2E] overflow-hidden shrink-0 flex items-center justify-center">
                          {product.images?.[0] ? (
                            <LazyImage
                              src={product.images[0]}
                              alt={product.name}
                              width={40}
                              height={40}
                              priority={true}
                              wrapperClassName="w-full h-full"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Search className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {isArabic ? product.nameAr || product.name : product.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {product.brand} · {product.category}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[#0070F3] dark:text-[#38BDF8] tabular-nums shrink-0">
                          ${product.price}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={(e) => handleHeaderSearchSubmit(e as unknown as React.FormEvent)}
                      className="w-full px-4 py-2.5 text-center text-xs font-semibold text-[#0070F3] dark:text-[#38BDF8] bg-slate-50 dark:bg-[#111A2E] hover:bg-slate-100 dark:hover:bg-[#162038] transition-colors cursor-pointer"
                    >
                      {isArabic
                        ? `عرض جميع النتائج لـ "${headerQuery.trim()}"`
                        : `View all results for "${headerQuery.trim()}"`}
                    </button>
                  </div>
                ) : (
                  <div className="p-5 text-center text-xs text-slate-500 dark:text-slate-400">
                    {isArabic
                      ? `لا توجد منتجات مطابقة لـ "${headerQuery.trim()}"`
                      : `No matching products found for "${headerQuery.trim()}"`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Streamlined Actions (Minimal Cart + Mobile Menu Trigger) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              data-testid="header-cart-button"
              aria-label={isArabic ? `سلة التسوق (${cartCount})` : `Shopping Cart (${cartCount})`}
              className="group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-white hover:bg-white/[0.08] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BAF2]"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white group-hover:text-[#00BAF2] transition-colors" />
                <span
                  data-testid="header-cart-count"
                  className="ml-2 rtl:ml-0 rtl:mr-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#00BAF2] text-[#0B1117] text-[11px] font-bold tabular-nums leading-none"
                >
                  {cartCount}
                </span>
              </div>
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
              aria-label={isArabic ? 'فتح القائمة' : 'Toggle navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="md:hidden pb-3.5">
          <form
            onSubmit={handleHeaderSearchSubmit}
            role="search"
            aria-label={isArabic ? 'البحث في المتجر' : 'Mobile product search'}
            className="flex items-stretch w-full h-10 rounded-[10px] overflow-hidden bg-white shadow-sm"
          >
            <input
              type="search"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              placeholder={isArabic ? 'عمّ تبحث اليوم؟' : 'What are you looking for?'}
              aria-label={isArabic ? 'عمّ تبحث اليوم؟' : 'What are you looking for?'}
              className="flex-1 min-w-0 px-3.5 bg-white text-[#0F172A] placeholder-slate-400 text-xs focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="button"
              onClick={() => setQuickSearchOpen(true)}
              aria-label={isArabic ? 'البحث الصوتي' : 'Voice search'}
              className="px-2.5 bg-white text-slate-400 hover:text-[#00BAF2] transition-colors cursor-pointer"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              aria-label={isArabic ? 'بحث' : 'Search'}
              className="px-4 bg-[#00BAF2] hover:bg-[#00A2D4] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4 stroke-[2.25]" />
            </button>
          </form>
        </div>
      </div>

      {/* Sub-Navbar / Horizontal Navigation Links (Desktop) */}
      <nav
        aria-label={isArabic ? 'التنقل الرئيسي' : 'Main Navigation'}
        className="hidden md:block border-t border-white/[0.08] bg-[#161A1D]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-11 gap-6">
            {/* Primary Horizontal Nav Links */}
            <div className="flex items-center gap-7 min-w-0">
              {subNavLinks.map((item) => {
                const isActive = isHeaderSubNavActive(item, currentView, productCollectionPreset);

                if (item.hasCategoriesDropdown) {
                  return (
                    <div
                      key={item.id}
                      ref={categoriesDropdownRef}
                      className="relative shrink-0"
                      onMouseEnter={() => setCategoriesDropdownOpen(true)}
                      onMouseLeave={() => setCategoriesDropdownOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleNavigateSubLink(item);
                        }}
                        aria-expanded={categoriesDropdownOpen}
                        aria-haspopup="menu"
                        className={`inline-flex items-center gap-1 py-2 text-[13.5px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'text-[#00BAF2]'
                            : 'text-[#CBD5E1] hover:text-white'
                        }`}
                      >
                        <span>{item.label}</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                      </button>

                      {categoriesDropdownOpen && (
                        <div className="absolute top-full left-0 rtl:left-auto rtl:right-0 w-72 bg-[#1E2328] border border-white/10 rounded-xl shadow-2xl p-2 z-50">
                          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#00BAF2] border-b border-white/[0.08] mb-1 flex items-center justify-between">
                            <span>{isArabic ? 'الأقسام الرئيسية' : 'Departments'}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentView('categories');
                                setCategoriesDropdownOpen(false);
                              }}
                              className="text-xs font-medium text-slate-300 hover:text-white underline cursor-pointer"
                            >
                              {isArabic ? 'عرض الكل' : 'View all'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-0.5 max-h-80 overflow-y-auto">
                            {categories.slice(0, 10).map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  selectCategory(cat.slug);
                                  setCategoriesDropdownOpen(false);
                                }}
                                className="w-full text-left rtl:text-right px-3 py-2 rounded-lg text-[13px] font-medium text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer flex items-center justify-between"
                              >
                                <span className="truncate">{isArabic ? cat.nameAr : cat.name}</span>
                                <span className="text-[11px] text-slate-400 rtl:rotate-180">→</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigateSubLink(item)}
                    className={`py-2 text-[13.5px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 relative ${
                      isActive
                        ? 'text-[#00BAF2]'
                        : item.isAccent
                        ? 'text-[#38BDF8] hover:text-[#7DD3FC]'
                        : 'text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Clean Text Utility Links (No Pills) */}
            <div className="flex items-center gap-5 shrink-0 text-[12.5px] font-medium text-[#9CA3AF]">
              <button
                type="button"
                onClick={() => setCurrentView('wishlist')}
                aria-label={t.wishlist}
                title={t.wishlist}
                className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{wishlist.length}</span>
              </button>

              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
                className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isArabic ? 'EN' : 'عربي'}
              </button>

              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label={isDarkMode ? t.lightMode : t.darkMode}
                title={isDarkMode ? t.lightMode : t.darkMode}
                className="hover:text-white transition-colors cursor-pointer shrink-0"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('admin')}
                aria-label={t.adminPortal}
                title={t.adminPortal}
                className="hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden w-full bg-[#161A1D] border-t border-white/[0.08] px-4 pt-3 pb-24 space-y-3 shadow-xl">
          <div className="flex flex-col gap-0.5">
            {mobileDrawerItems.map((item) => {
              const isSpecialOffer = Boolean(item.isHighlighted);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigateMobileItem(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-colors cursor-pointer text-left rtl:text-right ${
                    isSpecialOffer
                      ? 'text-[#38BDF8] font-semibold bg-white/[0.05] hover:bg-white/[0.08]'
                      : 'text-slate-200 font-medium hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.iconType === 'flame' && <Flame className="w-4 h-4 text-[#00BAF2] shrink-0" />}
                    {item.iconType === 'video' && <Video className="w-4 h-4 text-[#00BAF2] shrink-0" />}
                    <span>{item.label}</span>
                  </span>
                  <span className="text-xs text-slate-400 rtl:rotate-180">→</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <a
              href="tel:70773067"
              className="inline-flex items-center gap-1.5 text-[#00BAF2] font-semibold"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span dir="ltr">70 773 067</span>
            </a>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggleLanguage}
                className="text-slate-200 hover:text-white font-semibold cursor-pointer"
              >
                {isArabic ? 'English' : 'العربية'}
              </button>
              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label={isDarkMode ? t.lightMode : t.darkMode}
                className="text-slate-200 hover:text-white cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('admin');
                  setMobileMenuOpen(false);
                }}
                className="text-slate-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t.adminPortal}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentView('contact');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 pt-2 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#00BAF2] shrink-0" />
            <span>{t.saidaStore}</span>
          </button>
        </div>
      )}

      {/* Full-Screen Voice & Quick Search Overlay */}
      <QuickSearchOverlay
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
      />
    </header>
  );
};
