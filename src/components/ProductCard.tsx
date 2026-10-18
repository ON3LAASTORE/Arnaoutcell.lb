import React from 'react';
import { Product } from '../types';
import { useShop } from '../context/ShopContext';
import { Heart, ShoppingCart, Eye, Zap, Shield, Star, CheckCircle, AlertTriangle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  layout?: 'grid' | 'column' | 'horizontal';
  showOfferDetails?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  layout = 'grid',
  showOfferDetails = true,
}) => {
  const {
    lang,
    addToCart,
    viewProductDetail,
    setQuickViewProduct,
    toggleWishlist,
    isInWishlist,
    setCurrentView,
  } = useShop();

  const isFavorited = isInWishlist(product.id);
  const discountAmount = product.originalPrice > product.price ? product.originalPrice - product.price : 0;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold || 3);

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

  return (
    <div
      onClick={() => viewProductDetail(product.id)}
      className={`group relative rounded-2xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF]/60 dark:hover:border-[#38BDF8]/60 shadow-sm dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_24px_-4px_rgba(0,122,255,0.12)] transition-all duration-300 flex cursor-pointer overflow-hidden ${
        layout === 'column'
          ? 'flex-col sm:flex-row gap-4 p-4 items-center'
          : 'flex-col p-4'
      }`}
    >
      {/* Product Image Area */}
      <div
        className={`relative overflow-hidden rounded-xl bg-[#F5F8FC] dark:bg-[#0A0F1D] border border-[#DCE5F0] dark:border-[#1E293B] flex-shrink-0 ${
          layout === 'column' ? 'w-full sm:w-44 h-48 sm:h-44' : 'w-full h-52'
        }`}
      >
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=600'}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {product.discountPercentage && product.discountPercentage > 0 ? (
            <span className="px-2 py-0.5 rounded-md bg-[#DC2626] text-white font-black text-[11px] shadow-xs">
              -{product.discountPercentage}% OFF
            </span>
          ) : null}

          {product.isNewArrival && (
            <span className="px-2 py-0.5 rounded-md bg-[#007AFF] text-white font-bold text-[10px]">
              {lang === 'ar' ? 'جديد' : 'NEW'}
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-all z-10 cursor-pointer ${
            isFavorited
              ? 'bg-[#DC2626] text-white shadow-md'
              : 'bg-white/90 dark:bg-[#111A2E]/90 text-[#64748B] dark:text-slate-400 hover:text-[#DC2626] hover:bg-white dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B]'
          }`}
          title="Add to Wishlist"
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current text-white' : ''}`} />
        </button>

        {/* Quick View Hover Button */}
        <button
          onClick={handleQuickView}
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-white/95 dark:bg-[#111A2E]/95 hover:bg-[#007AFF] hover:text-white dark:hover:bg-[#007AFF] dark:hover:text-white text-[#172033] dark:text-[#F8FAFC] text-xs font-semibold border border-[#DCE5F0] dark:border-[#1E293B] backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 z-10 shadow-md cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-between pt-3 sm:pt-0 w-full">
        <div>
          {/* Brand & Stock Status */}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-[#007AFF] uppercase tracking-wider text-[11px]">
              {product.brand}
            </span>

            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DC2626]">
                <AlertTriangle className="w-3 h-3" />
                {lang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                {lang === 'ar' ? `كمية محدودة (${product.stock})` : `Low Stock (${product.stock} left)`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]">
                <CheckCircle className="w-3 h-3" />
                {lang === 'ar' ? `متوفر (${product.stock})` : `In Stock (${product.stock})`}
              </span>
            )}
          </div>

          {/* Product Title */}
          <h3 className="font-bold text-[#172033] dark:text-[#F8FAFC] text-sm sm:text-base group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] transition-colors line-clamp-2 leading-snug">
            {lang === 'ar' ? product.nameAr || product.name : product.name}
          </h3>

          {/* Rating & Warranty Row */}
          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-slate-400 mt-2">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-bold text-[#172033] dark:text-slate-200">{product.rating}</span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">({product.reviewCount})</span>
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
        <div className="mt-4 pt-3 border-t border-[#DCE5F0] dark:border-[#1E293B]">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-[#007AFF] tracking-tight">
                  ${product.price}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-xs text-[#64748B] dark:text-slate-400 line-through">
                    ${product.originalPrice}
                  </span>
                )}
              </div>
              {discountAmount > 0 && (
                <span className="text-[10px] font-semibold text-[#16A34A] dark:text-emerald-400 block">
                  {lang === 'ar' ? `وفّر $${discountAmount}` : `Save $${discountAmount}`}
                </span>
              )}
            </div>

            <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-widest">
              USD • Saida
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isOutOfStock
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-[#F5F8FC] dark:bg-[#0E1726] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] text-[#172033] dark:text-[#F8FAFC] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] dark:hover:border-[#007AFF]'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>{lang === 'ar' ? 'السلة' : 'Add to Cart'}</span>
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                isOutOfStock
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-[#007AFF] hover:bg-[#0066D6] text-white shadow-[#007AFF]/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{lang === 'ar' ? 'شراء الآن' : 'Buy Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
