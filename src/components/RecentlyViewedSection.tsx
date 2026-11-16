import React from 'react';
import { History, Trash2 } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { MAX_RECENTLY_VIEWED } from '../utils/recentlyViewedHelpers';
import { ProductCard } from './ProductCard';

export const RecentlyViewedSection: React.FC = () => {
  const {
    lang,
    recentlyViewedProducts,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
    setCurrentView,
  } = useShop();

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
          /* Universal Product Card Grid */
          <div
            data-testid="recently-viewed-grid"
            className="oaa-product-grid"
          >
            {recentlyViewedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                layout="grid"
                testId="recently-viewed-item"
                onRemove={() => removeFromRecentlyViewed(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
