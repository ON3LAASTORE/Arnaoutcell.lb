import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Heart,
  ShoppingBag,
  Sparkles,
  Send,
  X,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  Scale,
  Share2,
} from 'lucide-react';
import { Language, Product, ProductVariant } from '../types';
import { LazyImage } from './LazyImage';
import { NotifyMeControl } from './NotifyMeControl';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import {
  findVariantForColor,
  resolveColorShowcaseImage,
} from '../utils/colorVariantHelpers';
import { resolveFullResolutionImageUrl } from '../utils/imageResolutionHelpers';
import {
  buildCapacityOptions,
  buildLuxuryCarouselImages,
  computeLuxurySubtotal,
  findCarouselIndexForColor,
  formatLuxuryUsdPrice,
  getSidekickQuickPrompts,
  stepCarouselIndex,
} from '../utils/productLuxuryDetailHelpers';

interface ProductLuxuryShowcaseProps {
  product: Product;
  lang: Language;
  mode: 'modal' | 'page';
  whatsappNumber?: string;
  isFavorited: boolean;
  isCompared: boolean;
  onToggleWishlist: () => void;
  onToggleCompare: () => void;
  onAddToCart: (
    product: Product,
    quantity: number,
    selectedColor?: string,
    selectedVariant?: ProductVariant
  ) => void;
  onDirectOrder: (
    product: Product,
    quantity: number,
    selectedColor?: string,
    selectedVariant?: ProductVariant
  ) => void;
  onWhatsAppInquiry: (context: {
    fullTitle: string;
    activePrice: number;
    activeSku: string;
    selectedColor?: string;
    selectedCapacity?: string;
  }) => void;
  onOpenFullPage?: () => void;
  onShare?: () => void;
  shareCopied?: boolean;
}

export const ProductLuxuryShowcase: React.FC<ProductLuxuryShowcaseProps> = ({
  product,
  lang,
  mode,
  isFavorited,
  isCompared,
  onToggleWishlist,
  onToggleCompare,
  onAddToCart,
  onDirectOrder,
  onWhatsAppInquiry,
  onOpenFullPage,
  onShare,
  shareCopied = false,
}) => {
  const initialColor = product.colors?.[0];
  const initialColorImage = resolveColorShowcaseImage(product, initialColor);
  const carouselImages = buildLuxuryCarouselImages(product, initialColorImage);
  const capacityOptions = buildCapacityOptions(product);

  const [carouselIndex, setCarouselIndex] = useState<number>(() =>
    findCarouselIndexForColor(product, carouselImages, initialColor)
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(initialColor);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(() => {
    const colorVariant = initialColor ? findVariantForColor(product, initialColor) : undefined;
    const firstCapVariant = capacityOptions.find((opt) => !opt.isSpecDerived)?.variant;
    return firstCapVariant || colorVariant || product.variants?.[0];
  });
  const [selectedCapacityId, setSelectedCapacityId] = useState<string | undefined>(
    () => capacityOptions[0]?.id
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  // Sidekick Assistant state
  const [isSidekickOpen, setIsSidekickOpen] = useState<boolean>(false);
  const [sidekickInput, setSidekickInput] = useState<string>('');
  const [sidekickLoading, setSidekickLoading] = useState<boolean>(false);
  const [sidekickAnswer, setSidekickAnswer] = useState<string | null>(null);
  const [sidekickError, setSidekickError] = useState<string | null>(null);
  const [sidekickLastQuestion, setSidekickLastQuestion] = useState<string | null>(null);

  // Re-sync when switching products
  useEffect(() => {
    const nextColor = product.colors?.[0];
    const nextColorImg = resolveColorShowcaseImage(product, nextColor);
    const nextImages = buildLuxuryCarouselImages(product, nextColorImg);
    const nextCaps = buildCapacityOptions(product);
    const nextColorVariant = nextColor ? findVariantForColor(product, nextColor) : undefined;
    const nextCapVariant = nextCaps.find((opt) => !opt.isSpecDerived)?.variant;

    setSelectedColor(nextColor);
    setCarouselIndex(findCarouselIndexForColor(product, nextImages, nextColor));
    setSelectedVariant(nextCapVariant || nextColorVariant || product.variants?.[0]);
    setSelectedCapacityId(nextCaps[0]?.id);
    setQuantity(1);
    setJustAdded(false);
    setIsSidekickOpen(false);
    setSidekickInput('');
    setSidekickAnswer(null);
    setSidekickError(null);
    setSidekickLastQuestion(null);
  }, [product.id]);

  // Also ensure active color stays reflected cleanly in carousel when product images/colorImages change
  const activeColorShowcase = resolveColorShowcaseImage(product, selectedColor);
  const activeImages = buildLuxuryCarouselImages(product, activeColorShowcase);
  const safeCarouselIdx =
    carouselIndex >= 0 && carouselIndex < activeImages.length ? carouselIndex : 0;
  const activeHeroImageUrl = activeImages[safeCarouselIdx] || activeImages[0];

  const activeCapacityOption =
    capacityOptions.find((opt) => opt.id === selectedCapacityId) || capacityOptions[0];

  const activePrice =
    selectedVariant && Number.isFinite(selectedVariant.price) && selectedVariant.price >= 0
      ? selectedVariant.price
      : activeCapacityOption && Number.isFinite(activeCapacityOption.price)
      ? activeCapacityOption.price
      : Number(product.price) || 0;

  const activeStock =
    typeof selectedVariant?.stock === 'number' && Number.isFinite(selectedVariant.stock)
      ? selectedVariant.stock
      : Number(product.stock) || 0;

  const activeSku = selectedVariant?.sku || product.sku;
  const isOutOfStock = activeStock <= 0;
  const subtotalAmount = computeLuxurySubtotal(activePrice, quantity);

  const rawTitle = lang === 'ar' ? product.nameAr || product.name : product.name;
  const colors = (product.colors || []).filter((c) => c.trim().length > 0);
  const nonColorVariants = (product.variants || []).filter(
    (v) => !v.id.startsWith('var-color-') && !v.color
  );

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    const targetImg = resolveColorShowcaseImage(product, color);
    const nextList = buildLuxuryCarouselImages(product, targetImg);
    if (targetImg) {
      const resolvedTarget = resolveFullResolutionImageUrl(targetImg) || targetImg;
      const foundIdx = nextList.findIndex((img) => img === resolvedTarget);
      setCarouselIndex(foundIdx >= 0 ? foundIdx : 0);
    } else {
      setCarouselIndex(0);
    }

    const colorVariant = findVariantForColor(product, color);
    if (colorVariant && nonColorVariants.length === 0) {
      setSelectedVariant(colorVariant);
    }
  };

  const handleSelectCapacity = (optionId: string) => {
    setSelectedCapacityId(optionId);
    const found = capacityOptions.find((opt) => opt.id === optionId);
    if (found?.variant) {
      setSelectedVariant(found.variant);
    }
  };

  const handlePrevImage = () => {
    setCarouselIndex((idx) => stepCarouselIndex(idx, -1, activeImages.length));
  };

  const handleNextImage = () => {
    setCarouselIndex((idx) => stepCarouselIndex(idx, 1, activeImages.length));
  };

  const handleAddClick = () => {
    if (isOutOfStock) return;
    onAddToCart(product, quantity, selectedColor, selectedVariant);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  const handleAskSidekick = async (promptText: string) => {
    const cleanQ = promptText.trim();
    if (!cleanQ || sidekickLoading) return;

    setSidekickLastQuestion(cleanQ);
    setSidekickLoading(true);
    setSidekickError(null);
    setSidekickAnswer(null);
    setIsSidekickOpen(true);

    try {
      const response = await fetch('/api/sidekick/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: rawTitle,
          brand: product.brand,
          category: product.category,
          price: activePrice,
          selectedColor,
          selectedCapacity: activeCapacityOption?.label,
          warrantyMonths: product.warrantyMonths,
          description: lang === 'ar' ? product.descriptionAr || product.description : product.description,
          specifications: product.specifications || [],
          question: cleanQ,
          lang,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        setSidekickError(
          data?.error ||
            (lang === 'ar'
              ? 'تعذر الوصول إلى خدمة Sidekick حالياً.'
              : 'Unable to reach Sidekick assistant right now.')
        );
        return;
      }
      setSidekickAnswer(data.answer);
      setSidekickInput('');
    } catch {
      setSidekickError(
        lang === 'ar'
          ? 'حدث خطأ في الاتصال بخادم المساعد.'
          : 'Network error while contacting Sidekick assistant.'
      );
    } finally {
      setSidekickLoading(false);
    }
  };

  const quickPrompts = getSidekickQuickPrompts(lang);
  const priceHasVariations =
    capacityOptions.length > 1 &&
    new Set(capacityOptions.map((c) => c.price)).size > 1;

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start bg-white dark:bg-[#0B1120]"
      data-testid={mode === 'modal' ? 'quickview-luxury-layout' : 'pdp-split-layout'}
    >
      {/* Left Column: Clean Pure-White Product Image Carousel with Flanking ◀ ▶ Navigation */}
      <div className="lg:col-span-6 relative bg-white dark:bg-[#0B1120] rounded-2xl flex items-center justify-center min-h-[250px] sm:min-h-[460px] p-3 sm:p-8 select-none">
        {/* Left Carousel Arrow ◀ */}
        {activeImages.length > 1 && (
          <button
            type="button"
            onClick={handlePrevImage}
            data-testid="pdp-carousel-prev"
            aria-label={lang === 'ar' ? 'الصورة السابقة' : 'Previous image'}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 text-[#0A0F2C] dark:text-white hover:border-[#0A0F2C] flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Centered Unobstructed Product Image on Pure White */}
        <div
          className="w-full h-[230px] sm:h-[420px] flex items-center justify-center px-10"
          data-testid="pdp-hero-showcase"
        >
          <LazyImage
            src={activeHeroImageUrl}
            alt={`${rawTitle}${selectedColor ? ` - ${selectedColor}` : ''}`}
            priority={true}
            data-testid={mode === 'modal' ? 'quickview-main-image' : 'pdp-hero-image'}
            wrapperClassName="w-full h-full flex items-center justify-center"
            className="max-h-full max-w-full w-auto h-auto object-contain select-none"
          />
        </div>

        {/* Right Carousel Arrow ▶ */}
        {activeImages.length > 1 && (
          <button
            type="button"
            onClick={handleNextImage}
            data-testid="pdp-carousel-next"
            aria-label={lang === 'ar' ? 'الصورة التالية' : 'Next image'}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 text-[#0A0F2C] dark:text-white hover:border-[#0A0F2C] flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Right Column: Clean Vertical Luxury Layout */}
      <div
        className="lg:col-span-6 space-y-5 bg-white dark:bg-[#0B1120]"
        data-testid="pdp-purchase-module"
      >
        {/* 1. Product Title (Medium-Weight Deep Midnight Navy Heading) */}
        <h1
          className="text-[22px] sm:text-[26px] font-semibold text-[#0A0F2C] dark:text-[#F8FAFC] leading-[1.3] tracking-tight m-0"
          data-testid="pdp-product-title"
        >
          {rawTitle}
        </h1>

        {/* 2. Compact AI Assistant Banner Card ("Ask Sidekick ->") */}
        <div
          className="rounded-xl border border-[#E2E8F0] dark:border-slate-700 overflow-hidden bg-white dark:bg-[#111A2E]"
          data-testid="pdp-sidekick-card"
        >
          {/* Dark Navy Top Header Bar */}
          <div className="bg-[#0A0F2C] text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wide">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>{lang === 'ar' ? 'مساعد المنتجات الذكي Sidekick' : 'Sidekick Product Assistant'}</span>
            </span>
            {isSidekickOpen && (
              <button
                type="button"
                onClick={() => setIsSidekickOpen(false)}
                aria-label={lang === 'ar' ? 'إغلاق المساعد' : 'Close Sidekick'}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* White Card Body */}
          <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-[#111A2E]">
            <p className="text-xs sm:text-[13.5px] font-medium text-[#0A0F2C] dark:text-slate-200 m-0">
              {lang === 'ar' ? 'احصل على التفاصيل التي تهمك.' : 'Get the detail that matters.'}
            </p>
            <button
              type="button"
              onClick={() => setIsSidekickOpen((prev) => !prev)}
              data-testid="pdp-ask-sidekick-btn"
              className="px-3.5 py-2 rounded-lg bg-[#0A0F2C] hover:bg-[#16204A] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <span>{lang === 'ar' ? 'اسأل Sidekick' : 'Ask Sidekick'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>

          {/* Interactive Expandable Sidekick Drawer */}
          {isSidekickOpen && (
            <div
              className="border-t border-[#E2E8F0] dark:border-slate-700 p-4 space-y-3 bg-[#F8FAFC] dark:bg-[#0B1120]"
              data-testid="pdp-sidekick-panel"
            >
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleAskSidekick(prompt)}
                    disabled={sidekickLoading}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E] hover:border-[#0A0F2C] text-[11px] font-medium text-[#0A0F2C] dark:text-slate-200 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskSidekick(sidekickInput);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={sidekickInput}
                  onChange={(e) => setSidekickInput(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'اسأل عن المواصفات أو البطارية أو الكفالة...'
                      : 'Ask about specs, camera, warranty, or compatibility...'
                  }
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E] text-xs text-[#0A0F2C] dark:text-white focus:outline-none focus:border-[#0A0F2C]"
                />
                <button
                  type="submit"
                  disabled={sidekickLoading || !sidekickInput.trim()}
                  aria-label={lang === 'ar' ? 'إرسال السؤال' : 'Send question'}
                  className="px-3 py-2 rounded-lg bg-[#0A0F2C] hover:bg-[#16204A] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {sidekickLoading && (
                <p className="text-xs text-[#475569] dark:text-slate-400">
                  {lang === 'ar' ? 'جاري تحليل مواصفات المنتج...' : 'Checking product specifications...'}
                </p>
              )}

              {sidekickError && (
                <div
                  className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300"
                  data-testid="pdp-sidekick-error"
                >
                  {sidekickError}
                </div>
              )}

              {sidekickAnswer && (
                <div
                  className="p-3 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E] space-y-1 text-xs text-[#0A0F2C] dark:text-slate-200 leading-relaxed"
                  data-testid="pdp-sidekick-answer"
                >
                  {sidekickLastQuestion && (
                    <p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">
                      {sidekickLastQuestion}
                    </p>
                  )}
                  <p className="whitespace-pre-line">{sidekickAnswer}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Clean Bold Dark Navy Price Display */}
        <div className="pt-0.5">
          <span
            className="text-[28px] sm:text-[32px] font-bold text-[#0A0F2C] dark:text-white tracking-tight tabular-nums leading-none"
            data-testid="pdp-luxury-price"
          >
            {formatLuxuryUsdPrice(activePrice)}
          </span>
        </div>

        {/* 4. Quantity Pill Stepper & Live Subtotal */}
        <div className="space-y-2 pt-0.5">
          <div
            className="inline-flex items-center gap-4 px-4 py-1.5 rounded-full border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E]"
            data-testid="pdp-qty-stepper"
          >
            <span className="text-xs font-semibold text-[#0A0F2C] dark:text-slate-200">
              {lang === 'ar' ? 'الكمية' : 'Quantity'}
            </span>
            <div className="inline-flex items-center gap-2.5">
              <button
                type="button"
                aria-label={lang === 'ar' ? 'إنقاص الكمية' : 'Decrease quantity'}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-full border border-[#E2E8F0] dark:border-slate-700 hover:border-[#0A0F2C] dark:hover:border-white text-[#0A0F2C] dark:text-white text-sm font-semibold flex items-center justify-center transition-colors cursor-pointer"
              >
                -
              </button>
              <span
                className="min-w-[1.25rem] text-center text-sm font-semibold text-[#0A0F2C] dark:text-white tabular-nums"
                data-testid="pdp-quantity-value"
              >
                {quantity}
              </span>
              <button
                type="button"
                aria-label={lang === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                onClick={() =>
                  setQuantity((q) =>
                    activeStock > 0 ? Math.min(activeStock, q + 1) : q + 1
                  )
                }
                className="w-7 h-7 rounded-full border border-[#E2E8F0] dark:border-slate-700 hover:border-[#0A0F2C] dark:hover:border-white text-[#0A0F2C] dark:text-white text-sm font-semibold flex items-center justify-center transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <div
            className="text-xs sm:text-[13px] font-medium text-[#475569] dark:text-slate-400 tabular-nums"
            data-testid="pdp-subtotal-display"
          >
            {lang === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}{' '}
            <span className="font-bold text-[#0A0F2C] dark:text-white">
              {formatLuxuryUsdPrice(subtotalAmount)}
            </span>
          </div>
        </div>

        {/* 5. Color Selector with Square Rounded Product Thumbnail Cards & Checkmark */}
        {colors.length > 0 && (
          <div className="space-y-2.5 pt-1" data-testid="pdp-color-swatches">
            <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">
              {lang === 'ar' ? 'اللون:' : 'Color:'}{' '}
              {selectedColor && (
                <span
                  className="font-semibold text-[#0A0F2C] dark:text-white"
                  data-testid={
                    mode === 'modal' ? 'quickview-active-color-label' : 'pdp-active-color-label'
                  }
                >
                  {selectedColor}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {colors.map((color) => {
                const isSelected = selectedColor === color;
                const thumbImg = resolveColorShowcaseImage(product, color) || activeImages[0];
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleSelectColor(color)}
                    aria-pressed={isSelected}
                    aria-label={color}
                    title={color}
                    data-testid={
                      mode === 'modal'
                        ? `quickview-color-btn-${color}`
                        : `pdp-color-swatch-${color}`
                    }
                    className={`relative w-[68px] h-[68px] rounded-xl bg-white p-1.5 flex items-center justify-center transition-none cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#0070F3]'
                        : 'border border-[#E2E8F0] dark:border-slate-700 hover:border-[#0A0F2C]'
                    }`}
                  >
                    <img
                      src={resolveFullResolutionImageUrl(thumbImg)}
                      alt={`${rawTitle} - ${color}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-lg"
                    />
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        data-testid={`pdp-color-check-${color}`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0070F3] text-white flex items-center justify-center shadow-xs"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Capacity / Configuration Selector */}
        {capacityOptions.length > 0 && (
          <div className="space-y-2 pt-0.5" data-testid="pdp-capacity-selector">
            <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">
              {lang === 'ar' ? 'السعة:' : 'Capacity:'}{' '}
              {activeCapacityOption && (
                <span className="font-semibold text-[#0A0F2C] dark:text-white">
                  {activeCapacityOption.label}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {capacityOptions.map((option) => {
                const isActiveCap = activeCapacityOption?.id === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isActiveCap}
                    data-testid={`pdp-capacity-btn-${option.label}`}
                    onClick={() => handleSelectCapacity(option.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      isActiveCap
                        ? 'border-[#0A0F2C] bg-[#0A0F2C] text-white dark:border-white dark:bg-white dark:text-[#0A0F2C]'
                        : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E] text-[#0A0F2C] dark:text-slate-200 hover:border-[#0A0F2C]'
                    }`}
                  >
                    <span>{option.label}</span>
                    {priceHasVariations && (
                      <span className="ml-1.5 rtl:ml-0 rtl:mr-1.5 opacity-85 tabular-nums">
                        {formatLuxuryUsdPrice(option.price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Out of stock alert + Notify Me if 0 stock */}
        {isOutOfStock && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{lang === 'ar' ? 'نفذت الكمية مؤقتاً' : 'Temporarily Out of Stock'}</span>
            </div>
            <NotifyMeControl product={product} lang={lang} variant="panel" />
          </div>
        )}

        {/* 7. Deep Midnight Navy Purchase Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={handleAddClick}
            disabled={isOutOfStock}
            data-testid="pdp-add-to-cart-btn"
            className={`w-full h-12 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              isOutOfStock
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : justAdded
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#0A0F2C] hover:bg-[#16204A] text-white dark:bg-white dark:text-[#0A0F2C] dark:hover:bg-slate-100'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{lang === 'ar' ? 'تمت الإضافة إلى السلة' : 'Added to Cart'}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>{lang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart'}</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onDirectOrder(product, quantity, selectedColor, selectedVariant)}
              disabled={isOutOfStock}
              className="h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#0A0F2C] text-xs font-semibold text-[#0A0F2C] dark:text-white bg-white dark:bg-[#111A2E] transition-colors cursor-pointer disabled:opacity-50"
            >
              {lang === 'ar' ? 'شراء مباشر' : 'Buy Now'}
            </button>

            <button
              type="button"
              onClick={() =>
                onWhatsAppInquiry({
                  fullTitle: selectedColor ? `${rawTitle} - ${selectedColor}` : rawTitle,
                  activePrice,
                  activeSku,
                  selectedColor,
                  selectedCapacity: activeCapacityOption?.label,
                })
              }
              className="h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#16A34A] text-xs font-semibold text-[#0A0F2C] dark:text-emerald-300 bg-white dark:bg-[#111A2E] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <WhatsApp3DIcon size={16} />
              <span>{lang === 'ar' ? 'واتساب 70773067' : 'WhatsApp 70773067'}</span>
            </button>
          </div>
        </div>

        {/* Quiet Utility Footer Row (Wishlist, Compare, Share, Full Page Link in Modal) */}
        <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B] dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onToggleWishlist}
              data-testid="pdp-wishlist-btn"
              aria-label={
                isFavorited
                  ? lang === 'ar'
                    ? 'إزالة من المفضلة'
                    : 'Remove from Wishlist'
                  : lang === 'ar'
                  ? 'إضافة للمفضلة'
                  : 'Add to Wishlist'
              }
              className={`inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                isFavorited
                  ? 'text-[#0A0F2C] dark:text-white font-semibold'
                  : 'text-[#64748B] hover:text-[#0A0F2C] dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current text-rose-500' : ''}`} />
              <span>
                {isFavorited
                  ? lang === 'ar'
                    ? 'محفوظ في المفضلة'
                    : 'Saved'
                  : lang === 'ar'
                  ? 'المفضلة'
                  : 'Wishlist'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleCompare}
              className={`inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                isCompared
                  ? 'text-[#0070F3]'
                  : 'text-[#64748B] hover:text-[#0A0F2C] dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'مقارنة' : 'Compare'}</span>
            </button>

            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="inline-flex items-center gap-1.5 font-medium text-[#64748B] hover:text-[#0A0F2C] dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>
                  {shareCopied
                    ? lang === 'ar'
                      ? 'تم النسخ'
                      : 'Copied'
                    : lang === 'ar'
                    ? 'مشاركة'
                    : 'Share'}
                </span>
              </button>
            )}
          </div>

          {onOpenFullPage && (
            <button
              type="button"
              onClick={onOpenFullPage}
              className="inline-flex items-center gap-1 font-semibold text-[#0A0F2C] dark:text-slate-200 hover:underline cursor-pointer"
            >
              <span>{lang === 'ar' ? 'عرض المواصفات الكاملة' : 'Full Specifications'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
