import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import {
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  Heart,
  Sun,
  Moon,
  ShieldCheck,
  MapPin,
  Phone,
  Flame,
  Video,
  Scale,
  QrCode,
} from 'lucide-react';
import { StoreLogo } from './StoreLogo';
import { GlobalSearch } from './GlobalSearch';
import { QuickSearchOverlay } from './QuickSearchOverlay';
import {
  getHeaderSubNavLinks,
  isHeaderSubNavActive,
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
    categories,
    isDarkMode,
    toggleDarkMode,
    compareList,
    setIsCompareModalOpen,
    setIsQrScannerOpen,
  } = useShop();

  const toggleLanguage = () => setLang(lang === 'ar' ? 'en' : 'ar');

  const isArabic = lang === 'ar';

  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState<boolean>(false);

  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  const subNavLinks = useMemo(() => getHeaderSubNavLinks(lang), [lang]);
  const mobileDrawerItems = useMemo(() => getHamburgerMenuItems(lang), [lang]);

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

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (categoriesDropdownRef.current && !categoriesDropdownRef.current.contains(target)) {
        setCategoriesDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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

          {/* Center: Global Search Component (Desktop & Tablet) */}
          <GlobalSearch
            variant="navbar"
            className="hidden md:block flex-1 max-w-2xl"
            onOpenQuickSearch={() => setQuickSearchOpen(true)}
          />

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

        {/* Mobile Global Search Bar Row */}
        <div className="md:hidden pb-3.5">
          <GlobalSearch
            isMobile={true}
            variant="navbar"
            onOpenQuickSearch={() => setQuickSearchOpen(true)}
            onCloseMobileMenu={() => setMobileMenuOpen(false)}
          />
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
                data-testid="navbar-qr-scanner-button"
                onClick={() => setIsQrScannerOpen(true)}
                aria-label={isArabic ? 'مسح رمز QR للبحث عن منتج' : 'Scan Product QR Code'}
                title={isArabic ? 'مسح رمز QR للبحث عن منتج' : 'Scan Product QR Code'}
                className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <QrCode className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span>{isArabic ? 'مسح QR' : 'Scan QR'}</span>
              </button>

              <button
                type="button"
                data-testid="navbar-compare-button"
                onClick={() => setIsCompareModalOpen(true)}
                aria-label={
                  isArabic
                    ? `مقارنة المنتجات (${compareList.length})`
                    : `Compare Products (${compareList.length})`
                }
                title={isArabic ? 'مقارنة المنتجات جنباً إلى جنب' : 'Compare Products Side-by-Side'}
                className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Scale className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span>{isArabic ? 'مقارنة' : 'Compare'}</span>
                {compareList.length > 0 && (
                  <span className="tabular-nums text-[#00BAF2] font-bold">({compareList.length})</span>
                )}
              </button>

              <button
                type="button"
                data-testid="navbar-wishlist-btn"
                onClick={() => setCurrentView('wishlist')}
                aria-label={t.wishlist}
                title={t.wishlist}
                className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-colors ${
                    wishlist.length > 0 ? 'text-rose-400 fill-current' : ''
                  }`}
                />
                <span data-testid="navbar-wishlist-count" className="tabular-nums">
                  {wishlist.length}
                </span>
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
                data-testid="mobile-menu-qr-scanner-button"
                onClick={() => {
                  setIsQrScannerOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="text-[#00BAF2] hover:text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{isArabic ? 'مسح QR' : 'Scan QR'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCompareModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="text-[#00BAF2] hover:text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>
                  {isArabic ? 'مقارنة' : 'Compare'}
                  {compareList.length > 0 ? ` (${compareList.length})` : ''}
                </span>
              </button>
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
