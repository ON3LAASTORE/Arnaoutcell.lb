import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useShop } from '../context/ShopContext';
import {
  Heart,
  Shield,
  Star,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Scale,
  Share2,
  Flame,
  Eye,
  TrendingDown,
  ShoppingBag,
  Check,
  Package,
  X,
} from 'lucide-react';
import { WhatsApp3DIcon, Cart3DIcon, Zap3DIcon } from './icons/ThreeDIcons';
import { LazyImage } from './LazyImage';
import { openExternalUrl } from '../utils/navigation';
import { ReactBitsPicture } from './animations/ReactBitsPicture';
import { getProductBadges } from '../utils/productBadgeHelpers';
import { buildProductCardViewModel } from '../utils/productCardHelpers';
import { NotifyMeControl } from './NotifyMeControl';

interface ProductCardProps {
  product: Product;
  layout?: 'grid' | 'column' | 'horizontal';
  showOfferDetails?: boolean;
  priority?: boolean;
  testId?: string;
  onRemove?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  layout = 'grid',
  priority = false,
  testId = 'product-card',
  onRemove,
}) => {
  const {
    lang,
    addToCart,
    setQuickViewProduct,
    toggleWishlist,
    isInWishlist,
    isInCompare,
    addToCompare,
    removeFromCompare,
    setCurrentView,
    viewProductDetail,
    storeSettings,
  } = useShop();

  const isFavorited = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const vm = buildProductCardViewModel(product, lang, storeSettings.whatsapp);
  const badges = getProductBadges(product, lang);

  const handleOpenQuickModal = () => {
    setQuickViewProduct(product);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vm.isOutOfStock) return;
    addToCart(product, 1);
    setCurrentView('checkout');
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vm.isOutOfStock) return;
    addToCart(product, 1);
    setJustAdded(true);
    window.setTimeout(() => {
      setJustAdded(false);
    }, 1200);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleWhatsAppInquiry = (e: React.MouseEvent) => {
    e.stopPropagation();
    openExternalUrl(vm.whatsappUrl);
  };

  return (
    <motion.article
      data-testid={testId}
      data-product-id={product.id}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.985, transition: { duration: 0.1 } }}
      onClick={handleOpenQuickModal}
      className={`group oaa-product-card ${layout === 'column' ? 'oaa-product-card--column' : ''}`}
    >
      {/* Standardized 1:1 Image Frame & Dynamic Overlays */}
      <div className="oaa-card-media">
        {!hasImageError && (
          <div
            aria-hidden="true"
            className={`product-card-skeleton absolute inset-3 rounded-xl pointer-events-none transition-opacity duration-300 z-0 ${
              isImageLoaded ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}

        <ReactBitsPicture
          maxTilt={4}
          scaleOnHover={1.015}
          showSpotlight={false}
          className="w-full h-full flex items-center justify-center relative z-[1]"
        >
          {!hasImageError && product.images?.[0] ? (
            <LazyImage
              src={product.images[0]}
              alt={`${vm.displayTitle} - ${product.brand} authentic tech in Lebanon`}
              width={800}
              height={800}
              responsiveSizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              rootMargin="0px"
              onLoaded={() => setIsImageLoaded(true)}
              onError={() => {
                setHasImageError(true);
                setIsImageLoaded(true);
              }}
              wrapperClassName="w-full h-full flex items-center justify-center"
              className="oaa-card-img"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#64748B] dark:text-slate-400">
              <Package className="w-9 h-9 opacity-60" />
              <span className="text-[11px] font-bold uppercase tracking-wider truncate max-w-full px-2">
                {vm.brandLabel}
              </span>
            </div>
          )}
        </ReactBitsPicture>

        {/* Top-Left Dynamic Stacked Badges (-% OFF, NEW, BESTSELLER, Stock) */}
        {badges.length > 0 && (
          <div className="oaa-badge-stack">
            {badges.map((badge) => {
              if (badge.id === 'discount') {
                return (
                  <span key={badge.id} className="oaa-pill-badge oaa-pill-badge--red">
                    {badge.label}
                  </span>
                );
              }
              if (badge.id === 'new') {
                return (
                  <span key={badge.id} className="oaa-pill-badge oaa-pill-badge--blue">
                    <Sparkles className="w-2.5 h-2.5 shrink-0" />
                    <span>{badge.label}</span>
                  </span>
                );
              }
              if (badge.id === 'bestseller') {
                return (
                  <span key={badge.id} className="oaa-pill-badge oaa-pill-badge--gold">
                    <Flame className="w-2.5 h-2.5 shrink-0 fill-current" />
                    <span>{badge.label}</span>
                  </span>
                );
              }
              if (badge.id === 'low_stock') {
                return (
                  <span key={badge.id} className="oaa-pill-badge oaa-pill-badge--amber">
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    <span>{badge.label}</span>
                  </span>
                );
              }
              if (badge.id === 'out_of_stock') {
                return (
                  <span key={badge.id} className="oaa-pill-badge oaa-pill-badge--slate">
                    {badge.label}
                  </span>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Bottom-Left PRICE DROP Pill */}
        {vm.pricing.isDiscounted && (
          <span
            className="oaa-price-drop"
            title={lang === 'ar' ? 'تخفيض السعر' : 'Price Drop'}
          >
            <TrendingDown className="w-2.5 h-2.5 stroke-[2.5] shrink-0" />
            <span>{lang === 'ar' ? 'تخفيض السعر' : 'PRICE DROP'}</span>
          </span>
        )}

        {/* Top-Right 32x32 Rounded-Square Action Stack */}
        <div className="oaa-action-stack">
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="oaa-action-btn hover:text-rose-600"
              title={lang === 'ar' ? 'إزالة من القائمة' : 'Remove item'}
              aria-label={
                lang === 'ar'
                  ? `إزالة ${vm.displayTitle} من المشاهدة مؤخراً`
                  : `Remove ${vm.displayTitle} from recently viewed`
              }
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleWishlist}
            className={`oaa-action-btn ${isFavorited ? 'oaa-action-btn--wish-active' : ''}`}
            title={lang === 'ar' ? 'إضافة للمفضلة' : 'Add to Wishlist'}
            aria-label={lang === 'ar' ? 'إضافة للمفضلة' : 'Add to Wishlist'}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current text-white' : ''}`} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isCompared) {
                removeFromCompare(product.id);
              } else {
                addToCompare(product);
              }
            }}
            className={`oaa-action-btn ${isCompared ? 'oaa-action-btn--compare-active' : ''}`}
            title={
              isCompared
                ? lang === 'ar'
                  ? 'إزالة من المقارنة'
                  : 'Remove from Compare'
                : lang === 'ar'
                ? 'إضافة إلى المقارنة (3 كحد أقصى)'
                : 'Compare Product'
            }
            aria-label={lang === 'ar' ? 'مقارنة المنتج' : 'Compare Product'}
          >
            <Scale className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.share) {
                navigator
                  .share({
                    title: vm.displayTitle,
                    text: `${vm.displayTitle} at ON AlAA STORE - ${vm.pricing.formattedSalePrice} USD`,
                    url: `${window.location.origin}?product=${product.id}`,
                  })
                  .catch(() => {});
              } else {
                const shareText = `Check out ${vm.displayTitle} (${vm.pricing.formattedSalePrice} USD) at ON AlAA STORE (Chouf • All Lebanon Delivery): ${window.location.origin}?product=${product.id}`;
                openExternalUrl(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
              }
            }}
            className="oaa-action-btn"
            title={lang === 'ar' ? 'مشاركة المنتج' : 'Share Product'}
            aria-label={lang === 'ar' ? 'مشاركة المنتج' : 'Share Product'}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Hover Quick View Trigger */}
        <button
          type="button"
          onClick={handleQuickView}
          className="quick-view-eye-overlay absolute inset-0 m-auto w-10 h-10 rounded-full bg-white/95 dark:bg-[#0E1726]/95 hover:bg-[#0070F3] hover:text-white text-[#0F172A] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B] shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 cursor-pointer transform scale-90 group-hover:scale-100"
          title={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
          aria-label={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
        >
          <Eye className="w-4.5 h-4.5" />
        </button>

        {/* Bottom-Right Quick Add Bag Icon on Image Hover */}
        <button
          type="button"
          disabled={vm.isOutOfStock}
          onClick={handleAddToCart}
          className={`quick-add-cart-btn absolute bottom-2.5 right-2.5 rtl:right-auto rtl:left-2.5 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 ${
            vm.isOutOfStock
              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              : justAdded
              ? 'bg-[#16A34A] text-white cursor-pointer'
              : 'bg-[#0070F3] hover:bg-[#0051D5] text-white cursor-pointer'
          }`}
          title={
            vm.isOutOfStock
              ? lang === 'ar'
                ? 'نفدت الكمية'
                : 'Out of Stock'
              : justAdded
              ? lang === 'ar'
                ? 'تمت الإضافة للسلة!'
                : 'Added to Cart!'
              : lang === 'ar'
              ? 'إضافة سريعة إلى السلة'
              : 'Quick Add to Cart'
          }
          aria-label={lang === 'ar' ? 'إضافة سريعة إلى السلة' : 'Quick Add to Cart'}
        >
          {justAdded ? <Check className="w-4 h-4 stroke-[2.5]" /> : <ShoppingBag className="w-4 h-4" />}
        </button>
      </div>

      {/* Equal-Height Content Hierarchy */}
      <div className="oaa-card-body">
        <div>
          {/* 1. Brand & Availability Row */}
          <div className="oaa-meta-row">
            <span className="oaa-brand">{vm.brandLabel}</span>

            {vm.isOutOfStock ? (
              <span className="oaa-stock-status text-[#DC2626] dark:text-red-400">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{lang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}</span>
              </span>
            ) : vm.isLowStock ? (
              <span className="oaa-stock-status text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{lang === 'ar' ? `باقي ${product.stock} فقط` : `Only ${product.stock} left`}</span>
              </span>
            ) : (
              <span className="oaa-stock-status text-[#16A34A] dark:text-emerald-400">
                <CheckCircle className="w-3 h-3 shrink-0" />
                <span>{lang === 'ar' ? 'متوفر' : 'In Stock'}</span>
              </span>
            )}
          </div>

          {/* 2. Fixed 2-Line Clamped Product Title */}
          <h3 className="oaa-title">
            <a
              href={`#/product/${product.id}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                viewProductDetail(product.id, false);
              }}
              className="hover:text-[#0070F3] dark:hover:text-[#38BDF8] hover:underline focus:outline-none"
              title={`${vm.displayTitle} - ${product.brand} Lebanon`}
            >
              {vm.displayTitle}
            </a>
          </h3>

          {/* 3. Trust & Rating Row */}
          <div className="oaa-rating-row">
            <div className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
              <span className="font-bold text-[#0F172A] dark:text-slate-200">{vm.ratingValue}</span>
              <span>({vm.reviewCount})</span>
            </div>

            {vm.warrantyMonths > 0 && (
              <div className="inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#0070F3] dark:text-[#38BDF8] shrink-0" />
                <span>
                  {vm.warrantyMonths} {lang === 'ar' ? 'شهراً كفالة' : 'Mo. Warranty'}
                </span>
              </div>
            )}
          </div>

          {/* Optional Specs in List/Column Mode */}
          {layout === 'column' && product.specifications && product.specifications.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {product.specifications.slice(0, 3).map((spec, i) => (
                <span
                  key={i}
                  className="text-[11px] text-[#64748B] dark:text-slate-300"
                >
                  {spec.label}: <strong className="text-[#0F172A] dark:text-white">{spec.value}</strong>
                  {i < Math.min(product.specifications.length, 3) - 1 ? ' · ' : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Divider, 5. Pricing & Delivery Strip, and 6. 2-Tier Conversion Button System pinned to bottom */}
        <div className="oaa-card-footer">
          <div className="oaa-divider" />

          <div className="oaa-pricing-block">
            <div>
              <div className="oaa-price-row">
                <span className="oaa-sale-price">{vm.pricing.formattedSalePrice}</span>
                {vm.pricing.formattedRegularPrice && (
                  <span className="oaa-regular-price">{vm.pricing.formattedRegularPrice}</span>
                )}
              </div>
              {vm.pricing.formattedSavings && (
                <span className="oaa-savings-line">
                  {lang === 'ar'
                    ? `وفرت ${vm.pricing.formattedSavings}`
                    : `Save ${vm.pricing.formattedSavings} USD`}
                </span>
              )}
            </div>

            <span className="oaa-delivery-tag">
              {lang === 'ar' ? 'الشوف • كل لبنان' : 'CHOUF • ALL LEBANON'}
            </span>
          </div>

          {/* Top Conversion Row: 50% / 50% Pack It + Direct Order */}
          <div className="oaa-cta-row">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={vm.isOutOfStock}
              className="oaa-btn-pack"
            >
              <span className="oaa-cta-icon max-[459px]:hidden shrink-0 inline-flex items-center">
                {justAdded ? (
                  <Check className="w-3.5 h-3.5 text-[#16A34A] stroke-[2.5] shrink-0" />
                ) : (
                  <Cart3DIcon size={15} />
                )}
              </span>
              <span className="truncate">
                {justAdded
                  ? lang === 'ar'
                    ? 'تمت الإضافة'
                    : 'Added'
                  : lang === 'ar'
                  ? 'أضف للسلة'
                  : 'Pack It'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={vm.isOutOfStock}
              className="oaa-btn-direct"
            >
              <span className="oaa-cta-icon max-[459px]:hidden shrink-0 inline-flex items-center">
                <Zap3DIcon size={15} />
              </span>
              <span className="truncate">{lang === 'ar' ? 'طلب فوري' : 'Direct Order'}</span>
            </button>
          </div>

          {vm.isOutOfStock && (
            <div className="mt-2">
              <NotifyMeControl product={product} lang={lang} variant="compact" />
            </div>
          )}

          {/* Bottom Full-Width Dynamic WhatsApp Quick-Order CTA */}
          <button
            type="button"
            onClick={handleWhatsAppInquiry}
            className="oaa-btn-whatsapp"
          >
            <WhatsApp3DIcon size={17} />
            <span className="truncate">
              {lang === 'ar' ? 'واتساب 70773067' : 'WhatsApp 70773067'}
            </span>
          </button>
        </div>
      </div>
    </motion.article>
  );
};
