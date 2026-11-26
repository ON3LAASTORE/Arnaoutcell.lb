import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
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
import { Language, Product, ProductColorOption, ProductVariant } from '../types';
import { LazyImage } from './LazyImage';
import { NotifyMeControl } from './NotifyMeControl';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import {
  calculateVariantUnitPrice,
  findVariantForColor,
  getProductColorOptions,
  isCapacityAvailableForColor,
  resolveAllowedCapacityForColor,
  resolveColorShowcaseImage,
} from '../utils/colorVariantHelpers';
import { resolveFullResolutionImageUrl } from '../utils/imageResolutionHelpers';
import {
  buildCapacityOptions,
  buildLuxuryCarouselImages,
  computeLuxurySubtotal,
  findCarouselIndexForColor,
  findColorForCarouselImage,
  formatLuxuryUsdPrice,
  getSidekickQuickPrompts,
  stepCarouselIndex,
} from '../utils/productLuxuryDetailHelpers';

interface ProductLuxuryShowcaseProps {
  product: Product;
  initialVariantId?: string;
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
    selectedVariant?: ProductVariant,
    selectedColorImage?: string,
    colorPriceAdjustment?: number
  ) => void;
  onDirectOrder: (
    product: Product,
    quantity: number,
    selectedColor?: string,
    selectedVariant?: ProductVariant,
    selectedColorImage?: string,
    colorPriceAdjustment?: number
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
  initialVariantId,
  lang,
  mode,
  isFavorited,
  isCompared,
  onToggleWishlist,
  onToggleCompare,
  onAddToCart,
  onWhatsAppInquiry,
  onOpenFullPage,
  onShare,
  shareCopied = false,
}) => {
  const capacityOptions = buildCapacityOptions(product);
  const colorOptions = getProductColorOptions(product);
  const preselectedVariant = initialVariantId
    ? product.variants?.find((v) => v.id === initialVariantId)
    : undefined;

  const resolveInitialColor = (): string | undefined => {
    if (
      preselectedVariant?.color &&
      colorOptions.some(
        (opt) => opt.name.toLowerCase() === preselectedVariant.color!.trim().toLowerCase()
      )
    ) {
      return (
        colorOptions.find(
          (opt) => opt.name.toLowerCase() === preselectedVariant.color!.trim().toLowerCase()
        )?.name || preselectedVariant.color
      );
    }
    return colorOptions[0]?.name;
  };

  const initialColor = resolveInitialColor();
  const initialColorOption = colorOptions.find((opt) => opt.name === initialColor);
  const initialColorImage =
    initialColorOption?.imageUrl || resolveColorShowcaseImage(product, initialColor);
  const carouselImages = buildLuxuryCarouselImages(product, initialColorImage);

  const [carouselIndex, setCarouselIndex] = useState<number>(() =>
    findCarouselIndexForColor(product, carouselImages, initialColor)
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(initialColor);
  const [selectedCapacityId, setSelectedCapacityId] = useState<string | undefined>(() => {
    if (preselectedVariant) {
      const capMatch = capacityOptions.find((opt) => opt.variant?.id === preselectedVariant.id);
      if (capMatch && isCapacityAvailableForColor(capMatch.id, initialColorOption)) {
        return capMatch.id;
      }
    }
    return resolveAllowedCapacityForColor(
      capacityOptions,
      capacityOptions[0]?.id,
      initialColorOption
    )?.id;
  });
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(() => {
    const allowedInitCap = resolveAllowedCapacityForColor(
      capacityOptions,
      preselectedVariant?.id,
      initialColorOption
    );
    if (preselectedVariant && allowedInitCap?.variant?.id === preselectedVariant.id) {
      return preselectedVariant;
    }
    if (allowedInitCap?.variant) {
      return allowedInitCap.variant;
    }
    const colorVariant = initialColor ? findVariantForColor(product, initialColor) : undefined;
    return colorVariant || product.variants?.[0];
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  // Sidekick Assistant state
  const [isSidekickOpen, setIsSidekickOpen] = useState<boolean>(false);
  const [sidekickInput, setSidekickInput] = useState<string>('');
  const [sidekickLoading, setSidekickLoading] = useState<boolean>(false);
  const [sidekickAnswer, setSidekickAnswer] = useState<string | null>(null);
  const [sidekickError, setSidekickError] = useState<string | null>(null);
  const [sidekickLastQuestion, setSidekickLastQuestion] = useState<string | null>(null);
  const sidekickAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const nextCaps = buildCapacityOptions(product);
    const nextColorOpts = getProductColorOptions(product);
    const matchedVariant = initialVariantId
      ? product.variants?.find((v) => v.id === initialVariantId)
      : undefined;
    const matchedColorOpt = matchedVariant?.color
      ? nextColorOpts.find(
          (opt) => opt.name.toLowerCase() === matchedVariant.color!.trim().toLowerCase()
        )
      : nextColorOpts[0];
    const nextColor = matchedColorOpt?.name || nextColorOpts[0]?.name;
    const nextColorImg =
      matchedColorOpt?.imageUrl || resolveColorShowcaseImage(product, nextColor);
    const nextImages = buildLuxuryCarouselImages(product, nextColorImg);
    const nextColorVariant = nextColor ? findVariantForColor(product, nextColor) : undefined;
    const allowedCap = resolveAllowedCapacityForColor(
      nextCaps,
      matchedVariant?.id || nextCaps[0]?.id,
      matchedColorOpt
    );

    sidekickAbortRef.current?.abort();
    setSidekickLoading(false);
    setSelectedColor(nextColor);
    setCarouselIndex(findCarouselIndexForColor(product, nextImages, nextColor));
    setSelectedCapacityId(allowedCap?.id);
    setSelectedVariant(
      allowedCap?.variant || matchedVariant || nextColorVariant || product.variants?.[0]
    );
    setQuantity(1);
    setJustAdded(false);
    setIsSidekickOpen(false);
    setSidekickInput('');
    setSidekickAnswer(null);
    setSidekickError(null);
    setSidekickLastQuestion(null);
    return () => {
      sidekickAbortRef.current?.abort();
    };
  }, [product.id, initialVariantId]);

  const activeColorOption = selectedColor
    ? colorOptions.find((opt) => opt.name === selectedColor)
    : colorOptions[0];
  const activeColorShowcase =
    activeColorOption?.imageUrl || resolveColorShowcaseImage(product, selectedColor);
  const activeImages = buildLuxuryCarouselImages(product, activeColorShowcase);
  const safeCarouselIdx =
    carouselIndex >= 0 && carouselIndex < activeImages.length ? carouselIndex : 0;
  const activeHeroImageUrl = activeImages[safeCarouselIdx] || activeImages[0];

  const activeCapacityOption =
    capacityOptions.find((opt) => opt.id === selectedCapacityId) || capacityOptions[0];

  const baseCapacityPrice =
    selectedVariant && Number.isFinite(selectedVariant.price) && selectedVariant.price >= 0
      ? selectedVariant.price
      : activeCapacityOption && Number.isFinite(activeCapacityOption.price)
      ? activeCapacityOption.price
      : Number(product.price) || 0;

  const isColorOnlyVariantSelected = Boolean(
    selectedVariant && selectedVariant.id.startsWith('var-color-')
  );
  const appliedColorAdjustment =
    isColorOnlyVariantSelected || !activeColorOption
      ? 0
      : Number(activeColorOption.priceAdjustment) || 0;

  const activePrice = calculateVariantUnitPrice(
    baseCapacityPrice,
    isColorOnlyVariantSelected ? undefined : activeColorOption
  );

  const activeStock =
    typeof selectedVariant?.stock === 'number' && Number.isFinite(selectedVariant.stock)
      ? selectedVariant.stock
      : Number(product.stock) || 0;

  const activeSku = selectedVariant?.sku || product.sku;
  const isOutOfStock = activeStock <= 0;
  const subtotalAmount = computeLuxurySubtotal(activePrice, quantity);

  const rawTitle = lang === 'ar' ? product.nameAr || product.name : product.name;
  const nonColorVariants = (product.variants || []).filter(
    (v) => !v.id.startsWith('var-color-') && !v.color
  );

  const handleSelectColor = (colorOpt: ProductColorOption) => {
    setSelectedColor(colorOpt.name);
    const targetImg = colorOpt.imageUrl || resolveColorShowcaseImage(product, colorOpt.name);
    const nextList = buildLuxuryCarouselImages(product, targetImg);
    if (targetImg) {
      const resolvedTarget = resolveFullResolutionImageUrl(targetImg) || targetImg;
      const foundIdx = nextList.findIndex((img) => img === resolvedTarget);
      setCarouselIndex(foundIdx >= 0 ? foundIdx : 0);
    } else {
      setCarouselIndex(0);
    }

    const allowedCap = resolveAllowedCapacityForColor(
      capacityOptions,
      selectedCapacityId,
      colorOpt
    );
    if (allowedCap) {
      if (allowedCap.id !== selectedCapacityId) {
        setSelectedCapacityId(allowedCap.id);
      }
      if (allowedCap.variant) {
        setSelectedVariant(allowedCap.variant);
        return;
      }
    }

    const colorVariant = findVariantForColor(product, colorOpt.name);
    if (colorVariant && nonColorVariants.length === 0) {
      setSelectedVariant(colorVariant);
    }
  };

  const handleSelectCapacity = (optionId: string) => {
    if (!isCapacityAvailableForColor(optionId, activeColorOption)) return;
    setSelectedCapacityId(optionId);
    const found = capacityOptions.find((opt) => opt.id === optionId);
    if (found?.variant) {
      setSelectedVariant(found.variant);
    }
  };

  const handleCarouselStep = (delta: -1 | 1) => {
    const nextIdx = stepCarouselIndex(safeCarouselIdx, delta, activeImages.length);
    setCarouselIndex(nextIdx);
    const matchedColorName = findColorForCarouselImage(product, activeImages[nextIdx]);
    if (matchedColorName) {
      const matchedOpt = colorOptions.find(
        (opt) => opt.name.toLowerCase() === matchedColorName.toLowerCase()
      );
      setSelectedColor(matchedOpt?.name || matchedColorName);

      if (matchedOpt) {
        const allowedCap = resolveAllowedCapacityForColor(
          capacityOptions,
          selectedCapacityId,
          matchedOpt
        );
        if (allowedCap) {
          if (allowedCap.id !== selectedCapacityId) {
            setSelectedCapacityId(allowedCap.id);
          }
          if (allowedCap.variant) {
            setSelectedVariant(allowedCap.variant);
            return;
          }
        }
      }

      const colorVariant = findVariantForColor(product, matchedColorName);
      if (colorVariant && nonColorVariants.length === 0) {
        setSelectedVariant(colorVariant);
      }
    }
  };

  const handlePrevImage = () => {
    handleCarouselStep(-1);
  };

  const handleNextImage = () => {
    handleCarouselStep(1);
  };

  const handleAddClick = () => {
    if (isOutOfStock) return;
    onAddToCart(
      product,
      quantity,
      selectedColor,
      selectedVariant,
      activeColorShowcase || undefined,
      appliedColorAdjustment
    );
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  const handleAskSidekick = async (promptText: string) => {
    const cleanQ = promptText.trim();
    if (!cleanQ || sidekickLoading) return;

    sidekickAbortRef.current?.abort();
    const controller = new AbortController();
    sidekickAbortRef.current = controller;

    setSidekickLastQuestion(cleanQ);
    setSidekickLoading(true);
    setSidekickError(null);
    setSidekickAnswer(null);
    setIsSidekickOpen(true);

    try {
      const response = await fetch('/api/sidekick/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
      if (controller.signal.aborted) return;
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
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setSidekickError(
        lang === 'ar'
          ? 'حدث خطأ في الاتصال بخادم المساعد.'
          : 'Network error while contacting Sidekick assistant.'
      );
    } finally {
      if (!controller.signal.aborted) {
        setSidekickLoading(false);
      }
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
      {/* LEFT COLUMN: Clean Pure-White Gallery + Color Thumbnails + Disclaimer */}
      <div className="lg:col-span-6 space-y-6 bg-white dark:bg-[#0B1120]">
        {/* Large Clean Product Image Flanked by Subtle ◀ ▶ Navigation */}
        <div className="relative bg-white dark:bg-white rounded-2xl border border-transparent dark:border-slate-800 flex items-center justify-center min-h-[260px] sm:min-h-[430px] p-3 sm:p-6 select-none">
          {activeImages.length > 1 && (
            <button
              type="button"
              onClick={handlePrevImage}
              data-testid="pdp-carousel-prev"
              aria-label={lang === 'ar' ? 'الصورة السابقة' : 'Previous image'}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 text-[#0A0F2C] dark:text-white hover:border-[#0A0F2C] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div
            className="w-full h-[240px] sm:h-[400px] flex items-center justify-center px-10"
            data-testid="pdp-hero-showcase"
          >
            <LazyImage
              src={activeHeroImageUrl}
              alt={`${rawTitle}${selectedColor ? ` - ${selectedColor}` : ''}`}
              priority={true}
              loading={mode === 'modal' ? 'lazy' : 'eager'}
              responsiveSizes="(max-width: 1024px) 100vw, 50vw"
              data-testid={mode === 'modal' ? 'quickview-main-image' : 'pdp-hero-image'}
              wrapperClassName="w-full h-full flex items-center justify-center"
              className="max-h-full max-w-full w-auto h-auto object-contain select-none"
            />
          </div>

          {activeImages.length > 1 && (
            <button
              type="button"
              onClick={handleNextImage}
              data-testid="pdp-carousel-next"
              aria-label={lang === 'ar' ? 'الصورة التالية' : 'Next image'}
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 text-[#0A0F2C] dark:text-white hover:border-[#0A0F2C] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Color Selector with Square Rounded Thumbnail Cards Below Hero Image */}
        {colorOptions.length > 0 && (
          <div className="space-y-3" data-testid="pdp-color-swatches">
            <div className="text-xs font-medium text-[#64748B] dark:text-slate-400 flex items-center gap-2 flex-wrap">
              <span>{lang === 'ar' ? 'اللون:' : 'Color:'}</span>
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
              {appliedColorAdjustment !== 0 && (
                <span className="text-[11px] font-semibold text-[#0070F3]">
                  ({appliedColorAdjustment > 0 ? '+' : '-'}$
                  {Math.abs(appliedColorAdjustment)})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-start gap-3">
              {colorOptions.map((colorOpt) => {
                const isSelected = selectedColor === colorOpt.name;
                const explicitThumb = colorOpt.imageUrl || resolveColorShowcaseImage(product, colorOpt.name);
                const fallbackThumb = explicitThumb || activeImages[0];
                const adj = Number(colorOpt.priceAdjustment) || 0;

                return (
                  <div key={colorOpt.id} className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectColor(colorOpt)}
                      aria-pressed={isSelected}
                      aria-label={colorOpt.name}
                      title={
                        adj !== 0
                          ? `${colorOpt.name} (${adj > 0 ? '+' : '-'}$${Math.abs(adj)})`
                          : colorOpt.name
                      }
                      data-testid={
                        mode === 'modal'
                          ? `quickview-color-btn-${colorOpt.name}`
                          : `pdp-color-swatch-${colorOpt.name}`
                      }
                      className={`relative w-[68px] h-[68px] sm:w-[74px] sm:h-[74px] rounded-xl bg-white p-1.5 flex items-center justify-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#0070F3]'
                          : 'border border-[#E2E8F0] dark:border-slate-700 hover:border-[#0A0F2C]'
                      }`}
                    >
                      {explicitThumb ? (
                        <LazyImage
                          src={explicitThumb}
                          alt={`${rawTitle} - ${colorOpt.name}`}
                          width={74}
                          height={74}
                          responsiveSizes="74px"
                          priority={true}
                          loading="lazy"
                          wrapperClassName="w-full h-full flex items-center justify-center rounded-lg overflow-hidden"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : colorOpt.hex ? (
                        <svg
                          viewBox="0 0 48 48"
                          className="w-full h-full rounded-lg border border-slate-200/80"
                          aria-hidden="true"
                        >
                          <rect width="48" height="48" rx="8" fill={colorOpt.hex} />
                        </svg>
                      ) : (
                        <LazyImage
                          src={fallbackThumb}
                          alt={`${rawTitle} - ${colorOpt.name}`}
                          width={74}
                          height={74}
                          responsiveSizes="74px"
                          priority={true}
                          loading="lazy"
                          wrapperClassName="w-full h-full flex items-center justify-center rounded-lg overflow-hidden"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      )}
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          data-testid={`pdp-color-check-${colorOpt.name}`}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0070F3] text-white flex items-center justify-center shadow-xs"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </button>
                    {adj !== 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-[#0A0F2C]/90 text-white text-[10px] font-bold leading-none whitespace-nowrap tabular-nums">
                        {adj > 0 ? '+' : '-'}${Math.abs(adj)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Small Gray Reference Disclaimer */}
        <p
          className="text-[11px] leading-relaxed text-[#64748B] dark:text-slate-400 m-0"
          data-testid="pdp-reference-disclaimer"
        >
          {lang === 'ar'
            ? 'صور المنتج مرجعية فقط. قد يختلف المنتج الفعلي في المظهر أو اللون. يرجى الرجوع إلى رمز المنتج (SKU) والوصف والمواصفات الرسمية لضمان الدقة.'
            : 'Product images are for reference only. The actual item may differ in appearance & colour. Please refer to the product code, SKU, and description from manufacturer website for accurate specifications.'}
        </p>
      </div>

      {/* RIGHT COLUMN: Title -> 961 Sidekick -> CAPACITY -> Price/Qty/Subtotal -> Authenticity -> ADD TO CART + Circular Actions */}
      <div
        className="lg:col-span-6 space-y-5 bg-white dark:bg-[#0B1120]"
        data-testid="pdp-purchase-module"
      >
        {/* 1. Clean Dark Navy Title */}
        <h1
          className="text-[22px] sm:text-[26px] font-semibold text-[#0A0F2C] dark:text-[#F8FAFC] leading-[1.3] tracking-tight m-0"
          data-testid="pdp-product-title"
        >
          {rawTitle}
        </h1>

        {/* 2. 961 Sidekick Banner Card */}
        <div
          className="rounded-xl border border-[#E2E8F0] dark:border-slate-700 overflow-hidden bg-white dark:bg-[#111A2E]"
          data-testid="pdp-sidekick-card"
        >
          <div className="bg-[#0A0F2C] text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wide">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>961 Sidekick</span>
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

          <div className="px-4 py-3.5 flex items-center justify-between gap-4 bg-white dark:bg-[#111A2E]">
            <p className="text-xs sm:text-[13px] font-medium text-[#0A0F2C] dark:text-slate-200 leading-snug m-0">
              {lang === 'ar'
                ? 'احصل على التفاصيل التي تهمك: المواصفات، التوافق، التوصيل، والكفالة بدون عناء البحث.'
                : 'Get the detail that matters. Specifications, fit, delivery, and warranty—without the hunt.'}
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
                  className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2"
                  data-testid="pdp-sidekick-error"
                >
                  <span>{sidekickError}</span>
                  {sidekickLastQuestion && (
                    <button
                      type="button"
                      onClick={() => handleAskSidekick(sidekickLastQuestion)}
                      className="px-2.5 py-1 rounded-md bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                  )}
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

        {/* 3. CAPACITY Selector */}
        {capacityOptions.length > 0 && (
          <div className="space-y-2.5 pt-0.5" data-testid="pdp-capacity-selector">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-[#0A0F2C] dark:text-slate-200">
              <span>{lang === 'ar' ? 'السعة (CAPACITY)' : 'CAPACITY'}</span>
              <span className="text-[11px] font-medium normal-case tracking-normal text-[#64748B] dark:text-slate-400 tabular-nums">
                SKU: {activeSku}
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {capacityOptions.map((option) => {
                const isActiveCap = activeCapacityOption?.id === option.id;
                const isAvailableForColor = isCapacityAvailableForColor(
                  option.id,
                  activeColorOption
                );
                const tierPrice = calculateVariantUnitPrice(
                  option.price,
                  isColorOnlyVariantSelected ? undefined : activeColorOption
                );

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!isAvailableForColor}
                    aria-disabled={!isAvailableForColor}
                    aria-pressed={isActiveCap}
                    title={
                      !isAvailableForColor
                        ? lang === 'ar'
                          ? 'غير متوفر بهذا اللون'
                          : `Not available in ${selectedColor || 'this color'}`
                        : option.label
                    }
                    data-testid={`pdp-capacity-btn-${option.label}`}
                    onClick={() => handleSelectCapacity(option.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                      !isAvailableForColor
                        ? 'border-[#E2E8F0] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 line-through opacity-55 cursor-not-allowed'
                        : isActiveCap
                        ? 'border-[#0A0F2C] bg-[#0A0F2C] text-white dark:border-white dark:bg-white dark:text-[#0A0F2C] cursor-pointer'
                        : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E] text-[#0A0F2C] dark:text-slate-200 hover:border-[#0A0F2C] cursor-pointer'
                    }`}
                  >
                    <span>{option.label}</span>
                    {priceHasVariations && (
                      <span className="ml-1.5 rtl:ml-0 rtl:mr-1.5 opacity-85 tabular-nums">
                        {formatLuxuryUsdPrice(tierPrice)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Bold Price + Quantity Counter (- 1 +) + Live Subtotal */}
        <div className="space-y-3 pt-1">
          <div>
            <span
              className="text-[28px] sm:text-[32px] font-bold text-[#0A0F2C] dark:text-white tracking-tight tabular-nums leading-none"
              data-testid="pdp-luxury-price"
            >
              {formatLuxuryUsdPrice(activePrice)}
            </span>
          </div>

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

        {/* 5. Product Authenticity Badge (Green Checkmark Card) */}
        <div
          className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30 px-4 py-3 flex items-start gap-3"
          data-testid="pdp-authenticity-badge"
        >
          <CheckCircle2 className="w-5 h-5 text-[#16A34A] dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-[#0A0F2C] dark:text-emerald-200">
              {lang === 'ar' ? 'أصالة المنتج مضمونة' : 'Product Authenticity'}
            </div>
            <p className="text-[11px] text-[#475569] dark:text-emerald-300/80 leading-snug m-0">
              {lang === 'ar'
                ? 'جهاز أصلي 100% مختوم من الوكيل المعتمد مع كفالة رسمية في لبنان.'
                : '100% Genuine & Factory Sealed — Backed by verified official warranty across Lebanon.'}
            </p>
          </div>
        </div>

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

        {/* 6. Large Solid Deep Navy ADD TO CART Button + Circular WhatsApp & Wishlist Actions */}
        <div className="space-y-4 pt-1">
          <button
            type="button"
            onClick={handleAddClick}
            disabled={isOutOfStock}
            data-testid="pdp-add-to-cart-btn"
            className={`w-full h-12 px-6 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-[0.06em] flex items-center justify-center gap-2 transition-colors cursor-pointer ${
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
                <span>{lang === 'ar' ? 'تمت الإضافة إلى السلة' : 'ADDED TO CART'}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>{lang === 'ar' ? 'أضف إلى السلة' : 'ADD TO CART'}</span>
              </>
            )}
          </button>

          {/* Compact Circular WhatsApp & Heart Wishlist Icon Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="pdp-whatsapp-btn"
                aria-label={lang === 'ar' ? 'اطلب عبر واتساب' : 'Order or inquire on WhatsApp'}
                title={lang === 'ar' ? 'واتساب 70773067' : 'WhatsApp 70773067'}
                onClick={() =>
                  onWhatsAppInquiry({
                    fullTitle: selectedColor ? `${rawTitle} - ${selectedColor}` : rawTitle,
                    activePrice,
                    activeSku,
                    selectedColor,
                    selectedCapacity: activeCapacityOption?.label,
                  })
                }
                className="w-11 h-11 rounded-full border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E] hover:border-[#16A34A] flex items-center justify-center transition-colors cursor-pointer"
              >
                <WhatsApp3DIcon size={22} />
              </button>

              <button
                type="button"
                onClick={onToggleWishlist}
                data-testid="pdp-wishlist-btn"
                aria-pressed={isFavorited}
                aria-label={
                  isFavorited
                    ? lang === 'ar'
                      ? 'إزالة من المفضلة'
                      : 'Remove from Wishlist'
                    : lang === 'ar'
                    ? 'إضافة للمفضلة'
                    : 'Add to Wishlist'
                }
                title={
                  isFavorited
                    ? lang === 'ar'
                      ? 'محفوظ في المفضلة'
                      : 'Saved to Wishlist'
                    : lang === 'ar'
                    ? 'أضف إلى المفضلة'
                    : 'Save to Wishlist'
                }
                className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                  isFavorited
                    ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-rose-500'
                    : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E] hover:border-[#0A0F2C] text-[#0A0F2C] dark:text-slate-200'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current text-rose-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onToggleCompare}
                aria-pressed={isCompared}
                aria-label={lang === 'ar' ? 'مقارنة المنتج' : 'Compare product'}
                title={lang === 'ar' ? 'مقارنة' : 'Compare'}
                className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                  isCompared
                    ? 'border-[#0070F3] bg-[#EAF3FF] dark:bg-blue-950/40 text-[#0070F3]'
                    : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E] hover:border-[#0A0F2C] text-[#64748B] hover:text-[#0A0F2C] dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Scale className="w-4 h-4" />
              </button>

              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  aria-label={lang === 'ar' ? 'مشاركة المنتج' : 'Share product'}
                  title={shareCopied ? (lang === 'ar' ? 'تم النسخ' : 'Link Copied') : (lang === 'ar' ? 'مشاركة' : 'Share')}
                  className="w-11 h-11 rounded-full border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111A2E] hover:border-[#0A0F2C] text-[#64748B] hover:text-[#0A0F2C] dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  {shareCopied ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Share2 className="w-4 h-4" />}
                </button>
              )}
            </div>

            {onOpenFullPage && (
              <button
                type="button"
                onClick={onOpenFullPage}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A0F2C] dark:text-slate-200 hover:underline cursor-pointer"
              >
                <span>{lang === 'ar' ? 'عرض التفاصيل الكاملة' : 'Full Product Details'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
