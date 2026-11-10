import React from 'react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useShop } from '../context/ShopContext';
import { Heart, Shield, Star, CheckCircle, AlertTriangle, Sparkles, Scale, Share2, Flame } from 'lucide-react';
import { WhatsApp3DIcon, Cart3DIcon, Zap3DIcon, Orbit3DIcon } from './icons/ThreeDIcons';
import { LazyImage } from './LazyImage';
import { openExternalUrl } from '../utils/navigation';
import { ReactBitsPicture } from './animations/ReactBitsPicture';
import { getProductBadges } from '../utils/productBadgeHelpers';

interface ProductCardProps {
  product: Product;
  layout?: 'grid' | 'column' | 'horizontal';
  showOfferDetails?: boolean;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  layout = 'grid',
  showOfferDetails = true,
  priority = false,
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
  const discountAmount = product.originalPrice > product.price ? product.originalPrice - product.price : 0;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold || 3);
  const badges = getProductBadges(product, lang);

  const handleOpen3DModal = () => {
    setQuickViewProduct(product);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
    setCurrentView('checkout');
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
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
    const phone = storeSettings.whatsapp || '96181900916';
    const text = encodeURIComponent(
      lang === 'ar'
        ? `مرحباً أرناؤوط ستور! أود الاستفسار والطلب الفوري للمنتج:\n- ${product.nameAr || product.name}\n- السعر: $${product.price}\n- الكود: ${product.id}\nالرجاء تأكيد التوفر والتوصيل.`
        : `Hello ARNAOUT STORE! I would like to inquire / order this product:\n- ${product.name}\n- Price: $${product.price} USD\n- SKU: ${product.id}\nPlease confirm availability and delivery.`
    );
    openExternalUrl(`https://wa.me/${phone}?text=${text}`);
  };

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
      onClick={handleOpen3DModal}
      className={`group relative rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] dark:hover:border-[#38BDF8] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_16px_36px_-6px_rgba(0,122,255,0.18)] transition-all duration-300 flex cursor-pointer overflow-hidden ${
        layout === 'column'
          ? 'flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 items-center'
          : 'flex-col p-2.5 sm:p-4'
      }`}
    >
      {/* Product Image Area */}
      <div
        className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#F5F8FC] to-[#EEF5FF] dark:from-[#070C16] dark:to-[#0F172A] border border-[#DCE5F0]/80 dark:border-[#1E293B] flex-shrink-0 flex items-center justify-center p-2 sm:p-3 ${
          layout === 'column' ? 'w-full sm:w-44 h-40 sm:h-44' : 'w-full h-36 sm:h-52'
        }`}
      >
        <ReactBitsPicture
          maxTilt={7}
          scaleOnHover={1.03}
          showSpotlight={true}
          className="w-full h-full flex items-center justify-center"
        >
          <LazyImage
            src={product.images[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=600&auto=format&fit=crop&q=80'}
            alt={`${product.name} - ${product.brand} authentic tech in Lebanon`}
            width={350}
            height={350}
            priority={priority}
            wrapperClassName="w-full h-full flex items-center justify-center"
            className="w-full h-full object-contain object-center group-hover:scale-108 transition-transform duration-500"
          />
        </ReactBitsPicture>

        {/* Badges Overlay (New, Bestseller, Low Stock, Discount) */}
        <div className="absolute top-2 left-2 rtl:right-2 rtl:left-auto sm:top-2.5 sm:left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
          {badges.map((badge) => {
            if (badge.id === 'discount') {
              return (
                <span
                  key={badge.id}
                  className="px-2 py-0.5 rounded-md sm:rounded-lg bg-[#DC2626] text-white font-black text-[10px] sm:text-[11px] shadow-sm shadow-[#DC2626]/20"
                >
                  {badge.label}
                </span>
              );
            }
            if (badge.id === 'new') {
              return (
                <span
                  key={badge.id}
                  className="px-2 py-0.5 rounded-md sm:rounded-lg bg-[#007AFF] text-white font-bold text-[9px] sm:text-[10px] shadow-sm shadow-[#007AFF]/25 flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {badge.label}
                </span>
              );
            }
            if (badge.id === 'bestseller') {
              return (
                <span
                  key={badge.id}
                  className="px-2 py-0.5 rounded-md sm:rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] sm:text-[10px] shadow-sm shadow-amber-500/25 flex items-center gap-1"
                >
                  <Flame className="w-2.5 h-2.5 fill-current" />
                  {badge.label}
                </span>
              );
            }
            if (badge.id === 'low_stock') {
              return (
                <span
                  key={badge.id}
                  className="px-2 py-0.5 rounded-md sm:rounded-lg bg-amber-500 text-white font-bold text-[9px] sm:text-[10px] shadow-sm shadow-amber-500/25 flex items-center gap-1 animate-pulse"
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {badge.label}
                </span>
              );
            }
            if (badge.id === 'out_of_stock') {
              return (
                <span
                  key={badge.id}
                  className="px-2 py-0.5 rounded-md sm:rounded-lg bg-slate-800 text-white font-bold text-[9px] sm:text-[10px] shadow-sm flex items-center gap-1"
                >
                  {badge.label}
                </span>
              );
            }
            return null;
          })}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className={`absolute top-2 right-2 rtl:left-2 rtl:right-auto sm:top-2.5 sm:right-2.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-md transition-all duration-100 active:scale-90 z-10 cursor-pointer ${
            isFavorited
              ? 'bg-[#DC2626] text-white shadow-md'
              : 'bg-white/90 dark:bg-[#111A2E]/90 text-[#64748B] dark:text-slate-400 hover:text-[#DC2626] hover:bg-white dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B]'
          }`}
          title="Add to Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorited ? 'fill-current text-white' : ''}`} />
        </button>

        {/* Compare Button */}
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
          className={`absolute top-9 sm:top-12 right-2 rtl:left-2 rtl:right-auto sm:right-2.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-md transition-all duration-100 active:scale-90 z-10 cursor-pointer ${
            isCompared
              ? 'bg-[#007AFF] text-white shadow-md'
              : 'bg-white/90 dark:bg-[#111A2E]/90 text-[#64748B] dark:text-slate-400 hover:text-[#007AFF] hover:bg-white dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B]'
          }`}
          title={
            isCompared
              ? lang === 'ar'
                ? 'إزالة من المقارنة'
                : 'Remove from Compare'
              : lang === 'ar'
              ? 'إضافة إلى المقارنة (3 كحد أقصى)'
              : 'Add to Compare (max 3)'
          }
          aria-label="Compare Product"
        >
          <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Quick Share Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.share) {
              navigator.share({
                title: product.name,
                text: `${product.name} at ARNAOUT STORE - $${product.price} USD Cash!`,
                url: window.location.origin + '?product=' + product.id,
              }).catch(() => {});
            } else {
              const shareText = `Check out ${product.name} ($${product.price} USD) at ARNAOUT STORE (Saida, Lebanon): ${window.location.origin}?product=${product.id}`;
              const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
              openExternalUrl(waUrl);
            }
          }}
          className="absolute top-16 sm:top-[5.25rem] right-2 rtl:left-2 rtl:right-auto sm:right-2.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-md transition-all duration-100 active:scale-90 z-10 cursor-pointer bg-white/90 dark:bg-[#111A2E]/90 text-[#64748B] dark:text-slate-400 hover:text-[#007AFF] hover:bg-white dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B]"
          title={lang === 'ar' ? 'مشاركة المنتج' : 'Share Product'}
          aria-label="Share Product"
        >
          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* 3D Interactive View Button Pill */}
        <button
          onClick={handleQuickView}
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#111A2E]/95 hover:bg-[#007AFF] hover:text-white dark:hover:bg-[#007AFF] dark:hover:text-white text-[#172033] dark:text-[#F8FAFC] text-[11px] font-bold border border-[#DCE5F0] dark:border-[#1E293B] backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 z-10 shadow-lg cursor-pointer transform translate-y-1 group-hover:translate-y-0"
        >
          <Orbit3DIcon size={18} />
          <span>{lang === 'ar' ? 'معاينة تفاعلية 3D' : '3D Interactive View'}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-between pt-3 sm:pt-0 w-full">
        <div>
          {/* Brand & Stock Status */}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-extrabold text-[#007AFF] dark:text-[#38BDF8] uppercase tracking-wider text-[11px]">
              {product.brand}
            </span>

            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626]">
                <AlertTriangle className="w-3 h-3" />
                {lang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                {lang === 'ar' ? `باقي ${product.stock} فقط` : `Only ${product.stock} left!`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] dark:text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                {lang === 'ar' ? 'متوفر بصيدا' : 'In Stock Saida'}
              </span>
            )}
          </div>

          {/* Crawlable Product Title */}
          <h3 className="font-bold text-[#172033] dark:text-[#F8FAFC] text-sm sm:text-base group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] transition-colors line-clamp-2 leading-snug">
            <a
              href={`#/product/${product.id}`}
              onClick={(e) => {
                e.preventDefault();
                viewProductDetail(product.id, false);
              }}
              className="hover:underline focus:outline-none"
              title={`${product.name} - ${product.brand} Lebanon`}
            >
              {lang === 'ar' ? product.nameAr || product.name : product.name}
            </a>
          </h3>

          {/* Rating & Warranty Row */}
          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-slate-400 mt-2">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-bold text-[#172033] dark:text-slate-200">{product.rating}</span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">({product.reviewCount || 0})</span>
            </div>
            {product.warrantyMonths > 0 && (
              <div className="flex items-center gap-1 text-[#64748B] dark:text-slate-400 text-[11px]">
                <Shield className="w-3 h-3 text-[#007AFF]" />
                <span>
                  {product.warrantyMonths} {lang === 'ar' ? 'شهر كفالة' : 'Mo. Warranty'}
                </span>
              </div>
            )}
          </div>

          {/* Technical Spec Snapshot if in column layout */}
          {layout === 'column' && product.specifications && product.specifications.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {product.specifications.slice(0, 3).map((spec, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-[#F5F8FC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-slate-300 px-2 py-0.5 rounded-md"
                >
                  {spec.label}: <strong className="text-[#007AFF]">{spec.value}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pricing & Action Buttons */}
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[#DCE5F0] dark:border-[#1E293B]">
          <div className="flex items-baseline justify-between mb-2 sm:mb-3">
            <div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-base sm:text-2xl font-black text-[#007AFF] dark:text-[#38BDF8] tracking-tight">
                  ${product.price}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-[10px] sm:text-xs text-[#64748B] dark:text-slate-400 line-through">
                    ${product.originalPrice}
                  </span>
                )}
              </div>
              {discountAmount > 0 && (
                <span className="text-[9px] sm:text-[10px] font-bold text-[#16A34A] dark:text-emerald-400 block">
                  {lang === 'ar' ? `وفرت $${discountAmount}` : `Save $${discountAmount} USD`}
                </span>
              )}
            </div>

            <span className="text-[9px] sm:text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              {lang === 'ar' ? 'صيدا • لبنان' : 'Saida • Lebanon'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-100 flex items-center justify-center gap-1 cursor-pointer active:scale-95 group min-h-[36px] sm:min-h-[40px] ${
                  isOutOfStock
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] text-[#172033] dark:text-[#F8FAFC] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] shadow-xs'
                }`}
              >
                <Cart3DIcon size={16} />
                <span className="truncate">{lang === 'ar' ? 'احجز قطعتك' : 'Pack It 🛍️'}</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`w-full py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-100 flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95 group min-h-[36px] sm:min-h-[40px] ${
                  isOutOfStock
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#007AFF] to-[#0055D6] hover:from-[#0066D6] hover:to-[#0048B8] text-white shadow-[#007AFF]/25'
                }`}
              >
                <Zap3DIcon size={16} />
                <span className="truncate">{lang === 'ar' ? 'طلب فوري' : 'Direct Order ⚡'}</span>
              </button>
            </div>

            <button
              onClick={handleWhatsAppInquiry}
              className="w-full py-1.5 sm:py-2.5 px-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-100/80 hover:from-emerald-100 hover:to-green-100 dark:from-emerald-950/40 dark:via-emerald-900/40 dark:to-emerald-950/60 border border-emerald-300/80 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] sm:text-xs flex items-center justify-center gap-1.5 transition-all duration-100 cursor-pointer active:scale-95 shadow-xs hover:shadow-md hover:shadow-emerald-500/20 group min-h-[36px] sm:min-h-[40px]"
            >
              <WhatsApp3DIcon size={18} />
              <span className="truncate">{lang === 'ar' ? 'واتساب 81900916' : 'WhatsApp 81900916'}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
