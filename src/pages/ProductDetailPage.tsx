import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from '../components/ProductCard';
import {
  Star,
  Truck,
  Heart,
  ShoppingCart,
  Share2,
  Play,
  Sparkles,
  Scale,
  RotateCcw,
  PackageCheck,
  ChevronRight,
  Check,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { WhatsApp3DIcon, Zap3DIcon } from '../components/icons/ThreeDIcons';
import { LazyImage } from '../components/LazyImage';
import { openExternalUrl } from '../utils/navigation';
import { addProductReview } from '../services/storageService';
import { resolveFullResolutionImageUrl } from '../utils/imageResolutionHelpers';
import { NotifyMeControl } from '../components/NotifyMeControl';
import { RecentlyViewedCarousel } from '../components/RecentlyViewedCarousel';
import {
  buildPdpColorSwatches,
  buildPdpGalleryItems,
  buildPdpPurchaseMetrics,
  buildPdpSocialProof,
  buildPdpTitleWithColor,
  getPdpServiceFeatures,
} from '../utils/productDetailHelpers';
import {
  findVariantForColor,
  resolveExplicitColorImage,
} from '../utils/colorVariantHelpers';

export const ProductDetailPage: React.FC = () => {
  const {
    lang,
    t,
    products,
    categories,
    selectedProductId,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setCurrentView,
    selectCategory,
    storeSettings,
    isInCompare,
    addToCompare,
    removeFromCompare,
    setIsCompareModalOpen,
    recordProductView,
  } = useShop();

  const product = products.find((p) => p.id === selectedProductId) || products[0];

  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [activeColorImageOverride, setActiveColorImageOverride] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product?.colors?.[0]);
  const [selectedVariant, setSelectedVariant] = useState(product?.variants?.[0]);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [zoomStyle, setZoomStyle] = useState<{ display: string; x: number; y: number }>({
    display: 'none',
    x: 0,
    y: 0,
  });

  // Review submission form state
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Synchronize variant, color, and image when viewing a different product and persist to recently viewed
  React.useEffect(() => {
    const initialColor = product?.colors?.[0];
    const initialColorImg = product ? resolveExplicitColorImage(product, initialColor) : undefined;
    const nonColorVariant = product?.variants?.find(
      (v) => !v.id.startsWith('var-color-') && !v.color
    );
    const initialColorVariant =
      product && initialColor ? findVariantForColor(product, initialColor) : undefined;

    setActiveGalleryIndex(0);
    setActiveColorImageOverride(initialColorImg || null);
    setSelectedColor(initialColor);
    setSelectedVariant(initialColorVariant || nonColorVariant || product?.variants?.[0]);
    setQuantity(1);
    setJustAdded(false);
    setCopiedShare(false);
    setReviewSubmitted(false);
    if (product?.id) {
      recordProductView(product.id);
    }
  }, [product?.id]);

  if (!product) return null;

  const isFavorited = isInWishlist(product.id);
  const activeStock =
    typeof selectedVariant?.stock === 'number' && Number.isFinite(selectedVariant.stock)
      ? selectedVariant.stock
      : product.stock;
  const activeSku = selectedVariant?.sku || product.sku;
  const isOutOfStock = activeStock <= 0;
  const rawTitle = lang === 'ar' ? product.nameAr || product.name : product.name;
  const fullTitle = buildPdpTitleWithColor(rawTitle, selectedColor);
  const pricing = buildPdpPurchaseMetrics(product, selectedVariant, lang);
  const galleryItems = buildPdpGalleryItems(product);
  const activeGalleryItem = galleryItems[activeGalleryIndex] || galleryItems[0];
  const colorSwatches = buildPdpColorSwatches(product, product.price);
  const socialProof = buildPdpSocialProof(product, lang);
  const serviceFeatures = getPdpServiceFeatures(lang);
  const nonColorVariants = (product.variants || []).filter(
    (v) => !v.id.startsWith('var-color-') && !v.color
  );

  const selectedSwatch = colorSwatches.find((s) => s.color === selectedColor);
  const activeHeroImageUrl =
    activeColorImageOverride || activeGalleryItem?.imageUrl || product.images[0];

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    const colorImg = resolveExplicitColorImage(product, color);
    if (colorImg) {
      const matchedGalleryIdx = galleryItems.findIndex(
        (item) =>
          item.kind === 'image' &&
          (resolveFullResolutionImageUrl(item.imageUrl) === colorImg || item.imageUrl === colorImg)
      );
      setActiveGalleryIndex(matchedGalleryIdx >= 0 ? matchedGalleryIdx : 0);
      setActiveColorImageOverride(colorImg);
    } else {
      setActiveColorImageOverride(null);
      setActiveGalleryIndex(0);
    }

    const colorVariant = findVariantForColor(product, color);
    if (colorVariant) {
      setSelectedVariant(colorVariant);
    } else if (
      selectedVariant &&
      (selectedVariant.id.startsWith('var-color-') || Boolean(selectedVariant.color))
    ) {
      setSelectedVariant(nonColorVariants[0]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeColorImageOverride && activeGalleryItem?.kind === 'video') return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({ display: 'block', x, y });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none', x: 0, y: 0 });
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedColor, selectedVariant);
    setJustAdded(true);
    window.setTimeout(() => {
      setJustAdded(false);
    }, 1500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedColor, selectedVariant);
    setCurrentView('checkout');
  };

  const handleWhatsAppInquiry = () => {
    const cleanPhone = (storeSettings.whatsapp || '96170773067').replace(/[^\d]/g, '') || '96170773067';
    const msg = `Hello ON AlAA STORE (${storeSettings.whatsapp || '70 773 067'})! I'm inquiring about: ${fullTitle} (SKU: ${activeSku}, Price: ${pricing.formattedActivePrice}). Is it available for delivery in Lebanon?`;
    openExternalUrl(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: fullTitle,
          text: `Check out ${fullTitle} at ON AlAA STORE Lebanon for ${pricing.formattedActivePrice}!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleCategoryNavigation = () => {
    const matched = categories.find(
      (c) => c.name.toLowerCase() === product.category.toLowerCase()
    );
    if (matched) {
      selectCategory(matched.slug);
    } else {
      selectCategory(null);
      setCurrentView('products');
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewComment.trim()) return;

    const res = addProductReview(product.id, {
      userName: newReviewName.trim(),
      rating: newReviewRating,
      comment: newReviewComment.trim(),
    });

    if (res) {
      product.reviews = res.updatedProduct.reviews;
      product.reviewCount = res.updatedProduct.reviewCount;
      product.rating = res.updatedProduct.rating;
    } else {
      if (!product.reviews) product.reviews = [];
      product.reviews.unshift({
        id: `rev-${Date.now()}`,
        userName: newReviewName.trim(),
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        date: new Date().toISOString().split('T')[0],
        verifiedPurchase: true,
      });
      product.reviewCount = (product.reviewCount || 0) + 1;
    }

    setReviewSubmitted(true);
    setNewReviewName('');
    setNewReviewComment('');
  };

  const relatedProducts = products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .slice(0, 4);

  return (
    <div className="py-6 md:py-10 bg-[#FFFFFF] dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Clean Minimal Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 mb-6 overflow-x-auto whitespace-nowrap pb-1"
        >
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="hover:text-[#0070F3] cursor-pointer transition-colors"
          >
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={handleCategoryNavigation}
            className="hover:text-[#0070F3] cursor-pointer transition-colors"
          >
            {product.category}
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-[#0F172A] dark:text-slate-200 font-semibold truncate max-w-xs">
            {product.brand}
          </span>
        </nav>

        {/* Split Showcase + Contiguous Purchase Module */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start"
          data-testid="pdp-split-layout"
        >
          {/* Left Side: Vertical Thumbnail Stack + Hero Image Viewport */}
          <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-3.5 items-stretch">
            {/* Far-Left Vertical Thumbnail List (4 Square Slots) */}
            {galleryItems.length > 0 && (
              <div
                className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-visible sm:w-[76px] flex-shrink-0 pb-1 sm:pb-0"
                data-testid="pdp-thumbnail-stack"
              >
                {galleryItems.slice(0, 5).map((item, idx) => {
                  const isActive = activeGalleryIndex === idx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveGalleryIndex(idx);
                        setActiveColorImageOverride(null);
                      }}
                      aria-label={item.alt}
                      aria-pressed={isActive}
                      data-testid={`pdp-thumb-${idx}`}
                      className={`relative w-16 h-16 sm:w-[74px] sm:h-[74px] rounded-xl overflow-hidden bg-[#FFFFFF] dark:bg-[#0E1726] p-1 flex-shrink-0 cursor-pointer transition-all ${
                        !activeColorImageOverride && isActive
                          ? 'border-2 border-[#0070F3] shadow-sm'
                          : 'border border-[#E5E7EB] dark:border-[#1E293B] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <LazyImage
                        src={item.imageUrl}
                        alt={item.alt}
                        width={80}
                        height={80}
                        priority={idx === 0}
                        wrapperClassName="w-full h-full flex items-center justify-center rounded-lg overflow-hidden"
                        className="w-full h-full object-contain"
                      />
                      {item.kind === 'video' && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 bg-slate-950/35 flex items-center justify-center"
                        >
                          <span className="w-7 h-7 rounded-full bg-white/95 text-[#0F172A] shadow-md flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Centered Hero Image Container */}
            <div
              className="relative flex-1 min-h-[340px] sm:min-h-[470px] rounded-2xl bg-[#FFFFFF] dark:bg-[#0E1726] border border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-center p-6 sm:p-8 overflow-hidden shadow-xs group cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              data-testid="pdp-hero-showcase"
            >
              {!activeColorImageOverride && activeGalleryItem?.kind === 'video' && activeGalleryItem.videoUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center">
                  <div className="relative max-h-[330px] max-w-full rounded-xl overflow-hidden">
                    <LazyImage
                      src={activeGalleryItem.imageUrl}
                      alt={activeGalleryItem.alt}
                      priority={true}
                      wrapperClassName="w-full h-full flex items-center justify-center"
                      className="max-h-[320px] w-auto object-contain opacity-85"
                    />
                  </div>
                  <a
                    href={activeGalleryItem.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0070F3] hover:bg-[#0051D5] text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{lang === 'ar' ? 'مشاهدة فيديو المنتج الرسمي' : 'Watch Official Product Video'}</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              ) : (
                <>
                  <LazyImage
                    src={activeHeroImageUrl}
                    alt={`${fullTitle} - ${product.brand} authentic tech at ON AlAA STORE`}
                    priority={true}
                    data-testid="pdp-hero-image"
                    wrapperClassName="w-full h-full flex items-center justify-center"
                    className="max-h-[380px] sm:max-h-[410px] max-w-full w-auto h-auto object-contain select-none transition-all duration-200"
                    style={
                      selectedSwatch?.isLightTone && !activeColorImageOverride && activeGalleryIndex === 0
                        ? { filter: 'brightness(1.18) saturate(0.24)' }
                        : undefined
                    }
                  />

                  {zoomStyle.display === 'block' && activeHeroImageUrl && (
                    <div
                      className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden hidden md:block bg-no-repeat bg-cover z-10"
                      style={{
                        backgroundImage: `url(${resolveFullResolutionImageUrl(activeHeroImageUrl)})`,
                        backgroundPosition: `${zoomStyle.x}% ${zoomStyle.y}%`,
                        backgroundSize: '215%',
                      }}
                    />
                  )}
                </>
              )}

              {isOutOfStock && (
                <span className="absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5 z-20 px-2.5 py-1 rounded-md bg-slate-900/90 text-white text-[11px] font-bold">
                  {t.outOfStock}
                </span>
              )}

              {/* Top-Right Tiny Outline Heart Wishlist Icon Button */}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                data-testid="pdp-wishlist-btn"
                className={`absolute top-3.5 right-3.5 rtl:right-auto rtl:left-3.5 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer border shadow-xs ${
                  isFavorited
                    ? 'bg-[#DC2626] text-white border-[#DC2626]'
                    : 'bg-white/95 dark:bg-[#111A2E]/95 hover:bg-white text-[#475569] dark:text-slate-300 hover:text-[#DC2626] border-[#E5E7EB] dark:border-[#1E293B]'
                }`}
                title={lang === 'ar' ? 'إضافة للمفضلة' : 'Add to Wishlist'}
                aria-label={lang === 'ar' ? 'إضافة للمفضلة' : 'Add to Wishlist'}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Right Side: Contiguous Product Details & Purchasing Module */}
          <div
            className="lg:col-span-6 lg:sticky lg:top-24 space-y-4"
            data-testid="pdp-purchase-module"
          >
            {/* 1. Top Selling Tag (Soft Beige-Pink Pill Shape) */}
            <div>
              <button
                type="button"
                onClick={handleCategoryNavigation}
                data-testid="pdp-top-selling-pill"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2F2] dark:bg-rose-950/35 border border-[#F5D0C5] dark:border-rose-800/40 text-[#7C2D12] dark:text-rose-200 text-[11.5px] font-semibold hover:brightness-95 transition-all cursor-pointer"
              >
                <span aria-hidden="true">🏆</span>
                <span>{socialProof.topSellingLabel}</span>
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            {/* 2. Brand (Bold Dark All-Caps) + Inline Share Icon */}
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <span
                  className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#0F172A] dark:text-white"
                  data-testid="pdp-brand-label"
                >
                  {product.brand}
                </span>
                <button
                  type="button"
                  onClick={handleShare}
                  data-testid="pdp-share-btn"
                  className="w-7 h-7 rounded-full border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0E1726] text-[#64748B] hover:text-[#0070F3] flex items-center justify-center transition-colors cursor-pointer"
                  title={lang === 'ar' ? 'مشاركة' : 'Share'}
                  aria-label={lang === 'ar' ? 'مشاركة المنتج' : 'Share Product'}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                {copiedShare && (
                  <span className="text-[11px] font-semibold text-[#16A34A]">
                    {lang === 'ar' ? 'تم النسخ' : 'Copied'}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-[#94A3B8]">SKU: {activeSku}</span>
            </div>

            {/* 3. Multi-line Product Title (~20px crisp black sans-serif) */}
            <h1
              className="text-[20px] sm:text-[22px] font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-[1.35] m-0"
              data-testid="pdp-product-title"
            >
              {fullTitle}
            </h1>

            {/* 4. Social Proof Line ("100+ Sold  ★★★★★ (1 Reviews)") */}
            <div
              className="flex items-center flex-wrap gap-2.5 text-xs text-[#64748B] dark:text-slate-400 tabular-nums"
              data-testid="pdp-social-proof"
            >
              <span className="font-medium text-[#475569] dark:text-slate-300">
                {socialProof.soldText}
              </span>
              <span
                className="inline-flex items-center gap-0.5 text-[#F59E0B]"
                aria-label={`${socialProof.ratingValue} out of 5 stars`}
              >
                {[...Array(5)].map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-3.5 h-3.5 ${
                      idx < Math.round(socialProof.ratingValue)
                        ? 'fill-current'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                ))}
              </span>
              <span>{socialProof.reviewsText}</span>
            </div>

            {/* 5. Inline Pricing Row (Crossed-out $30 + Red $19 + Soft Green Save 37%) */}
            <div
              className="flex items-center flex-wrap gap-2.5 pt-1 tabular-nums"
              data-testid="pdp-pricing-row"
            >
              {pricing.formattedRegularPrice && (
                <span className="text-[15px] font-medium text-[#94A3B8] dark:text-slate-500 line-through">
                  {pricing.formattedRegularPrice}
                </span>
              )}
              <span className="text-[25px] sm:text-[28px] font-extrabold text-[#DC2626] dark:text-[#F87171] leading-none">
                {pricing.formattedActivePrice}
              </span>
              {pricing.savePercentLabel && (
                <span className="px-2.5 py-0.5 rounded-md bg-[#DCFCE7] dark:bg-emerald-950/60 border border-[#BBF7D0] dark:border-emerald-800/60 text-[#15803D] dark:text-emerald-300 text-xs font-bold">
                  {pricing.savePercentLabel}
                </span>
              )}
            </div>

            {/* 6. Quantity Adjustment Selector ("－ 1 ＋") + Prominent Blue "Add To Cart" Row */}
            <div className="flex items-center gap-3 pt-1">
              <div
                className="h-11 inline-flex items-center bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden flex-shrink-0"
                data-testid="pdp-qty-stepper"
              >
                <button
                  type="button"
                  aria-label={lang === 'ar' ? 'إنقاص الكمية' : 'Decrease quantity'}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-full flex items-center justify-center text-sm font-bold text-[#334155] dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  −
                </button>
                <span className="px-3.5 text-sm font-bold text-[#0F172A] dark:text-white min-w-[2.4rem] text-center tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label={lang === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, activeStock), q + 1))}
                  className="w-10 h-full flex items-center justify-center text-sm font-bold text-[#334155] dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                data-testid="pdp-add-to-cart-btn"
                className={`flex-1 h-11 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                  isOutOfStock
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                    : justAdded
                    ? 'bg-[#16A34A] text-white'
                    : 'bg-[#0070F3] hover:bg-[#0051D5] text-white shadow-[#0070F3]/20'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{lang === 'ar' ? 'تمت الإضافة للسلة' : 'Added to Cart'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'أضف إلى السلة' : 'Add To Cart'}</span>
                  </>
                )}
              </button>
            </div>

            {isOutOfStock && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#DC2626] dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{t.outOfStock}</span>
                </div>
                <NotifyMeControl product={product} lang={lang} variant="panel" />
              </div>
            )}

            {/* 7. Color Selection Swatches with Miniature Thumbnails ("color" -> Black $19 / Silver $19) */}
            {colorSwatches.length > 0 && (
              <div className="pt-1 space-y-2" data-testid="pdp-color-swatches">
                <span className="block text-xs font-semibold text-[#64748B] dark:text-slate-400">
                  {lang === 'ar' ? 'اختر اللون:' : 'Choose Color:'}{' '}
                  {selectedColor && (
                    <span className="font-bold text-[#0070F3]" data-testid="pdp-active-color-label">
                      ({selectedColor})
                    </span>
                  )}
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {colorSwatches.map((swatch) => {
                    const isSelected = selectedColor === swatch.color;
                    return (
                      <button
                        key={swatch.color}
                        type="button"
                        onClick={() => handleSelectColor(swatch.color)}
                        aria-pressed={isSelected}
                        data-testid={`pdp-color-swatch-${swatch.color}`}
                        className={`flex flex-col items-center p-1.5 rounded-xl min-w-[80px] transition-all cursor-pointer ${
                          isSelected
                            ? 'border-2 border-[#0070F3] bg-[#F5F9FF] dark:bg-[#111A2E] shadow-xs'
                            : 'border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0E1726] hover:border-[#94A3B8]'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden p-1">
                          {swatch.thumbnailUrl && (
                            <img
                              src={resolveFullResolutionImageUrl(swatch.thumbnailUrl)}
                              alt={`${rawTitle} - ${swatch.color}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                              style={
                                swatch.isLightTone
                                  ? { filter: 'brightness(1.22) saturate(0.22)' }
                                  : undefined
                              }
                            />
                          )}
                        </div>
                        <span className="mt-1 text-[11px] font-semibold text-[#0F172A] dark:text-slate-100 leading-tight">
                          {swatch.color}
                        </span>
                        <span className="text-[10.5px] font-bold text-[#64748B] dark:text-slate-400 tabular-nums">
                          {swatch.formattedPrice}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variants Selector (Non-Color configurations such as Storage Tiers) */}
            {nonColorVariants.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400 block">
                  {lang === 'ar' ? 'السعة / الفئة' : 'Configuration / Edition'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {nonColorVariants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-2.5 rounded-xl text-left rtl:text-right border transition-all cursor-pointer ${
                        selectedVariant?.id === v.id
                          ? 'bg-[#F5F9FF] dark:bg-[#111A2E] border-2 border-[#0070F3] text-[#0070F3] dark:text-[#38BDF8]'
                          : 'bg-white dark:bg-[#0E1726] border border-[#E2E8F0] dark:border-[#1E293B] text-[#172033] dark:text-slate-200 hover:border-[#0070F3]'
                      }`}
                    >
                      <span className="block text-xs font-bold">{v.name}</span>
                      <span className="block text-xs font-extrabold mt-0.5 tabular-nums">${v.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary Quick Conversion Utilities (Buy Now, WhatsApp 70773067, Compare) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-slate-100 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Zap3DIcon size={14} />
                <span>{t.buyNow}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppInquiry}
                className="px-3.5 py-2 rounded-lg bg-[#ECFDF5] dark:bg-emerald-950/35 hover:brightness-95 border border-[#A7F3D0] dark:border-emerald-800/50 text-xs font-bold text-[#065F46] dark:text-emerald-300 inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <WhatsApp3DIcon size={16} />
                <span>{lang === 'ar' ? 'واتساب 70773067' : 'WhatsApp 70773067'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isInCompare(product.id)) {
                    removeFromCompare(product.id);
                  } else {
                    const res = addToCompare(product);
                    if (res.success) {
                      setIsCompareModalOpen(true);
                    }
                  }
                }}
                className={`px-3.5 py-2 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isInCompare(product.id)
                    ? 'bg-[#0070F3] text-white border-[#0070F3]'
                    : 'bg-[#F8FAFC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] border-[#E2E8F0] dark:border-[#1E293B] text-[#475569] dark:text-slate-300'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'مقارنة' : 'Compare'}</span>
              </button>
            </div>

            {/* 8. Service Features / Badges Row (Light Red Accent Icons) */}
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B]"
              data-testid="pdp-service-badges"
            >
              {serviceFeatures.map((feat) => (
                <div
                  key={feat.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FFF8F8] dark:bg-rose-950/20 border border-[#FEE2E2] dark:border-rose-900/40"
                >
                  <span className="w-7 h-7 rounded-lg bg-[#FEE2E2] dark:bg-rose-900/50 text-[#DC2626] dark:text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {feat.id === 'express' ? (
                      <Truck className="w-3.5 h-3.5" />
                    ) : feat.id === 'returns' ? (
                      <RotateCcw className="w-3.5 h-3.5" />
                    ) : (
                      <PackageCheck className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[11.5px] font-bold text-[#991B1B] dark:text-rose-200 leading-tight">
                      {feat.title}
                    </span>
                    <span className="block text-[10px] text-[#7F1D1D]/75 dark:text-slate-400 leading-snug mt-0.5">
                      {feat.subtitle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Full-Width Yellow-Gold Offer Ribbon Directly Under Showcase */}
        <div
          className="mt-10 oaa-offer-banner rounded-xl shadow-xs"
          data-testid="pdp-bottom-offer-strip"
        >
          {lang === 'ar' ? 'خصومات حصرية تصل حتى 40%' : 'UP TO 40% OFF'}
        </div>

        {/* Technical Specifications, Overview & Customer Reviews */}
        <div className="mt-10 pt-8 border-t border-[#E5E7EB] dark:border-[#1E293B] space-y-12">
          {/* Overview */}
          <div className="space-y-4 max-w-4xl">
            <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0070F3]" />
              <span>{lang === 'ar' ? 'تفاصيل ومميزات المنتج' : 'Product Overview'}</span>
            </h3>
            <p className="text-[#64748B] dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {lang === 'ar' ? product.descriptionAr || product.description : product.description}
            </p>
          </div>

          {/* Full Technical Specifications Custom Table */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {lang === 'ar' ? 'المواصفات الفنية الكاملة' : 'Full Technical Specifications'}
              </h3>
              <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#1E293B] overflow-hidden bg-white dark:bg-[#0E1726] shadow-xs">
                <table className="w-full text-left rtl:text-right text-xs">
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
                    {product.specifications.map((spec, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC] dark:hover:bg-[#111A2E] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#64748B] dark:text-slate-400 w-1/3 sm:w-1/4 bg-[#F8FAFC] dark:bg-[#111A2E]">
                          {spec.label}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-slate-100">
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customer Reviews Section */}
          <div className="space-y-6 pt-6 border-t border-[#E5E7EB] dark:border-[#1E293B]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t.customerReviews}</h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                  {lang === 'ar'
                    ? `تقييمات واقعية وموثقة من عملاء ${storeSettings.storeNameAr || 'ON AlAA STORE'}.`
                    : 'Authentic customer feedback from verified buyers across Lebanon.'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/50">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold text-sm text-[#0F172A] dark:text-white tabular-nums">
                  {product.rating} / 5
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#E5E7EB] dark:border-[#1E293B] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A] dark:text-white text-xs">{rev.userName}</span>
                      <span className="text-[10px] text-[#64748B] dark:text-slate-400">{rev.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < rev.rating ? 'fill-current' : 'text-slate-300 dark:text-slate-600'}`}
                        />
                      ))}
                      {rev.verifiedPurchase && (
                        <span className="text-[10px] text-[#16A34A] dark:text-emerald-400 ml-2 font-semibold">
                          ✓ {lang === 'ar' ? 'شراء مؤكد' : 'Verified Buyer'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-slate-300 leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              ) : (
                <div className="md:col-span-2 text-center py-8 text-xs text-[#64748B] dark:text-slate-400 bg-[#F8FAFC] dark:bg-[#0E1726] rounded-2xl border border-dashed border-[#E2E8F0] dark:border-[#1E293B] p-6 space-y-1">
                  <p className="font-bold text-sm text-[#0F172A] dark:text-white">
                    {lang === 'ar' ? 'لا توجد تقييمات سابقة لهذا المنتج' : 'No customer reviews yet'}
                  </p>
                  <p>
                    {lang === 'ar'
                      ? 'كن أول من يشاركنا تقييمه وتجربته مع هذا الجهاز الأصلي!'
                      : 'Be the first to review and share your feedback on this genuine product!'}
                  </p>
                </div>
              )}
            </div>

            {/* Write a Review Form */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1726] border border-[#E5E7EB] dark:border-[#1E293B] max-w-xl shadow-xs">
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-white mb-3">{t.writeReview}</h4>
              {reviewSubmitted ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[#16A34A] dark:text-emerald-300 text-xs font-semibold">
                  {lang === 'ar' ? 'شكراً لك! تم إضافة تقييمك بنجاح.' : 'Thank you! Your verified review has been posted.'}
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs text-[#0F172A] dark:text-slate-200 block mb-1 font-semibold">
                      {t.fullName}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fadi S."
                      value={newReviewName}
                      onChange={(e) => setNewReviewName(e.target.value)}
                      className="w-full bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0070F3]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#0F172A] dark:text-slate-200 block mb-1 font-semibold">
                      {lang === 'ar' ? 'التقييم:' : 'Rating:'}
                    </label>
                    <select
                      value={newReviewRating}
                      onChange={(e) => setNewReviewRating(Number(e.target.value))}
                      className="w-full bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0070F3]"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ 5/5</option>
                      <option value={4}>⭐⭐⭐⭐ 4/5</option>
                      <option value={3}>⭐⭐⭐ 3/5</option>
                      <option value={2}>⭐⭐ 2/5</option>
                      <option value={1}>⭐ 1/5</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#0F172A] dark:text-slate-200 block mb-1 font-semibold">
                      {lang === 'ar' ? 'رأيك بالمنتج:' : 'Your Feedback:'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder={
                        lang === 'ar'
                          ? 'صف تجربتك مع الجهاز وسرعة التوصيل...'
                          : 'Describe device performance and build quality...'
                      }
                      className="w-full bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0070F3]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#0070F3] hover:bg-[#0051D5] text-white font-bold text-xs cursor-pointer shadow-sm shadow-[#0070F3]/25"
                  >
                    {lang === 'ar' ? 'نشر التقييم' : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="pt-10 border-t border-[#E5E7EB] dark:border-[#1E293B]">
              <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-6">{t.relatedProducts}</h3>
              <div className="oaa-product-grid">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} layout="grid" />
                ))}
              </div>
            </div>
          )}

          {/* Recently Viewed Products Carousel */}
          <RecentlyViewedCarousel excludeProductId={product.id} />
        </div>
      </div>
    </div>
  );
};

