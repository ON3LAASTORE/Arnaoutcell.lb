import React, { useState } from 'react';
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
} from 'lucide-react';
import { StoreLogo } from './StoreLogo';
import { GlobalSearch } from './GlobalSearch';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { ConnectivityIndicator } from './ConnectivityIndicator';
import { LanguageToggle } from './LanguageToggle';

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
    categories,
    isDarkMode,
    toggleDarkMode,
  } = useShop();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);

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
      className="sticky top-0 z-40 w-full max-w-full overflow-x-clip bg-white/95 dark:bg-[#0A0F1D]/95 backdrop-blur-xl border-b border-[#DCE5F0] dark:border-[#1E293B] shadow-[0_2px_15px_-3px_rgba(0,122,255,0.06)] dark:shadow-[0_2px_20px_-3px_rgba(0,0,0,0.6)] transition-colors duration-200"
    >
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-1.5 sm:gap-4">
          {/* Logo */}
          <StoreLogo
            size="md"
            onClick={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Global Search Component - Quick search by Name, Brand, or Category */}
          <GlobalSearch isMobile={false} className="hidden md:flex flex-1 min-w-[230px] max-w-md xl:max-w-lg relative mx-1 lg:mx-2" />

          {/* Quick Actions & Cart */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
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
              href="https://wa.me/9613986718"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all group hover:shadow-sm whitespace-nowrap shrink-0"
              title="WhatsApp: 03 986 718"
            >
              <WhatsApp3DIcon size={18} />
              <span dir="ltr">03 986 718</span>
            </a>

            {/* Call button (redundant with WhatsApp 03 986 718 below 2xl) */}
            <a
              href="tel:03986718"
              className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] text-xs font-semibold transition-all group whitespace-nowrap shrink-0"
            >
              <Phone className="w-3.5 h-3.5 text-[#007AFF] group-hover:scale-110 transition-transform shrink-0" />
              <span dir="ltr">03 986 718</span>
            </a>

            {/* Language Switcher Component (EN / AR with RTL class support) */}
            <LanguageToggle variant="compact" />

            {/* Global Dark Mode Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center justify-center p-2 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] transition-transform duration-100 active:scale-90 cursor-pointer group shadow-xs shrink-0"
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
              onClick={() => setCurrentView('admin')}
              className="hidden lg:flex p-2 rounded-xl text-[#64748B] dark:text-slate-300 hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:bg-[#EAF3FF] dark:hover:bg-[#111A2E] border border-transparent hover:border-[#BAE6FD] dark:hover:border-slate-700 transition-transform duration-100 active:scale-90 cursor-pointer"
              title={t.adminPortal}
              aria-label="Admin Portal"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white hover:bg-[#F5F8FC] dark:hover:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] transition-transform duration-100 active:scale-90 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dedicated Global Search Component */}
        <GlobalSearch
          isMobile={true}
          className="md:hidden pb-3 relative"
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

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
                <div className="absolute top-full left-0 rtl:left-auto rtl:right-0 w-72 bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] rounded-2xl shadow-xl p-3 z-50 grid grid-cols-1 gap-1">
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
                      <span className="text-[10px] text-[#64748B] dark:text-slate-500 rtl:rotate-180">→</span>
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

          {/* Chouf Online Store & Lebanon Delivery pill */}
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
        <div className="md:hidden w-full max-w-full overflow-hidden bg-white dark:bg-[#0A0F1D] border-b border-[#DCE5F0] dark:border-[#1E293B] px-3 sm:px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200 shadow-lg">
          {/* Mobile Drawer Store Profile Header */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#F5F8FC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] min-w-0">
            <StoreLogo
              size="md"
              showTagline={true}
              className="min-w-0 flex-1"
              onClick={() => {
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
              onClick={() => {
                setCurrentView('categories');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#007AFF]/10 text-[#007AFF] dark:text-[#38BDF8] font-bold text-xs"
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
              onClick={toggleDarkMode}
              className="px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              {isDarkMode
                ? (lang === 'ar' ? 'تفعيل الفاتح' : 'Light Mode')
                : (lang === 'ar' ? 'تفعيل الداكن' : 'Dark Mode')}
            </button>
          </div>

          {/* Mobile Cloud Synchronization Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B]">
            <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">
              {lang === 'ar' ? 'حالة المزامنة السحابية' : 'Cloud Sync Status'}
            </div>
            <ConnectivityIndicator lang={lang} isCompact={false} />
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
            <a href="tel:03986718" className="flex items-center gap-1.5 text-[#007AFF] font-bold">
              <Phone className="w-3.5 h-3.5" />
              <span>03 986 718</span>
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
