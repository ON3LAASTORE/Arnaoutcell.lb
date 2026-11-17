import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useShop } from '../context/ShopContext';
import {
  ShoppingCart,
  Heart,
  Menu,
  X,
  Flame,
  ShieldCheck,
  MapPin,
  Phone,
  Video,
  ChevronDown,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { StoreLogo } from './StoreLogo';
import { QuickSearchOverlay } from './QuickSearchOverlay';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { ConnectivityIndicator } from './ConnectivityIndicator';
import { LanguageToggle } from './LanguageToggle';
import {
  getHamburgerMenuItems,
  HamburgerMenuItem,
  isHamburgerMenuItemActive,
} from '../utils/navbarMenuHelpers';

export const Navbar: React.FC = () => {
  const {
    lang,
    t,
    cartCount,
    cartSubtotal,
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
  } = useShop();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);

  const hamburgerMenuRef = useRef<HTMLDivElement>(null);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  const menuItems = getHamburgerMenuItems(lang);

  const handleNavigateItem = useCallback(
    (item: HamburgerMenuItem, closeMobile = false) => {
      if (item.view === 'products') {
        selectCategory(null);
        selectBrand(null);
        setProductCollectionPreset(item.filterPreset || 'all');
      } else {
        setProductCollectionPreset('all');
        setCurrentView(item.view);
      }

      setDesktopMenuOpen(false);
      setCategoriesDropdownOpen(false);
      if (closeMobile) {
        setMobileMenuOpen(false);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [selectCategory, selectBrand, setProductCollectionPreset, setCurrentView]
  );

  // Close desktop hamburger dropdown and categories dropdown on outside click or Escape key
  useEffect(() => {
    if (!desktopMenuOpen && !categoriesDropdownOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        desktopMenuOpen &&
        hamburgerMenuRef.current &&
        !hamburgerMenuRef.current.contains(target)
      ) {
        setDesktopMenuOpen(false);
      }
      if (
        categoriesDropdownOpen &&
        categoriesDropdownRef.current &&
        !categoriesDropdownRef.current.contains(target)
      ) {
        setCategoriesDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDesktopMenuOpen(false);
        setCategoriesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [desktopMenuOpen, categoriesDropdownOpen]);

  // Global keyboard shortcut ('/' or Cmd/Ctrl+K) opens full-screen Quick Search overlay
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
        setDesktopMenuOpen(false);
        setCategoriesDropdownOpen(false);
        setMobileMenuOpen(false);
        setQuickSearchOpen(true);
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
      className="sticky top-0 z-40 w-full max-w-full overflow-x-clip bg-white/95 dark:bg-[#0A0F1D]/95 backdrop-blur-xl border-b border-[#DCE5F0] dark:border-[#1E293B] shadow-[0_2px_15px_-3px_rgba(0,122,255,0.06)] dark:shadow-[0_2px_20px_-3px_rgba(0,0,0,0.6)] transition-colors duration-200"
    >
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-1.5 sm:gap-4">
          {/* Logo */}
          <StoreLogo
            size="md"
            onClick={() => {
              setProductCollectionPreset('all');
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Minimalist Spacer & Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Minimalist Quick Search Icon Trigger */}
            <button
              type="button"
              onClick={() => {
                setDesktopMenuOpen(false);
                setCategoriesDropdownOpen(false);
                setMobileMenuOpen(false);
                setQuickSearchOpen(true);
              }}
              data-testid="navbar-quick-search-btn"
              aria-label={lang === 'ar' ? 'فتح البحث السريع' : 'Open quick search'}
              aria-expanded={quickSearchOpen}
              aria-haspopup="dialog"
              title={lang === 'ar' ? 'البحث السريع (/)' : 'Quick Search (/)'}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#0070F3] text-[#172033] dark:text-[#F8FAFC] hover:text-[#0070F3] dark:hover:text-[#38BDF8] transition-all duration-150 active:scale-90 cursor-pointer group shadow-xs shrink-0"
            >
              <Search className="w-4 h-4 sm:w-[18px] sm:h-[18px] group-hover:scale-110 transition-transform" />
            </button>

            {/* Real-time Firebase Firestore Sync & Connectivity Indicator */}
            <ConnectivityIndicator
              lang={lang}
              isCompact={false}
              className="hidden md:inline-flex shrink-0"
            />
            <ConnectivityIndicator
              lang={lang}
              isCompact={true}
              className="md:hidden inline-flex shrink-0"
            />

            {/* WhatsApp 3D direct link */}
            <a
              href="https://wa.me/96170773067"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all group hover:shadow-sm whitespace-nowrap shrink-0"
              title="WhatsApp: 70 773 067"
            >
              <WhatsApp3DIcon size={18} />
              <span dir="ltr">70 773 067</span>
            </a>

            {/* Call button (redundant with WhatsApp 70 773 067 below 2xl) */}
            <a
              href="tel:70773067"
              className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] text-xs font-semibold transition-all group whitespace-nowrap shrink-0"
            >
              <Phone className="w-3.5 h-3.5 text-[#007AFF] group-hover:scale-110 transition-transform shrink-0" />
              <span dir="ltr">70 773 067</span>
            </a>

            {/* Language Switcher Component (EN / AR with RTL class support) */}
            <LanguageToggle variant="compact" />

            {/* Global Dark Mode Theme Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex items-center justify-center p-2 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] transition-transform duration-100 active:scale-90 cursor-pointer group shadow-xs shrink-0"
              title={
                isDarkMode
                  ? lang === 'ar'
                    ? 'التبديل إلى الوضع الفاتح'
                    : 'Switch to Light Mode'
                  : lang === 'ar'
                  ? 'التبديل إلى الوضع الداكن'
                  : 'Switch to Dark Mode'
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
              type="button"
              onClick={() => setCurrentView('wishlist')}
              className="hidden sm:flex relative p-2 rounded-xl text-[#64748B] dark:text-slate-300 hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:bg-[#EAF3FF]/50 dark:hover:bg-[#111A2E] transition-transform duration-100 active:scale-90 cursor-pointer shrink-0"
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
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#007AFF]/25 transition-transform duration-100 active:scale-90 cursor-pointer whitespace-nowrap shrink-0"
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
              type="button"
              onClick={() => setCurrentView('admin')}
              className="hidden lg:flex p-2 rounded-xl text-[#64748B] dark:text-slate-300 hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:bg-[#EAF3FF] dark:hover:bg-[#111A2E] border border-transparent hover:border-[#BAE6FD] dark:hover:border-slate-700 transition-transform duration-100 active:scale-90 cursor-pointer"
              title={t.adminPortal}
              aria-label="Admin Portal"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white hover:bg-[#F5F8FC] dark:hover:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] transition-transform duration-100 active:scale-90 cursor-pointer"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Minimal Secondary Navigation Bar */}
        <nav
          aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main Navigation'}
          className="hidden md:flex items-center justify-between py-2.5 border-t border-[#DCE5F0] dark:border-[#1E293B]"
        >
          {/* Left Side: Consolidated Hamburger Trigger + Categories Dropdown */}
          <div className="flex items-center gap-3">
            {/* Hamburger Trigger & Consolidated Navigation Dropdown */}
            <div ref={hamburgerMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setDesktopMenuOpen((prev) => !prev);
                  setCategoriesDropdownOpen(false);
                }}
                aria-label={
                  desktopMenuOpen
                    ? lang === 'ar'
                      ? 'إغلاق قائمة التنقل'
                      : 'Close navigation menu'
                    : lang === 'ar'
                    ? 'فتح قائمة التنقل'
                    : 'Open navigation menu'
                }
                aria-expanded={desktopMenuOpen}
                aria-haspopup="menu"
                className={`group flex items-center justify-center w-9 h-9 rounded-[10px] border transition-all duration-200 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0070F3] ${
                  desktopMenuOpen
                    ? 'bg-[#F1F5F9] dark:bg-[#1A253C] border-[#CBD5E1] dark:border-slate-600 text-[#0F172A] dark:text-white shadow-xs'
                    : 'bg-white dark:bg-[#111A2E] border-[#E5E7EB] dark:border-[#1E293B] text-[#1E293B] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C] hover:border-[#CBD5E1]'
                }`}
              >
                {/* Animated 3-bar hamburger morphing smoothly into an X close icon */}
                <span className="relative w-4 h-3.5 flex flex-col justify-between items-center pointer-events-none">
                  <span
                    className={`block w-4 h-[1.75px] rounded-full bg-current transform transition-all duration-200 ease-out origin-center ${
                      desktopMenuOpen ? 'translate-y-[6px] rotate-45' : ''
                    }`}
                  />
                  <span
                    className={`block w-4 h-[1.75px] rounded-full bg-current transform transition-all duration-200 ease-out ${
                      desktopMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                    }`}
                  />
                  <span
                    className={`block w-4 h-[1.75px] rounded-full bg-current transform transition-all duration-200 ease-out origin-center ${
                      desktopMenuOpen ? '-translate-y-[6px] -rotate-45' : ''
                    }`}
                  />
                </span>
              </button>

              {/* Consolidated Dropdown Drawer Panel */}
              <div
                role="menu"
                aria-label={lang === 'ar' ? 'قائمة التنقل السريع' : 'Navigation Menu'}
                aria-hidden={!desktopMenuOpen}
                className={`absolute top-full mt-2.5 left-0 rtl:left-auto rtl:right-0 w-72 bg-white dark:bg-[#0E1726] border border-[#E5E7EB] dark:border-[#1E293B] rounded-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.55)] p-2 z-50 transition-all duration-200 ease-out origin-top-left rtl:origin-top-right ${
                  desktopMenuOpen
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto visible'
                    : 'opacity-0 -translate-y-1.5 scale-[0.98] pointer-events-none invisible'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  {menuItems.map((item) => {
                    const isActive = isHamburgerMenuItemActive(
                      item,
                      currentView,
                      productCollectionPreset
                    );
                    const isSpecialOffer = Boolean(item.isHighlighted);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        tabIndex={desktopMenuOpen ? 0 : -1}
                        onClick={() => handleNavigateItem(item)}
                        className={`w-full flex items-center justify-between gap-2.5 px-4 py-3 rounded-[10px] text-[14.5px] leading-snug transition-all duration-200 ease-out cursor-pointer text-left rtl:text-right focus-visible:outline-2 focus-visible:outline-[#0070F3] ${
                          isSpecialOffer
                            ? isActive
                              ? 'bg-[#EFF6FF] dark:bg-[#162742] text-[#0070F3] dark:text-[#38BDF8] font-semibold'
                              : 'text-[#0070F3] dark:text-[#38BDF8] font-semibold hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C]'
                            : isActive
                            ? 'bg-[#F1F5F9] dark:bg-[#1A253C] text-[#0070F3] dark:text-[#38BDF8] font-semibold'
                            : 'text-[#1E293B] dark:text-slate-100 font-medium hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          {item.iconType === 'flame' && (
                            <Flame
                              className="w-4 h-4 text-[#0070F3] dark:text-[#38BDF8] shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          {item.iconType === 'video' && (
                            <Video
                              className="w-4 h-4 text-[#0070F3] dark:text-[#38BDF8] shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span
                          className={`text-xs transition-transform duration-200 rtl:rotate-180 ${
                            isSpecialOffer || isActive
                              ? 'text-[#0070F3] dark:text-[#38BDF8]'
                              : 'text-[#94A3B8]'
                          }`}
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Drawer Footer: Store Location */}
                <div className="mt-1.5 pt-1.5 border-t border-[#E5E7EB] dark:border-[#1E293B]">
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={desktopMenuOpen ? 0 : -1}
                    onClick={() => {
                      setProductCollectionPreset('all');
                      setCurrentView('contact');
                      setDesktopMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C] hover:text-[#1E293B] dark:hover:text-slate-200 transition-all duration-200 ease-out cursor-pointer text-left rtl:text-right"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#0070F3] shrink-0" aria-hidden="true" />
                    <span className="truncate">{t.saidaStore}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Categories Dropdown */}
            <div
              ref={categoriesDropdownRef}
              className="relative"
              onMouseEnter={() => {
                setCategoriesDropdownOpen(true);
                setDesktopMenuOpen(false);
              }}
              onMouseLeave={() => setCategoriesDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setCurrentView('categories');
                  setCategoriesDropdownOpen(false);
                  setDesktopMenuOpen(false);
                }}
                aria-expanded={categoriesDropdownOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[13.5px] font-semibold text-[#172033] dark:text-[#F8FAFC] hover:text-[#0070F3] dark:hover:text-[#38BDF8] hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{t.allCategories}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#0070F3]" />
              </button>

              {categoriesDropdownOpen && (
                <div className="absolute top-full left-0 rtl:left-auto rtl:right-0 w-72 bg-white dark:bg-[#0E1726] border border-[#E5E7EB] dark:border-[#1E293B] rounded-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.55)] p-3 z-50 grid grid-cols-1 gap-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-[#0070F3] uppercase tracking-wider border-b border-[#DCE5F0] dark:border-[#1E293B] mb-1 flex justify-between bg-[#F5F8FC] dark:bg-[#111A2E] rounded-lg">
                    <span>{lang === 'ar' ? 'الأقسام الرئيسية' : 'Popular Departments'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('categories');
                        setCategoriesDropdownOpen(false);
                      }}
                      className="text-[#64748B] dark:text-slate-400 hover:text-[#0070F3] dark:hover:text-[#38BDF8] underline text-[10px] cursor-pointer"
                    >
                      {lang === 'ar' ? 'عرض الكل' : 'View All'}
                    </button>
                  </div>
                  {categories.slice(0, 10).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        selectCategory(cat.slug);
                        setCategoriesDropdownOpen(false);
                      }}
                      className="w-full text-left rtl:text-right px-3 py-2 rounded-[10px] text-[#1E293B] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C] hover:text-[#0070F3] dark:hover:text-[#38BDF8] text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span>{lang === 'ar' ? cat.nameAr : cat.name}</span>
                      <span className="text-[10px] text-[#64748B] dark:text-slate-500 rtl:rotate-180">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Store Location Tag */}
          <button
            type="button"
            onClick={() => {
              setProductCollectionPreset('all');
              setCurrentView('contact');
              setDesktopMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] dark:text-slate-400 hover:text-[#0070F3] dark:hover:text-[#38BDF8] cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <MapPin className="w-3.5 h-3.5 text-[#0070F3] shrink-0" />
            <span className="truncate max-w-xs">{t.saidaStore}</span>
          </button>
        </nav>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden w-full max-w-full overflow-hidden bg-white dark:bg-[#0A0F1D] border-b border-[#DCE5F0] dark:border-[#1E293B] px-3 sm:px-4 pt-3 pb-24 space-y-4 animate-in slide-in-from-top duration-200 shadow-lg">
          {/* Mobile Drawer Store Profile Header */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#F5F8FC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] min-w-0">
            <StoreLogo
              size="md"
              showTagline={true}
              className="min-w-0 flex-1"
              onClick={() => {
                setProductCollectionPreset('all');
                setCurrentView('home');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF3FF] dark:bg-[#132238] text-[#007AFF] dark:text-[#38BDF8] border border-[#BAE6FD] dark:border-[#1E3A5F] shrink-0">
              {lang === 'ar' ? 'الشوف' : 'Chouf'}
            </span>
          </div>

          {/* Quick Category Navigation Shortcuts */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setCurrentView('categories');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#007AFF]/10 text-[#007AFF] dark:text-[#38BDF8] font-bold text-xs cursor-pointer"
            >
              <span>{lang === 'ar' ? 'تصفح كافة الأقسام (35 قسماً)' : 'Browse All 35 Departments'}</span>
              <span className="rtl:rotate-180">→</span>
            </button>
          </div>

          {/* Mobile Language Switcher (English / Arabic RTL) */}
          <LanguageToggle variant="full" />

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
              type="button"
              onClick={toggleDarkMode}
              className="px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              {isDarkMode
                ? lang === 'ar'
                  ? 'تفعيل الفاتح'
                  : 'Light Mode'
                : lang === 'ar'
                ? 'تفعيل الداكن'
                : 'Dark Mode'}
            </button>
          </div>

          {/* Mobile Cloud Synchronization Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B]">
            <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">
              {lang === 'ar' ? 'حالة المزامنة السحابية' : 'Cloud Sync Status'}
            </div>
            <ConnectivityIndicator lang={lang} isCompact={false} />
          </div>

          {/* Mobile Vertical Navigation Links */}
          <div className="bg-white dark:bg-[#0E1726] border border-[#E5E7EB] dark:border-[#1E293B] rounded-[14px] p-1.5 flex flex-col gap-0.5">
            {menuItems.map((item) => {
              const isSpecialOffer = Boolean(item.isHighlighted);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigateItem(item, true)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-[10px] text-sm transition-colors cursor-pointer text-left rtl:text-right ${
                    isSpecialOffer
                      ? 'text-[#0070F3] dark:text-[#38BDF8] font-semibold bg-[#EFF6FF]/60 dark:bg-[#162742]/50 hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C]'
                      : 'text-[#1E293B] dark:text-slate-100 font-medium hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.iconType === 'flame' && (
                      <Flame className="w-4 h-4 text-[#0070F3] dark:text-[#38BDF8] shrink-0" />
                    )}
                    {item.iconType === 'video' && (
                      <Video className="w-4 h-4 text-[#0070F3] dark:text-[#38BDF8] shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </span>
                  <span className="text-xs text-[#94A3B8] rtl:rotate-180">→</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setCurrentView('wishlist');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-[10px] text-sm text-[#1E293B] dark:text-slate-100 font-medium hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C] cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span>{t.wishlist}</span>
              </span>
              {wishlist.length > 0 && (
                <span className="bg-[#DC2626] text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                  {wishlist.length}
                </span>
              )}
            </button>
            <div className="mt-1 pt-1 border-t border-[#E5E7EB] dark:border-[#1E293B]">
              <button
                type="button"
                onClick={() => {
                  setCurrentView('contact');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-xs font-medium text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#1A253C] cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#0070F3] shrink-0" />
                <span>{t.saidaStore}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400">
            <a href="tel:70773067" className="flex items-center gap-1.5 text-[#007AFF] font-bold">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span dir="ltr">70 773 067</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setCurrentView('admin');
                setMobileMenuOpen(false);
              }}
              className="text-[#64748B] dark:text-slate-400 hover:text-[#007AFF] dark:hover:text-[#38BDF8] flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t.adminPortal}</span>
            </button>
          </div>
        </div>
      )}
      {/* Full-Screen Quick Search Overlay */}
      <QuickSearchOverlay
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
      />
    </header>
  );
};
