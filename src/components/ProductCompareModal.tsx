import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import {
  X,
  Scale,
  ArrowLeftRight,
  Search,
  ChevronDown,
  ShoppingBag,
  Check,
  Package,
  Printer,
  Layers,
  Sparkles,
  DollarSign,
  SlidersHorizontal,
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { LazyImage } from './LazyImage';
import { openExternalUrl } from '../utils/navigation';
import {
  buildComparisonFeatureRows,
  buildComparisonSpecRows,
  computePriceComparison,
  extractProductFeatureHighlights,
} from '../utils/compareHelpers';
import { Product } from '../types';

export const ProductCompareModal: React.FC = () => {
  const {
    lang,
    compareList,
    removeFromCompare,
    clearCompareList,
    selectCompareSlot,
    swapComparePair,
    setComparePair,
    isCompareModalOpen,
    setIsCompareModalOpen,
    addToCart,
    products,
    storeSettings,
    viewProductDetail,
  } = useShop();

  const isArabic = lang === 'ar';
  const [activePickerSlot, setActivePickerSlot] = useState<0 | 1 | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState<string>('all');
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [highlightDifferences, setHighlightDifferences] = useState(true);
  const [addedToCartId, setAddedToCartId] = useState<string | null>(null);

  const publishedProducts = useMemo(
    () => products.filter((p) => p.isPublished !== false),
    [products]
  );

  const slotA: Product | null = compareList[0] ?? null;
  const slotB: Product | null = compareList[1] ?? null;
  const activePair = useMemo(
    () => [slotA, slotB].filter((p): p is Product => Boolean(p)),
    [slotA, slotB]
  );

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    publishedProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [publishedProducts]);

  // Quick popular comparison presets from actual published catalog products
  const quickPairs = useMemo(() => {
    const pairs: { label: string; items: [Product, Product] }[] = [];
    const byCategory = new Map<string, Product[]>();
    publishedProducts.forEach((p) => {
      const list = byCategory.get(p.category) || [];
      list.push(p);
      byCategory.set(p.category, list);
    });

    const formatShortTitle = (p: Product) => {
      const words = p.name.trim().split(/\s+/).slice(0, 4).join(' ');
      if (words.toLowerCase().startsWith(p.brand.toLowerCase())) {
        return words;
      }
      return `${p.brand} ${words}`;
    };

    for (const [, list] of byCategory) {
      if (list.length >= 2 && pairs.length < 3) {
        const a = list[0];
        const b = list[1];
        pairs.push({
          label: `${formatShortTitle(a)} vs ${formatShortTitle(b)}`,
          items: [a, b],
        });
      }
    }
    return pairs;
  }, [publishedProducts]);

  // Close on Escape
  useEffect(() => {
    if (!isCompareModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePickerSlot !== null) {
          setActivePickerSlot(null);
          return;
        }
        setIsCompareModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompareModalOpen, activePickerSlot, setIsCompareModalOpen]);

  // Reset transient picker state when modal closes
  useEffect(() => {
    if (!isCompareModalOpen) {
      setActivePickerSlot(null);
      setPickerSearch('');
      setPickerCategory('all');
    }
  }, [isCompareModalOpen]);

  const pickerCandidates = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return publishedProducts.filter((p) => {
      if (pickerCategory !== 'all' && p.category !== pickerCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    });
  }, [publishedProducts, pickerCategory, pickerSearch]);

  if (!isCompareModalOpen) return null;

  const bothSelected = Boolean(slotA && slotB);
  const priceComparison = slotA && slotB ? computePriceComparison(slotA, slotB) : null;
  const featureRows =
    activePair.length > 0 ? buildComparisonFeatureRows(activePair, lang) : [];
  const visibleFeatureRows = differencesOnly
    ? featureRows.filter((row) => row.isDifferent)
    : featureRows;
  const specRows =
    activePair.length > 0 ? buildComparisonSpecRows(activePair, differencesOnly) : [];
  const highlightsA = slotA ? extractProductFeatureHighlights(slotA, lang) : [];
  const highlightsB = slotB ? extractProductFeatureHighlights(slotB, lang) : [];

  const handleOpenPicker = (slotIndex: 0 | 1) => {
    if (activePickerSlot === slotIndex) {
      setActivePickerSlot(null);
    } else {
      setActivePickerSlot(slotIndex);
      setPickerSearch('');
    }
  };

  const handlePickProduct = (slotIndex: 0 | 1, product: Product) => {
    selectCompareSlot(slotIndex, product);
    setActivePickerSlot(null);
    setPickerSearch('');
  };

  const handleAddToCartClick = (product: Product) => {
    if (product.stock <= 0) return;
    addToCart(product, 1);
    setAddedToCartId(product.id);
    window.setTimeout(() => setAddedToCartId(null), 1200);
  };

  const handleShareComparison = () => {
    if (!slotA || !slotB) return;
    const phone = storeSettings.whatsapp || '96170773067';
    const text = encodeURIComponent(
      isArabic
        ? `مرحباً متجر ON ALAA! أقارن بين جهازين:\n1) ${slotA.nameAr || slotA.name} ($${slotA.price})\n2) ${slotB.nameAr || slotB.name} ($${slotB.price})\nأيهما تنصحونني به؟`
        : `Hello ON ALAA STORE! I am comparing:\n1) ${slotA.name} ($${slotA.price} USD)\n2) ${slotB.name} ($${slotB.price} USD)\nWhich one would you recommend?`
    );
    openExternalUrl(`https://wa.me/${phone}?text=${text}`);
  };

  const renderSlotCard = (product: Product | null, slotIndex: 0 | 1) => {
    const isPickerOpen = activePickerSlot === slotIndex;
    const slotLabel =
      slotIndex === 0
        ? isArabic
          ? 'المنتج ١'
          : 'Item 1'
        : isArabic
        ? 'المنتج ٢'
        : 'Item 2';

    const otherProduct = slotIndex === 0 ? slotB : slotA;

    const isLowerPrice =
      priceComparison &&
      product &&
      priceComparison.cheaperProductId === product.id;

    return (
      <div
        data-testid={`compare-slot-${slotIndex}`}
        className="relative min-w-0 flex flex-col justify-between rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0E1726] p-2.5 sm:p-3.5 transition-colors"
      >
        {/* Top Slot Bar */}
        <div className="flex items-center justify-between gap-1.5 pb-2 mb-2.5 border-b border-[#DCE5F0]/80 dark:border-[#1E293B] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 whitespace-nowrap shrink-0">
            {slotLabel}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid={`compare-slot-${slotIndex}-picker-btn`}
              onClick={() => handleOpenPicker(slotIndex)}
              className="px-2 py-1 rounded-lg bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#007AFF] dark:text-[#38BDF8] text-[10px] sm:text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <span>
                {product
                  ? isArabic
                    ? 'تغيير'
                    : 'Change'
                  : isArabic
                  ? 'اختر'
                  : 'Select'}
              </span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {product && (
              <button
                type="button"
                data-testid={`compare-slot-${slotIndex}-remove`}
                onClick={() => removeFromCompare(product.id)}
                aria-label={
                  isArabic ? `إزالة ${product.name} من المقارنة` : `Remove ${product.name} from comparison`
                }
                title={isArabic ? 'إزالة' : 'Remove'}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Inline Searchable Product Selector Drawer inside Slot */}
        {isPickerOpen && (
          <div
            data-testid={`compare-slot-${slotIndex}-picker`}
            className="mb-3 rounded-xl bg-white dark:bg-[#0A0F1D] border border-[#007AFF]/40 shadow-lg p-2.5 space-y-2 z-20"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-2.5" />
              <input
                type="text"
                data-testid={`compare-slot-${slotIndex}-search`}
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder={
                  isArabic
                    ? 'ابحث بالاسم أو الماركة أو الفئة...'
                    : 'Search name, brand, category...'
                }
                className="w-full pl-8 pr-2.5 rtl:pl-2.5 rtl:pr-8 py-1.5 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF]"
                autoFocus
              />
            </div>

            {availableCategories.length > 1 && (
              <select
                value={pickerCategory}
                onChange={(e) => setPickerCategory(e.target.value)}
                aria-label={isArabic ? 'تصفية حسب الفئة' : 'Filter picker by category'}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[11px] font-medium text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#007AFF] cursor-pointer"
              >
                <option value="all">{isArabic ? 'جميع الفئات' : 'All Categories'}</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            <div className="max-h-52 overflow-y-auto divide-y divide-[#DCE5F0]/60 dark:divide-[#1E293B]">
              {pickerCandidates.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-[#64748B] dark:text-slate-400">
                  {isArabic ? 'لا توجد منتجات مطابقة' : 'No matching products found'}
                </div>
              ) : (
                pickerCandidates.slice(0, 16).map((cand) => {
                  const isCurrent = product?.id === cand.id;
                  const isInOpposite = otherProduct?.id === cand.id;
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      data-testid={`compare-pick-${slotIndex}-${cand.id}`}
                      onClick={() => handlePickProduct(slotIndex, cand)}
                      className={`w-full py-2 px-2 flex items-center gap-2.5 text-left rtl:text-right hover:bg-[#EAF3FF]/60 dark:hover:bg-[#111A2E] transition-colors cursor-pointer ${
                        isCurrent ? 'bg-[#EAF3FF]/80 dark:bg-[#111A2E]' : ''
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        {cand.images?.[0] ? (
                          <LazyImage
                            src={cand.images[0]}
                            alt={cand.name}
                            priority={false}
                            wrapperClassName="w-full h-full flex items-center justify-center"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-[#64748B]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#172033] dark:text-white truncate">
                          {isArabic ? cand.nameAr || cand.name : cand.name}
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 truncate">
                          <span>{cand.brand}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-bold text-[#007AFF] dark:text-[#38BDF8] tabular-nums">
                            ${cand.price} USD
                          </span>
                          {isInOpposite && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                {isArabic ? 'سيتم التبديل' : 'Swap slot'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Empty Slot Prompt vs Selected Product Preview */}
        {!product ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-2 space-y-3 min-h-[210px]">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-center text-[#007AFF]">
              <Scale className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-[#172033] dark:text-white">
                {slotIndex === 0
                  ? isArabic
                    ? 'اختر المنتج الأول'
                    : 'Choose First Product'
                  : isArabic
                  ? 'اختر المنتج الثاني'
                  : 'Choose Second Product'}
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                {isArabic
                  ? 'انقر على "اختر منتجاً" للمقارنة الفورية'
                  : 'Pick any item from the store catalog to compare'}
              </p>
            </div>
            {!isPickerOpen && (
              <button
                type="button"
                onClick={() => handleOpenPicker(slotIndex)}
                className="px-4 py-2 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isArabic ? 'اختيار من الكتالوج' : 'Browse Catalog'}
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between space-y-2">
            <div className="space-y-2">
              {/* Product Image Frame with Fallback */}
              <button
                type="button"
                onClick={() => {
                  setIsCompareModalOpen(false);
                  viewProductDetail(product.id, false);
                }}
                className="w-full h-24 sm:h-28 rounded-xl bg-white dark:bg-[#070C16] border border-[#DCE5F0]/80 dark:border-[#1E293B] p-2 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#007AFF]/50 transition-colors"
              >
                {product.images?.[0] ? (
                  <LazyImage
                    src={product.images[0]}
                    alt={isArabic ? product.nameAr || product.name : product.name}
                    priority={true}
                    wrapperClassName="w-full h-full flex items-center justify-center"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-[#64748B]">
                    <Package className="w-7 h-7 opacity-60" />
                    <span className="text-[11px] font-semibold">{product.brand}</span>
                  </div>
                )}
              </button>

              {/* Unboxed Metadata: Brand · Category */}
              <div className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span className="text-[#007AFF] dark:text-[#38BDF8] font-bold">{product.brand}</span>
                <span aria-hidden="true">·</span>
                <span>{product.category}</span>
              </div>

              {/* Title */}
              <h3 className="text-xs sm:text-sm font-bold text-[#172033] dark:text-white line-clamp-2 leading-snug min-h-[2.4rem]">
                {isArabic ? product.nameAr || product.name : product.name}
              </h3>

              {/* Pricing Row (Tabular Numerals) */}
              <div className="space-y-0.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-base sm:text-xl font-black text-[#172033] dark:text-white font-mono tabular-nums">
                    ${product.price.toLocaleString()}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-xs line-through text-[#64748B] dark:text-slate-400 font-mono tabular-nums">
                      ${product.originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>
                {isLowerPrice && priceComparison && priceComparison.absoluteDifferenceUsd > 0 && (
                  <div className="text-[11px] font-bold text-[#16A34A] dark:text-emerald-400 tabular-nums">
                    {isArabic
                      ? `أوفر بـ $${priceComparison.absoluteDifferenceUsd.toLocaleString()}`
                      : `$${priceComparison.absoluteDifferenceUsd.toLocaleString()} lower price`}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2.5 border-t border-[#DCE5F0]/80 dark:border-[#1E293B] flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddToCartClick(product)}
                disabled={product.stock <= 0}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  addedToCartId === product.id
                    ? 'bg-[#16A34A] text-white'
                    : 'bg-[#007AFF] hover:bg-[#0066D6] text-white'
                }`}
              >
                {addedToCartId === product.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span className="truncate">{isArabic ? 'تمت الإضافة' : 'Added'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {product.stock <= 0
                        ? isArabic
                          ? 'نفذت الكمية'
                          : 'Out of Stock'
                        : isArabic
                        ? 'أضف للسلة'
                        : 'Add to Cart'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="product-compare-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsCompareModalOpen(false);
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#0A0F1D] border border-[#DCE5F0] dark:border-[#1E293B] shadow-2xl overflow-hidden text-[#172033] dark:text-[#F8FAFC]"
      >
        {/* 1. Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between gap-3 bg-[#F8FAFC] dark:bg-[#070C16] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#007AFF] text-white flex items-center justify-center shrink-0">
              <Scale className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2
                id="compare-modal-title"
                className="text-sm sm:text-lg font-extrabold text-[#172033] dark:text-white truncate"
              >
                {isArabic ? 'مقارنة المنتجات جنباً إلى جنب' : 'Side-by-Side Product Comparison'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 truncate">
                {isArabic
                  ? 'اختر منتجين لمقارنة المواصفات والمزايا وفروقات الأسعار'
                  : 'Select two products to compare specifications, features, and price differences'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {bothSelected && (
              <button
                type="button"
                data-testid="compare-swap-button"
                onClick={swapComparePair}
                title={isArabic ? 'تبديل موضع المنتجين' : 'Swap Product 1 and Product 2'}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-xs font-bold text-[#172033] dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#007AFF]" />
                <span className="hidden sm:inline">{isArabic ? 'تبديل' : 'Swap'}</span>
              </button>
            )}

            {bothSelected && (
              <button
                type="button"
                onClick={handleShareComparison}
                aria-label={isArabic ? 'استشارة عبر واتساب' : 'Ask on WhatsApp'}
                title={isArabic ? 'استشارة عبر واتساب' : 'Ask on WhatsApp'}
                className="hidden sm:inline-flex p-2 rounded-lg bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-emerald-500 transition-colors cursor-pointer"
              >
                <WhatsApp3DIcon size={16} />
              </button>
            )}

            {activePair.length > 0 && (
              <button
                type="button"
                data-testid="compare-clear-button"
                onClick={() => {
                  clearCompareList();
                  setActivePickerSlot(null);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isArabic ? 'مسح' : 'Clear'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCompareModalOpen(false)}
              aria-label="Close compare modal"
              className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-[#111A2E] hover:bg-slate-100 dark:hover:bg-[#1A253C] text-[#64748B] hover:text-[#172033] dark:hover:text-white border border-[#DCE5F0] dark:border-[#1E293B] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-5">
          {/* Quick Suggested Pairs when selecting initial products */}
          {!bothSelected && quickPairs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#64748B] dark:text-slate-400 font-semibold">
                {isArabic ? 'مقارنات سريعة:' : 'Quick pairs:'}
              </span>
              {quickPairs.map((pair, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-testid={`compare-quick-pair-${idx}`}
                  onClick={() => {
                    setComparePair(pair.items);
                    setActivePickerSlot(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-slate-200 font-medium text-[11px] transition-colors cursor-pointer"
                >
                  {pair.label}
                </button>
              ))}
            </div>
          )}

          {/* Side-by-Side Product Selector & Header Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {renderSlotCard(slotA, 0)}
            {renderSlotCard(slotB, 1)}
          </div>

          {/* 3. Price Difference Summary Banner (when 2 products selected) */}
          {slotA && slotB && priceComparison && (
            <section
              data-testid="compare-price-difference"
              aria-label={isArabic ? 'ملخص فرق السعر' : 'Price Difference Summary'}
              className="rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC] dark:bg-[#0E1726] p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#DCE5F0] dark:border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#007AFF] shrink-0" />
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#172033] dark:text-white">
                    {isArabic ? 'تحليل فرق السعر والقيمة' : 'Price & Value Difference'}
                  </h3>
                </div>

                <div className="text-xs sm:text-sm font-black font-mono tabular-nums text-[#007AFF] dark:text-[#38BDF8]">
                  {priceComparison.absoluteDifferenceUsd === 0 ? (
                    <span>{isArabic ? 'نفس السعر ($0 فرق)' : 'Identical Cash Price ($0.00 difference)'}</span>
                  ) : (
                    <span>
                      {isArabic
                        ? `فرق السعر: $${priceComparison.absoluteDifferenceUsd.toLocaleString()} USD (${priceComparison.percentDifferenceFromHigher}%)`
                        : `Price Difference: $${priceComparison.absoluteDifferenceUsd.toLocaleString()} USD (${priceComparison.percentDifferenceFromHigher}% less)`}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block text-[11px]">
                    {isArabic ? 'الخيار الأقل سعراً' : 'Lower Cash Price'}
                  </span>
                  <span className="font-bold text-[#172033] dark:text-white">
                    {priceComparison.cheaperProductId === 'tie'
                      ? isArabic
                        ? 'متساويان في السعر'
                        : 'Equal price'
                      : priceComparison.cheaperProductId === slotA.id
                      ? `${isArabic ? slotA.nameAr || slotA.name : slotA.name}`
                      : `${isArabic ? slotB.nameAr || slotB.name : slotB.name}`}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block text-[11px]">
                    {isArabic ? 'أعلى نسبة خصم' : 'Best Active Discount'}
                  </span>
                  <span className="font-bold text-[#172033] dark:text-white tabular-nums">
                    {priceComparison.higherDiscountProductId === 'tie'
                      ? priceComparison.discountPctA > 0
                        ? `${priceComparison.discountPctA}% ${isArabic ? 'لكليهما' : 'both models'}`
                        : isArabic
                        ? 'بدون خصم إضافي'
                        : 'No active discount'
                      : priceComparison.higherDiscountProductId === slotA.id
                      ? `${slotA.brand} (${priceComparison.discountPctA}% off · save $${priceComparison.savingsA})`
                      : `${slotB.brand} (${priceComparison.discountPctB}% off · save $${priceComparison.savingsB})`}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block text-[11px]">
                    {isArabic ? 'أفضلية الكفالة والتقييم' : 'Warranty & Rating Edge'}
                  </span>
                  <span className="font-bold text-[#172033] dark:text-white">
                    {priceComparison.longerWarrantyProductId !== 'tie'
                      ? priceComparison.longerWarrantyProductId === slotA.id
                        ? `${slotA.brand} (${slotA.warrantyMonths} mo. warranty)`
                        : `${slotB.brand} (${slotB.warrantyMonths} mo. warranty)`
                      : priceComparison.higherRatedProductId === slotA.id
                      ? `${slotA.brand} (${slotA.rating.toFixed(1)}★ rated)`
                      : priceComparison.higherRatedProductId === slotB.id
                      ? `${slotB.brand} (${slotB.rating.toFixed(1)}★ rated)`
                      : isArabic
                      ? `متساويان (${slotA.warrantyMonths || 12} شهراً)`
                      : `Matched (${slotA.warrantyMonths || 12} mo. warranty)`}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* 4. Filter Controls (All vs Differences Only + Highlight) */}
          {bothSelected && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B]">
                <button
                  type="button"
                  data-testid="compare-filter-all"
                  onClick={() => setDifferencesOnly(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    !differencesOnly
                      ? 'bg-white dark:bg-[#0A0F1D] text-[#172033] dark:text-white shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033]'
                  }`}
                >
                  {isArabic ? 'جميع المواصفات' : 'All Specifications'}
                </button>
                <button
                  type="button"
                  data-testid="compare-filter-differences"
                  onClick={() => setDifferencesOnly(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    differencesOnly
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033]'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{isArabic ? 'الفروقات فقط' : 'Differences Only'}</span>
                </button>
              </div>

              <button
                type="button"
                data-testid="compare-highlight-toggle"
                onClick={() => setHighlightDifferences((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  highlightDifferences
                    ? 'bg-[#EAF3FF] dark:bg-[#007AFF]/15 border-[#007AFF]/40 text-[#007AFF] dark:text-[#38BDF8]'
                    : 'bg-white dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#64748B]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تمييز الفروقات' : 'Highlight Differences'}</span>
              </button>
            </div>
          )}

          {/* 5. Side-by-Side Pricing, Features & Technical Specifications */}
          {activePair.length > 0 && (
            <div className="space-y-5">
              {/* Section A: Price Breakdown Rows */}
              {slotA && slotB && priceComparison && (
                <div className="rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#F5F8FC] dark:bg-[#111A2E] border-b border-[#DCE5F0] dark:border-[#1E293B] text-xs font-extrabold text-[#172033] dark:text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#007AFF]" />
                    <span>{isArabic ? 'مقارنة الأسعار والتوفير' : 'Pricing & Savings Breakdown'}</span>
                  </div>

                  <div className="divide-y divide-[#DCE5F0]/70 dark:divide-[#1E293B] text-xs">
                    <div className="p-3 sm:px-4">
                      <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 mb-1.5">
                        {isArabic ? 'السعر النقدي (USD)' : 'Selling Cash Price (USD)'}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-5 font-mono tabular-nums font-bold">
                        <div className="text-[#172033] dark:text-white">
                          ${priceComparison.priceA.toLocaleString()}
                          {priceComparison.signedDifferenceAtoB !== 0 && (
                            <span
                              className={`ml-2 rtl:ml-0 rtl:mr-2 text-[11px] ${
                                priceComparison.signedDifferenceAtoB < 0
                                  ? 'text-[#16A34A]'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              ({priceComparison.signedDifferenceAtoB < 0 ? '-' : '+'}$
                              {Math.abs(priceComparison.signedDifferenceAtoB).toLocaleString()})
                            </span>
                          )}
                        </div>
                        <div className="text-[#172033] dark:text-white">
                          ${priceComparison.priceB.toLocaleString()}
                          {priceComparison.signedDifferenceAtoB !== 0 && (
                            <span
                              className={`ml-2 rtl:ml-0 rtl:mr-2 text-[11px] ${
                                priceComparison.signedDifferenceAtoB > 0
                                  ? 'text-[#16A34A]'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              ({priceComparison.signedDifferenceAtoB > 0 ? '-' : '+'}$
                              {Math.abs(priceComparison.signedDifferenceAtoB).toLocaleString()})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 sm:px-4">
                      <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 mb-1.5">
                        {isArabic ? 'السعر الأصلي / التوفير' : 'Original Price & Discount'}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-5 font-mono tabular-nums">
                        <div className="text-[#172033] dark:text-slate-200">
                          ${priceComparison.originalPriceA.toLocaleString()}
                          {priceComparison.savingsA > 0
                            ? ` · Save $${priceComparison.savingsA} (${priceComparison.discountPctA}%)`
                            : ' · Standard'}
                        </div>
                        <div className="text-[#172033] dark:text-slate-200">
                          ${priceComparison.originalPriceB.toLocaleString()}
                          {priceComparison.savingsB > 0
                            ? ` · Save $${priceComparison.savingsB} (${priceComparison.discountPctB}%)`
                            : ' · Standard'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section B: Features & Highlights */}
              <div className="rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#F5F8FC] dark:bg-[#111A2E] border-b border-[#DCE5F0] dark:border-[#1E293B] text-xs font-extrabold text-[#172033] dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#007AFF]" />
                  <span>{isArabic ? 'المزايا والخصائص الرئيسية' : 'Features & Ownership Highlights'}</span>
                </div>

                <div className="divide-y divide-[#DCE5F0]/70 dark:divide-[#1E293B] text-xs">
                  {visibleFeatureRows.map((row) => {
                    const shouldHighlight = highlightDifferences && bothSelected && row.isDifferent;
                    return (
                      <div
                        key={row.key}
                        className={`p-3 sm:px-4 transition-colors ${
                          shouldHighlight ? 'bg-[#EAF3FF]/45 dark:bg-[#007AFF]/10' : ''
                        }`}
                      >
                        <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 mb-1.5">
                          {row.label}
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-5">
                          <div
                            className={`font-medium leading-relaxed ${
                              shouldHighlight
                                ? 'text-[#0051B3] dark:text-[#7DD3FC] font-semibold'
                                : 'text-[#172033] dark:text-slate-200'
                            }`}
                          >
                            {slotA ? row.values[0] : '—'}
                          </div>
                          <div
                            className={`font-medium leading-relaxed ${
                              shouldHighlight
                                ? 'text-[#0051B3] dark:text-[#7DD3FC] font-semibold'
                                : 'text-[#172033] dark:text-slate-200'
                            }`}
                          >
                            {slotB ? row.values[slotA ? 1 : 0] : '—'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Key Feature Highlights (Descriptions) */}
                  {(highlightsA.length > 0 || highlightsB.length > 0) && (
                    <div className="p-3 sm:px-4">
                      <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 mb-2">
                        {isArabic ? 'أبرز نقاط القوة والمميزات' : 'Key Product Features'}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-5">
                        <ul className="space-y-1.5 text-xs text-[#172033] dark:text-slate-200">
                          {highlightsA.length > 0 ? (
                            highlightsA.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-[#007AFF] font-bold mt-0.5">•</span>
                                <span>{item}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-[#64748B]">—</li>
                          )}
                        </ul>
                        <ul className="space-y-1.5 text-xs text-[#172033] dark:text-slate-200">
                          {highlightsB.length > 0 ? (
                            highlightsB.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-[#007AFF] font-bold mt-0.5">•</span>
                                <span>{item}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-[#64748B]">—</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section C: Technical Specifications */}
              <div
                data-testid="compare-specs-section"
                className="rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-[#F5F8FC] dark:bg-[#111A2E] border-b border-[#DCE5F0] dark:border-[#1E293B] text-xs font-extrabold text-[#172033] dark:text-white flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#007AFF]" />
                    <span>{isArabic ? 'جدول المواصفات التقنية' : 'Technical Specifications'}</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 tabular-nums">
                    {specRows.length} {isArabic ? 'بند' : 'specs'}
                  </span>
                </div>

                {specRows.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B] dark:text-slate-400">
                    {differencesOnly
                      ? isArabic
                        ? 'لا توجد فروقات تقنية مسجلة بين هذين المنتجين.'
                        : 'No differing technical specifications between these two products.'
                      : isArabic
                      ? 'لا تتوفر مواصفات إضافية مسجلة حالياً.'
                      : 'No technical specifications listed for this selection.'}
                  </div>
                ) : (
                  <div className="divide-y divide-[#DCE5F0]/70 dark:divide-[#1E293B] text-xs">
                    {specRows.map((row) => {
                      const shouldHighlight = highlightDifferences && bothSelected && row.isDifferent;
                      const valA = slotA ? row.values[0] : '—';
                      const valB = slotB ? row.values[slotA ? 1 : 0] : '—';
                      return (
                        <div
                          key={row.key}
                          className={`p-3 sm:px-4 transition-colors ${
                            shouldHighlight ? 'bg-[#EAF3FF]/45 dark:bg-[#007AFF]/10' : ''
                          }`}
                        >
                          <div className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 mb-1.5">
                            {row.label}
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-5">
                            <div
                              className={`leading-relaxed ${
                                shouldHighlight
                                  ? 'text-[#0051B3] dark:text-[#7DD3FC] font-bold'
                                  : 'text-[#172033] dark:text-slate-200 font-medium'
                              }`}
                            >
                              {valA}
                            </div>
                            <div
                              className={`leading-relaxed ${
                                shouldHighlight
                                  ? 'text-[#0051B3] dark:text-[#7DD3FC] font-bold'
                                  : 'text-[#172033] dark:text-slate-200 font-medium'
                              }`}
                            >
                              {valB}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 6. Footer */}
        <div className="px-4 py-3 sm:px-6 border-t border-[#DCE5F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#070C16] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-[#64748B] dark:text-slate-400">
            {isArabic
              ? 'الأسعار بالدولار النقدي · كفالة رسمية وتوصيل لجميع لبنان'
              : 'Cash USD pricing · Official warranty & All-Lebanon delivery'}
          </span>

          <div className="flex items-center gap-2">
            {activePair.length > 0 && (
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-white hover:bg-slate-100 dark:hover:bg-[#1A253C] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isArabic ? 'طباعة' : 'Print'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCompareModalOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold transition-colors cursor-pointer"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
