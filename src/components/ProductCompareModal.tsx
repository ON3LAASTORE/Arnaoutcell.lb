import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../context/ShopContext';
import {
  X,
  Scale,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Star,
  ExternalLink,
  Share2,
  Printer,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { LazyImage } from './LazyImage';
import { openExternalUrl } from '../utils/navigation';
import {
  extractComparisonSpecLabels,
  getProductSpecValue,
  MAX_COMPARE_LIMIT,
} from '../utils/compareHelpers';
import { Product } from '../types';

export const ProductCompareModal: React.FC = () => {
  const {
    lang,
    compareList,
    removeFromCompare,
    clearCompareList,
    addToCompare,
    isCompareModalOpen,
    setIsCompareModalOpen,
    addToCart,
    setCurrentView,
    products,
    storeSettings,
  } = useShop();

  const isArabic = lang === 'ar';
  const [highlightDifferences, setHighlightDifferences] = useState(false);
  const [showAddSelector, setShowAddSelector] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCompareModalOpen) {
        setIsCompareModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompareModalOpen, setIsCompareModalOpen]);

  if (!isCompareModalOpen) return null;

  // Unified spec labels across all compared items
  const specLabels = extractComparisonSpecLabels(compareList);

  // Available devices to add (smartphones & laptops not currently in comparison)
  const candidateProducts = products
    .filter((p) => p.isPublished && !compareList.some((cp) => cp.id === p.id))
    .filter((p) => {
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.nameAr && p.nameAr.includes(q)) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  const handleWhatsAppOrder = (product: Product) => {
    const phone = storeSettings.whatsapp || '96181900916';
    const text = encodeURIComponent(
      isArabic
        ? `مرحباً أرناؤوط ستور! أود طلب هذا الجهاز بعد مقارنة المواصفات:\n- الجهاز: ${product.nameAr || product.name}\n- السعر: $${product.price} USD\n- الكود: ${product.id}\nالرجاء تأكيد التوفر في صيدا.`
        : `Hello ARNAOUT STORE! I want to order this product after comparing specs:\n- Device: ${product.name}\n- Price: $${product.price} USD\n- SKU: ${product.id}\nPlease confirm availability in Saida.`
    );
    openExternalUrl(`https://wa.me/${phone}?text=${text}`);
  };

  const handleShareComparison = () => {
    const phone = storeSettings.whatsapp || '96181900916';
    const names = compareList.map((p) => p.name).join(' vs ');
    const text = encodeURIComponent(
      isArabic
        ? `مرحباً أرناؤوط ستور! أود استشارتكم في مقارنة الأجهزة التالية:\n${names}\nما هو خياركم الأنسب لميزانيتي؟`
        : `Hello ARNAOUT STORE! I am comparing these models:\n${names}\nWhich one do you recommend for my needs?`
    );
    openExternalUrl(`https://wa.me/${phone}?text=${text}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      data-testid="product-compare-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsCompareModalOpen(false);
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#0A0F1D] border border-[#DCE5F0] dark:border-[#1E293B] shadow-2xl overflow-hidden text-[#172033] dark:text-[#F8FAFC]"
      >
        {/* =========================================================================
            1. MODAL HEADER
        ========================================================================== */}
        <div className="p-4 sm:p-6 border-b border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between gap-4 bg-[#F8FAFC] dark:bg-[#070C16] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007AFF] text-white flex items-center justify-center shadow-md shadow-[#007AFF]/25">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-[#172033] dark:text-white">
                  {isArabic ? 'مقارنة المواصفات الفنية' : 'Compare Specifications'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:text-[#38BDF8] text-[11px] font-black">
                  {compareList.length} / {MAX_COMPARE_LIMIT}{' '}
                  {isArabic ? 'أجهزة' : 'Devices'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                {isArabic
                  ? 'مقارنة دقيقة وشاملة للمواصفات والأسعار النقدية بالدولار'
                  : 'Side-by-side technical comparison with real cash USD prices in Lebanon'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Highlight Differences Toggle */}
            {compareList.length > 1 && (
              <button
                type="button"
                onClick={() => setHighlightDifferences(!highlightDifferences)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  highlightDifferences
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-700 dark:text-purple-300'
                    : 'bg-white dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#64748B] dark:text-slate-400 hover:text-[#172033]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تمييز الفروقات' : 'Highlight Differences'}</span>
              </button>
            )}

            {/* Share via WhatsApp */}
            {compareList.length > 0 && (
              <button
                type="button"
                onClick={handleShareComparison}
                className="hidden sm:flex p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                title="Ask ARNAOUT STORE on WhatsApp"
              >
                <WhatsApp3DIcon size={18} />
              </button>
            )}

            {/* Clear All */}
            {compareList.length > 0 && (
              <button
                type="button"
                onClick={clearCompareList}
                className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors cursor-pointer"
                title={isArabic ? 'مسح الكل' : 'Clear all'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(false)}
              className="p-2 rounded-xl bg-white dark:bg-[#111A2E] hover:bg-slate-100 dark:hover:bg-[#1A253C] text-slate-500 hover:text-slate-800 dark:hover:text-white border border-[#DCE5F0] dark:border-[#1E293B] transition-colors cursor-pointer"
              aria-label="Close compare modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. BODY CONTENT (SIDE-BY-SIDE MATRIX OR EMPTY STATE)
        ========================================================================== */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 space-y-6">
          {compareList.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-center text-[#64748B]">
                <Scale className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#172033] dark:text-white">
                  {isArabic ? 'قائمة المقارنة فارغة' : 'No Devices Selected For Comparison'}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-sm mx-auto">
                  {isArabic
                    ? 'اختر حتى 3 هواتف ذكية أو أجهزة لابتوب من صفحة المنتجات لمقارنة المواصفات والأسعار جنباً إلى جنب.'
                    : 'Select up to 3 smartphones or laptops from the products page to view their full technical specifications side-by-side.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCompareModalOpen(false);
                  setCurrentView('products');
                }}
                className="px-6 py-3 rounded-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-md shadow-[#007AFF]/25 transition-all cursor-pointer"
              >
                {isArabic ? 'تصفح كافة المنتجات' : 'Browse All Products'}
              </button>
            </div>
          ) : (
            /* Full Comparison Matrix */
            <div className="min-w-[680px]">
              {/* Product Cards Row */}
              <div className="grid grid-cols-4 gap-4 pb-6 border-b border-[#DCE5F0] dark:border-[#1E293B] sticky top-0 bg-white/95 dark:bg-[#0A0F1D]/95 backdrop-blur-md z-10 pt-1">
                {/* Column 0: Label Column Placeholder */}
                <div className="flex flex-col justify-end p-3">
                  <span className="text-xs font-black text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                    {isArabic ? 'الأجهزة المقارنة' : 'Compared Devices'}
                  </span>
                  <span className="text-[11px] text-[#007AFF] font-bold">
                    {compareList.length} {isArabic ? 'من أصل 3' : 'of 3 slots used'}
                  </span>
                </div>

                {/* Product Columns (up to 3) */}
                {compareList.map((product) => (
                  <div
                    key={product.id}
                    className="relative p-4 rounded-3xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] flex flex-col justify-between space-y-3 group"
                  >
                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeFromCompare(product.id)}
                      className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 p-1 rounded-full bg-white dark:bg-[#1A253C] hover:bg-rose-600 hover:text-white text-slate-400 transition-colors shadow-xs cursor-pointer z-10"
                      title={isArabic ? 'إزالة من المقارنة' : 'Remove from compare'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      {/* Product Thumbnail */}
                      <div className="w-full h-32 rounded-2xl bg-white dark:bg-[#070C16] border border-[#DCE5F0]/80 dark:border-[#1E293B] p-2 flex items-center justify-center mb-2">
                        <LazyImage
                          src={product.images[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=300'}
                          alt={product.name}
                          width={200}
                          height={120}
                          priority={true}
                          wrapperClassName="w-full h-full flex items-center justify-center"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Brand & Title */}
                      <span className="text-[10px] font-extrabold text-[#007AFF] uppercase tracking-wider block">
                        {product.brand}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-[#172033] dark:text-white line-clamp-2 leading-snug">
                        {isArabic ? product.nameAr || product.name : product.name}
                      </h4>

                      {/* Price & Rating */}
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-base sm:text-lg font-black text-[#007AFF] dark:text-[#38BDF8]">
                          ${product.price}
                        </span>
                        {product.originalPrice > product.price && (
                          <span className="text-xs line-through text-slate-400">
                            ${product.originalPrice}
                          </span>
                        )}
                      </div>

                      {/* Stock Status */}
                      <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            product.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className={product.stock > 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                          {product.stock > 0
                            ? isArabic
                              ? `متوفر (${product.stock} قطع)`
                              : `In Stock (${product.stock})`
                            : isArabic
                            ? 'غير متوفر'
                            : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Purchase CTAs */}
                    <div className="space-y-1.5 pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B]">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock <= 0}
                        className="w-full py-2 px-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'إضافة للسلة' : 'Add to Cart'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleWhatsAppOrder(product)}
                        className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <WhatsApp3DIcon size={14} />
                        <span>{isArabic ? 'شراء عبر واتساب' : 'WhatsApp Buy'}</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty Slot Placeholder if fewer than 3 products */}
                {compareList.length < MAX_COMPARE_LIMIT && (
                  <div className="relative p-4 rounded-3xl border-2 border-dashed border-[#DCE5F0] dark:border-[#1E293B] bg-[#F8FAFC]/50 dark:bg-[#0E1726]/30 flex flex-col items-center justify-center text-center space-y-3 min-h-[260px]">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-center text-[#007AFF] shadow-xs">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#172033] dark:text-white">
                        {isArabic ? 'إضافة جهاز آخر' : 'Add Another Device'}
                      </h4>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                        {isArabic
                          ? 'قارن حتى 3 أجهزة جنباً إلى جنب'
                          : 'Compare up to 3 models simultaneously'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddSelector(!showAddSelector)}
                      className="px-4 py-2 rounded-xl bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF] hover:text-white dark:text-[#38BDF8] font-bold text-xs border border-[#007AFF]/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{isArabic ? 'اختر جهازاً' : 'Select Product'}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown selector for candidate products */}
                    {showAddSelector && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-30 p-2 rounded-2xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-2xl space-y-1.5 text-left rtl:text-right max-h-60 overflow-y-auto">
                        <input
                          type="text"
                          placeholder={isArabic ? 'ابحث عن هاتف أو لابتوب...' : 'Search phone or laptop...'}
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] text-xs border border-[#DCE5F0] dark:border-[#1E293B] focus:outline-none focus:border-[#007AFF]"
                          autoFocus
                        />
                        {candidateProducts.map((cand) => (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => {
                              addToCompare(cand);
                              setShowAddSelector(false);
                              setSearchFilter('');
                            }}
                            className="w-full p-2 rounded-xl hover:bg-[#F5F8FC] dark:hover:bg-[#1A253C] flex items-center gap-2 text-left rtl:text-right transition-colors cursor-pointer"
                          >
                            <LazyImage
                              src={cand.images[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=80'}
                              alt={cand.name}
                              width={32}
                              height={32}
                              priority={false}
                              wrapperClassName="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white"
                              className="w-full h-full object-contain"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold truncate block text-[#172033] dark:text-white">
                                {isArabic ? cand.nameAr || cand.name : cand.name}
                              </span>
                              <span className="text-[10px] text-[#007AFF] font-bold">
                                ${cand.price} USD
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Technical Specifications Comparison Table */}
              <div className="mt-6 space-y-2">
                <div className="text-xs font-black text-[#172033] dark:text-white uppercase tracking-wider px-3 py-2 bg-[#F5F8FC] dark:bg-[#111A2E] rounded-xl flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#007AFF]" />
                  <span>{isArabic ? 'جدول المواصفات التفصيلية' : 'Full Technical Specifications Matrix'}</span>
                </div>

                {/* Built-in Base Properties */}
                <div className="grid grid-cols-4 gap-4 p-3 rounded-2xl bg-white dark:bg-[#0A0F1D] border border-[#DCE5F0]/60 dark:border-[#1E293B]/60 text-xs">
                  <span className="font-bold text-[#64748B] dark:text-slate-400">
                    {isArabic ? 'الفئة والتصنيف' : 'Category / Classification'}
                  </span>
                  {compareList.map((p) => (
                    <span key={p.id} className="font-semibold text-[#172033] dark:text-white">
                      {p.category} {p.subcategory ? `• ${p.subcategory}` : ''}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-4 p-3 rounded-2xl bg-white dark:bg-[#0A0F1D] border border-[#DCE5F0]/60 dark:border-[#1E293B]/60 text-xs">
                  <span className="font-bold text-[#64748B] dark:text-slate-400">
                    {isArabic ? 'الكفالة المعتمدة' : 'Official Warranty'}
                  </span>
                  {compareList.map((p) => (
                    <span key={p.id} className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {p.warrantyMonths || 12} {isArabic ? 'شهراً في صيدا' : 'Months (Saida Showroom)'}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-4 p-3 rounded-2xl bg-white dark:bg-[#0A0F1D] border border-[#DCE5F0]/60 dark:border-[#1E293B]/60 text-xs">
                  <span className="font-bold text-[#64748B] dark:text-slate-400">
                    {isArabic ? 'الألوان المتوفرة' : 'Color Options'}
                  </span>
                  {compareList.map((p) => (
                    <span key={p.id} className="font-semibold text-[#172033] dark:text-white">
                      {p.colors && p.colors.length > 0 ? p.colors.join(', ') : 'Standard'}
                    </span>
                  ))}
                </div>

                {/* Dynamic Product Specification Rows */}
                {specLabels.map((label) => {
                  const values = compareList.map((p) => getProductSpecValue(p, label));
                  const isDiffering =
                    values.some((v) => v !== values[0] && v !== '—') && values.length > 1;

                  return (
                    <div
                      key={label}
                      className={`grid grid-cols-4 gap-4 p-3 rounded-2xl text-xs transition-colors border ${
                        highlightDifferences && isDiffering
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-white dark:bg-[#0A0F1D] border-[#DCE5F0]/60 dark:border-[#1E293B]/60'
                      }`}
                    >
                      <span className="font-bold text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                        {highlightDifferences && isDiffering && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                        <span>{label}</span>
                      </span>

                      {compareList.map((p) => (
                        <span
                          key={p.id}
                          className={`font-semibold leading-relaxed ${
                            highlightDifferences && isDiffering
                              ? 'text-purple-700 dark:text-purple-300 font-bold'
                              : 'text-[#172033] dark:text-white'
                          }`}
                        >
                          {getProductSpecValue(p, label)}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            3. FOOTER ACTIONS
        ========================================================================== */}
        <div className="p-4 sm:p-5 border-t border-[#DCE5F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#070C16] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#64748B] dark:text-slate-400">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>
              {isArabic
                ? 'كافة الأسعار بالدولار النقدي مع كفالة رسمية من فرعنا بصيدا'
                : 'All prices are in Cash USD with official warranty coverage at ARNAOUT STORE'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-white hover:bg-slate-100 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isArabic ? 'طباعة المقارنة' : 'Print Specs'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCompareModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold transition-all cursor-pointer shadow-xs"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
