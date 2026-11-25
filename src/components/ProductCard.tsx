import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useShop } from '../context/ShopContext';
import {
  Heart,
  Star,
  Scale,
  Share2,
  Eye,
  ShoppingCart,
  Truck,
  Check,
  Package,
  X,
} from 'lucide-react';
import { LazyImage } from './LazyImage';
import { openExternalUrl } from '../utils/navigation';
import { ReactBitsPicture } from './animations/ReactBitsPicture';
import {
  buildOfferBannerLabel,
  buildProductCardViewModel,
} from '../utils/productCardHelpers';
import { getWishlistButtonCopy } from '../utils/wishlistHelpers';
import { resolveDefaultCartSelection } from '../utils/checkoutHelpers';
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
  showOfferDetails = false,
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
    viewProductDetail,
    storeSettings,
  } = useShop();

  const isFavorited = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const vm = buildProductCardViewModel(product, lang, storeSettings.whatsapp);
  const offerBannerLabel = buildOfferBannerLabel(product, showOfferDetails, lang);

  const handleOpenQuickModal = () => {
    setQuickViewProduct(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vm.isOutOfStock) return;
    const defaults = resolveDefaultCartSelection(product);
    addToCart(
      product,
      1,
      defaults.selectedColor,
      defaults.selectedVariant,
      defaults.selectedColorImage,
      defaults.colorPriceAdjustment
    );
    setJustAdded(true);
    window.setTimeout(() => {
      setJustAdded(false);
    }, 1200);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const wishlistCopy = getWishlistButtonCopy(isFavorited, lang, vm.displayTitle);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <motion.article
      data-testid={testId}
      data-product-id={product.id}
      whileHover={{ y: -3, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.99, transition: { duration: 0.1 } }}
      onClick={handleOpenQuickModal}
      className={`group oaa-product-card ${layout === 'column' ? 'oaa-product-card--column' : ''}`}
    >
      {/* Top Visual Media + Full-Width Offer Banner Block */}
      <div className="oaa-card-media-wrap">
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

          {vm.isOutOfStock && (
            <span className="oaa-stock-corner-pill">
              {lang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}
            </span>
          )}

          {/* Top-Right 30x30 Utility Action Stack */}
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

            <div className="oaa-compare-wrap">
              <button
                type="button"
                data-testid={`product-wishlist-btn-${product.id}`}
                onClick={handleWishlist}
                className={`oaa-action-btn ${isFavorited ? 'oaa-action-btn--wish-active' : ''}`}
                title={wishlistCopy.label}
                aria-label={wishlistCopy.ariaLabel}
                aria-pressed={isFavorited}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current text-white' : ''}`} />
              </button>
              <span
                role="tooltip"
                data-testid={`product-wishlist-tooltip-${product.id}`}
                className="oaa-compare-tooltip"
              >
                {wishlistCopy.label}
              </span>
            </div>

            <div className="oaa-compare-wrap">
              <button
                type="button"
                data-testid={`product-compare-btn-${product.id}`}
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
                    ? 'إضافة إلى المقارنة'
                    : 'Add to Compare'
                }
                aria-label={
                  isCompared
                    ? lang === 'ar'
                      ? 'إزالة من المقارنة'
                      : 'Remove from Compare'
                    : lang === 'ar'
                    ? 'إضافة إلى المقارنة'
                    : 'Add to Compare'
                }
              >
                <Scale className="w-3.5 h-3.5" />
              </button>
              <span
                role="tooltip"
                data-testid={`product-compare-tooltip-${product.id}`}
                className="oaa-compare-tooltip"
              >
                {isCompared
                  ? lang === 'ar'
                    ? 'إزالة من المقارنة'
                    : 'Remove from Compare'
                  : lang === 'ar'
                  ? 'إضافة إلى المقارنة'
                  : 'Add to Compare'}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.share) {
                  navigator
                    .share({
                      title: vm.displayTitle,
                      text: `${vm.displayTitle} at ON ALAA STORE - ${vm.pricing.formattedSalePrice} USD`,
                      url: `${window.location.origin}?product=${product.id}`,
                    })
                    .catch(() => {});
                } else {
                  const shareText = `Check out ${vm.displayTitle} (${vm.pricing.formattedSalePrice} USD) at ON ALAA STORE (Chouf • All Lebanon Delivery): ${window.location.origin}?product=${product.id}`;
                  openExternalUrl(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
                }
              }}
              className="oaa-action-btn"
              title={lang === 'ar' ? 'مشاركة المنتج' : 'Share Product'}
              aria-label={lang === 'ar' ? 'مشاركة المنتج' : 'Share Product'}
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hover Quick View Trigger */}
          <button
            type="button"
            onClick={handleQuickView}
            className="quick-view-eye-overlay absolute inset-0 m-auto w-9 h-9 rounded-full bg-white/95 dark:bg-[#0E1726]/95 hover:bg-[#0070F3] hover:text-white text-[#0F172A] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B] shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 cursor-pointer transform scale-90 group-hover:scale-100"
            title={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
            aria-label={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Full-Width Light Yellow-Gold Offer Banner Directly Below Product Image */}
        {offerBannerLabel ? (
          <div
            className="oaa-offer-banner"
            data-testid={`product-offer-banner-${product.id}`}
          >
            {offerBannerLabel}
          </div>
        ) : (
          <div className="oaa-media-hairline" aria-hidden="true" />
        )}
      </div>

      {/* Equal-Height Content Body */}
      <div className="oaa-card-body">
        {/* 1. Product Title & Brand (Clean 2-line sans-serif) */}
        <h3 className="oaa-title">
          <a
            href={`#/product/${product.id}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              viewProductDetail(product.id, false);
            }}
            className="hover:text-[#0070F3] dark:hover:text-[#38BDF8] hover:underline focus:outline-none"
            title={`${vm.displayTitle} ${vm.brandLabel}`}
          >
            <span>{vm.displayTitle}</span>{' '}
            <span className="oaa-title-brand">{vm.brandLabel}</span>
          </a>
        </h3>

        {/* 2. Price & Discount (Left) + Star Rating & Sold Social Proof (Bottom-Right) */}
        <div className="oaa-pricing-split">
          <div className="oaa-price-col">
            <div className="oaa-price-top-row">
              <span
                className="oaa-sale-price-red"
                data-testid={`product-sale-price-${product.id}`}
              >
                {vm.pricing.formattedSalePrice}
              </span>
              {vm.pricing.discountPercent > 0 && (
                <span
                  className="oaa-discount-tag"
                  data-testid={`product-discount-tag-${product.id}`}
                >
                  -{vm.pricing.discountPercent}%
                </span>
              )}
            </div>

            {vm.pricing.formattedRegularPrice && (
              <span
                className="oaa-regular-price-strike"
                data-testid={`product-original-price-${product.id}`}
              >
                {vm.pricing.formattedRegularPrice}
              </span>
            )}
          </div>

          <div className="oaa-proof-col">
            <span className="oaa-proof-rating">
              <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B] shrink-0" />
              <span>{vm.ratingDecimal}</span>
              <span className="oaa-proof-reviews">({vm.reviewCount})</span>
            </span>
            <span className="oaa-proof-sold">{vm.soldLabel}</span>
          </div>
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

        {vm.isOutOfStock && (
          <div className="mt-2.5">
            <NotifyMeControl product={product} lang={lang} variant="compact" />
          </div>
        )}

        {/* 3. Footer Action Items: Red "express" Badge (Far Left) + Faint Square Cart Button (Bottom-Right) */}
        <div className="oaa-card-footer-bar">
          <span
            className="oaa-express-badge"
            data-testid={`product-express-badge-${product.id}`}
          >
            <Truck className="w-3 h-3 text-white shrink-0 stroke-[2.25]" />
            <span>{lang === 'ar' ? 'إكسبرس' : 'express'}</span>
          </span>

          <button
            type="button"
            disabled={vm.isOutOfStock}
            onClick={handleAddToCart}
            data-testid={`product-cart-btn-${product.id}`}
            className={`oaa-cart-square-btn ${justAdded ? 'oaa-cart-square-btn--added' : ''}`}
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
                ? 'أضف إلى السلة'
                : 'Add to Cart'
            }
            aria-label={
              vm.isOutOfStock
                ? lang === 'ar'
                  ? `${vm.displayTitle} نفدت الكمية`
                  : `${vm.displayTitle} Out of Stock`
                : lang === 'ar'
                ? `أضف ${vm.displayTitle} إلى السلة`
                : `Add ${vm.displayTitle} to Cart`
            }
          >
            {justAdded ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ShoppingCart className="w-4 h-4 stroke-[1.9]" />
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
};

