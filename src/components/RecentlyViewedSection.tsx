import React, { useState } from 'react';
import { History, Trash2, ShoppingBag, Eye, X, Package } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { MAX_RECENTLY_VIEWED } from '../utils/recentlyViewedHelpers';
import { Product } from '../types';

export const RecentlyViewedSection: React.FC = () => {
  const {
    lang,
    recentlyViewedProducts,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
    setQuickViewProduct,
    viewProductDetail,
    addToCart,
    setCurrentView,
  } = useShop();

  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleOpenProduct = (product: Product) => {
    setQuickViewProduct(product);
  };

  const handleBrowseOffers = () => {
    const el = document.getElementById('special-offers-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setCurrentView('products');
    }
  };

  return (
    <section
      id="recently-viewed-section"
      aria-labelledby="recently-viewed-heading"
      data-testid="recently-viewed-section"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="py-12 md:py-16 bg-white dark:bg-[#0A0F1D] border-b border-[#DCE5F0] dark:border-[#1E293B] transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#007AFF] dark:text-[#38BDF8]">
              <History className="w-4 h-4 shrink-0" />
              <span>{lang === 'ar' ? 'سجل التصفح المحفوظ' : 'Saved on this device'}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums text-[#64748B] dark:text-slate-400">
                {lang === 'ar'
                  ? `آخر ${MAX_RECENTLY_VIEWED} منتجات`
                  : `Last ${MAX_RECENTLY_VIEWED} clicked items`}
              </span>
            </div>

            <h2
              id="recently-viewed-heading"
              className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight"
            >
              {lang === 'ar' ? 'منتجات تصفحتها مؤخراً' : 'Recently Viewed'}
            </h2>

            <p className="text-sm text-[#64748B] dark:text-slate-300 max-w-2xl">
              {lang === 'ar'
                ? 'ارجع بسرعة إلى آخر 5 منتجات قمت بمعاينتها في ON AlAA STORE.'
                : 'Quickly revisit the last 5 products you clicked on across ON AlAA STORE.'}
            </p>
          </div>

          {recentlyViewedProducts.length > 0 && (
            <div className="flex items-center gap-4 shrink-0">
              <span
                data-testid="recently-viewed-count"
                className="text-xs font-semibold text-[#64748B] dark:text-slate-400 tabular-nums whitespace-nowrap"
              >
                {lang === 'ar'
                  ? `${recentlyViewedProducts.length} من ${MAX_RECENTLY_VIEWED}`
                  : `${recentlyViewedProducts.length} of ${MAX_RECENTLY_VIEWED} shown`}
              </span>

              <button
                type="button"
                onClick={clearRecentlyViewed}
                aria-label={lang === 'ar' ? 'مسح سجل المنتجات المشاهدة' : 'Clear recently viewed history'}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-bold text-[#475569] dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'ar' ? 'مسح السجل' : 'Clear History'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {recentlyViewedProducts.length === 0 ? (
          <div
            data-testid="recently-viewed-empty"
            className="rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC]/70 dark:bg-[#0E1726] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">
                  {lang === 'ar' ? 'لم تقم بمعاينة أي منتج بعد' : 'No recently viewed products yet'}
                </p>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                  {lang === 'ar'
                    ? 'انقر على أي جهاز أو إكسسوار أعلاه ليتم حفظ آخر 5 منتجات تصفحتها هنا تلقائياً.'
                    : 'Click any product card above and your last 5 viewed items will stay saved right here.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBrowseOffers}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
            >
              {lang === 'ar' ? 'تصفح العروض' : 'Browse Products'}
            </button>
          </div>
        ) : (
          /* 5-Card Responsive Grid */
          <div
            data-testid="recently-viewed-grid"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {recentlyViewedProducts.map((product) => {
              const displayName = lang === 'ar' ? product.nameAr || product.name : product.name;
              const isOutOfStock = product.stock <= 0;
              const imageUrl = product.images?.[0];
              const hasImgError = !imageUrl || failedImages[product.id];

              return (
                <article
                  key={product.id}
                  data-testid="recently-viewed-item"
                  data-product-id={product.id}
                  className="group relative flex flex-col rounded-2xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] dark:hover:border-[#38BDF8] shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_28px_-8px_rgba(0,122,255,0.16)] transition-all duration-200 overflow-hidden p-3.5"
                >
                  {/* Remove Individual Item Button */}
                  <button
                    type="button"
                    onClick={() => removeFromRecentlyViewed(product.id)}
                    aria-label={
                      lang === 'ar'
                        ? `إزالة ${displayName} من المشاهدة مؤخراً`
                        : `Remove ${displayName} from recently viewed`
                    }
                    className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 z-10 w-8 h-8 rounded-lg bg-white/95 dark:bg-[#111A2E]/95 border border-[#DCE5F0] dark:border-[#1E293B] text-[#64748B] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Product Thumbnail Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenProduct(product)}
                    aria-label={
                      lang === 'ar' ? `معاينة ${displayName}` : `Inspect ${displayName}`
                    }
                    className="w-full aspect-[4/3] rounded-xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#DCE5F0]/70 dark:border-[#1E293B] flex items-center justify-center p-3 mb-3 overflow-hidden cursor-pointer"
                  >
                    {!hasImgError ? (
                      <img
                        src={imageUrl}
                        alt={`${displayName} - ${product.brand}`}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [product.id]: true }))
                        }
                        className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-[#64748B] dark:text-slate-400">
                        <Package className="w-7 h-7 opacity-60" />
                        <span className="text-[11px] font-semibold truncate max-w-full px-2">
                          {product.brand}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Metadata Line (Unboxed) */}
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 mb-1 truncate">
                    <span className="text-[#007AFF] dark:text-[#38BDF8] uppercase tracking-wide shrink-0">
                      {product.brand}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        isOutOfStock
                          ? 'text-rose-600 dark:text-rose-400 truncate'
                          : 'text-[#16A34A] dark:text-emerald-400 truncate'
                      }
                    >
                      {isOutOfStock
                        ? lang === 'ar'
                          ? 'نفدت الكمية'
                          : 'Out of Stock'
                        : lang === 'ar'
                        ? 'متوفر'
                        : 'In Stock'}
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] leading-snug line-clamp-2 min-h-[2.5rem] mb-2">
                    <a
                      href={`#/product/${product.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        viewProductDetail(product.id, false);
                      }}
                      className="hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] rounded"
                    >
                      {displayName}
                    </a>
                  </h3>

                  {/* Price Row */}
                  <div className="mt-auto pt-2.5 border-t border-[#DCE5F0] dark:border-[#1E293B] space-y-2.5">
                    <div className="flex items-baseline gap-2 tabular-nums">
                      <span className="text-lg font-black text-[#007AFF] dark:text-[#38BDF8]">
                        ${product.price}
                      </span>
                      {product.originalPrice > product.price && (
                        <span className="text-xs text-[#64748B] dark:text-slate-400 line-through">
                          ${product.originalPrice}
                        </span>
                      )}
                    </div>

                    {/* Card Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenProduct(product)}
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
                        <span>{lang === 'ar' ? 'معاينة' : 'View'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(product, 1)}
                        aria-label={
                          lang === 'ar'
                            ? `أضف ${displayName} إلى السلة`
                            : `Add ${displayName} to cart`
                        }
                        className={`min-h-[40px] min-w-[40px] px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center transition-colors shrink-0 ${
                          isOutOfStock
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-[#007AFF] hover:bg-[#0066D6] text-white cursor-pointer'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
