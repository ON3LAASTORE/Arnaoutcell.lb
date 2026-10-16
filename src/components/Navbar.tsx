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
} from 'lucide-react';
import { StoreLogo } from './StoreLogo';

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
    products,
    viewProductDetail,
    setSearchQuery: setGlobalSearch,
  } = useShop();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search filtering
  const matchingProducts = searchInput.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchInput.toLowerCase()) ||
            (p.nameAr && p.nameAr.includes(searchInput)) ||
            p.brand.toLowerCase().includes(searchInput.toLowerCase()) ||
            p.category.toLowerCase().includes(searchInput.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchInput.toLowerCase())
        )
        .slice(0, 6)
    : [];

  // Close search suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setGlobalSearch(searchInput.trim());
      setCurrentView('products');
      setSearchFocused(false);
      setMobileMenuOpen(false);
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-[#DCE5F0] shadow-[0_2px_15px_-3px_rgba(0,122,255,0.06)] transition-all">
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

          {/* Search Bar - Live Autocomplete */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-lg relative mx-2">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="w-full bg-[#F5F8FC] text-[#172033] placeholder-[#64748B] text-sm rounded-full pl-11 pr-24 py-2.5 border border-[#DCE5F0] focus:bg-white focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                />
                <Search className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'بحث' : 'Search'}
                </button>
              </div>
            </form>

            {/* Live Autocomplete Dropdown */}
            {searchFocused && searchInput.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#DCE5F0] rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-2 border-b border-[#DCE5F0] text-[11px] font-semibold text-[#64748B] flex justify-between items-center px-3 bg-[#F5F8FC]">
                  <span>{lang === 'ar' ? 'نتائج مقترحة فورية' : 'Live Suggestions'}</span>
                  <span>{matchingProducts.length} {lang === 'ar' ? 'منتجات' : 'matches'}</span>
                </div>

                {matchingProducts.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#DCE5F0]">
                    {matchingProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          viewProductDetail(p.id);
                          setSearchFocused(false);
                          setSearchInput('');
                        }}
                        className="p-3 hover:bg-[#EAF3FF]/60 cursor-pointer flex items-center gap-3 transition-colors group"
                      >
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-12 h-12 object-cover rounded-lg bg-[#F5F8FC] border border-[#DCE5F0] flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#172033] group-hover:text-[#007AFF] truncate">
                            {lang === 'ar' ? p.nameAr || p.name : p.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs mt-0.5">
                            <span className="text-[#64748B]">{p.brand}</span>
                            <span className="text-[#DCE5F0]">•</span>
                            <span className="font-bold text-[#007AFF]">${p.price}</span>
                            {p.originalPrice > p.price && (
                              <span className="text-[#64748B] line-through text-[11px]">
                                ${p.originalPrice}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-[#64748B]">
                    {lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching products found'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions & Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Call button */}
            <a
              href="tel:03099889"
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F8FC] border border-[#DCE5F0] hover:border-[#007AFF] text-[#172033] text-xs font-semibold transition-all group"
            >
              <Phone className="w-3.5 h-3.5 text-[#007AFF] group-hover:scale-110 transition-transform" />
              <span>03 099 889</span>
            </a>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] hover:border-[#007AFF] text-xs font-bold text-[#172033] transition-colors cursor-pointer"
              title="Change Language / تغيير اللغة"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-[#007AFF]" />
              <span className="font-bold">{lang === 'en' ? 'AR' : 'EN'}</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => setCurrentView('wishlist')}
              className="hidden sm:flex relative p-2 rounded-xl text-[#64748B] hover:text-[#007AFF] hover:bg-[#EAF3FF]/50 transition-colors cursor-pointer"
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
              className="hidden lg:flex p-2 rounded-xl text-[#64748B] hover:text-[#007AFF] hover:bg-[#EAF3FF] border border-transparent hover:border-[#BAE6FD] transition-all cursor-pointer"
              title={t.adminPortal}
              aria-label="Admin Portal"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#64748B] hover:text-[#172033] hover:bg-[#F5F8FC] border border-[#DCE5F0] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Secondary Navigation Bar */}
        <div className="hidden md:flex items-center justify-between py-2.5 border-t border-[#DCE5F0] text-xs font-semibold">
          <div className="flex items-center gap-6">
            {/* Categories Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setCategoriesDropdownOpen(true)}
              onMouseLeave={() => setCategoriesDropdownOpen(false)}
            >
              <button
                onClick={() => setCurrentView('categories')}
                className="flex items-center gap-1.5 text-[#172033] hover:text-[#007AFF] py-1 transition-colors cursor-pointer"
              >
                <span>{t.allCategories}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>

              {categoriesDropdownOpen && (
                <div className="absolute top-full left-0 w-72 bg-white border border-[#DCE5F0] rounded-2xl shadow-xl p-3 z-50 grid grid-cols-1 gap-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-[#007AFF] uppercase tracking-wider border-b border-[#DCE5F0] mb-1 flex justify-between bg-[#F5F8FC] rounded-lg">
                    <span>{lang === 'ar' ? 'الأقسام الرئيسية' : 'Popular Departments'}</span>
                    <button
                      onClick={() => {
                        setCurrentView('categories');
                        setCategoriesDropdownOpen(false);
                      }}
                      className="text-[#64748B] hover:text-[#007AFF] underline text-[10px]"
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
                      className="w-full text-left rtl:text-right px-3 py-2 rounded-lg text-[#172033] hover:bg-[#EAF3FF] hover:text-[#007AFF] text-xs transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span>{lang === 'ar' ? cat.nameAr : cat.name}</span>
                      <span className="text-[10px] text-[#64748B]">→</span>
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
                    ? 'text-[#007AFF] hover:text-[#0066D6] font-bold'
                    : 'text-[#64748B] hover:text-[#007AFF]'
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
            className="flex items-center gap-1.5 text-[#64748B] hover:text-[#007AFF] cursor-pointer transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-[#007AFF]" />
            <span className="truncate max-w-xs">{t.saidaStore}</span>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#DCE5F0] px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200 shadow-lg">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-[#F5F8FC] text-[#172033] placeholder-[#64748B] text-sm rounded-xl pl-10 pr-4 py-2.5 border border-[#DCE5F0] focus:outline-none focus:border-[#007AFF]"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </form>

          {/* Mobile Links */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              onClick={() => {
                setCurrentView('offers');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] font-bold flex items-center gap-2"
            >
              <Flame className="w-4 h-4 text-[#007AFF]" />
              <span>{t.specialOffers}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('categories');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF]"
            >
              <span>{t.allCategories}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('brands');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF]"
            >
              <span>{t.brands}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('videos');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF]"
            >
              <Video className="w-4 h-4 text-[#007AFF]" />
              <span>{t.marketingVideos}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('services');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF]"
            >
              <span>{t.storeServices}</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('wishlist');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] font-semibold flex items-center justify-between hover:bg-[#EAF3FF]"
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
              className="p-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] font-semibold flex items-center gap-2 hover:bg-[#EAF3FF]"
            >
              <span>{t.trackOrder}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#DCE5F0] flex items-center justify-between text-xs text-[#64748B]">
            <a href="tel:03099889" className="flex items-center gap-1.5 text-[#007AFF] font-bold">
              <Phone className="w-3.5 h-3.5" />
              <span>03 099 889</span>
            </a>
            <button
              onClick={() => {
                setCurrentView('admin');
                setMobileMenuOpen(false);
              }}
              className="text-[#64748B] hover:text-[#007AFF] flex items-center gap-1"
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
