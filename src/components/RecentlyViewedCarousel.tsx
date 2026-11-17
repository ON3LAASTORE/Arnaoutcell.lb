import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, History, Trash2 } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import {
  MAX_RECENTLY_VIEWED,
  computeCarouselScrollOffset,
  filterRecentlyViewedProducts,
  getCarouselScrollState,
  type CarouselScrollState,
} from '../utils/recentlyViewedHelpers';
import { ProductCard } from './ProductCard';

interface RecentlyViewedCarouselProps {
  excludeProductId?: string | null;
}

export const RecentlyViewedCarousel: React.FC<RecentlyViewedCarouselProps> = ({
  excludeProductId,
}) => {
  const {
    lang,
    recentlyViewedProducts,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
    setCurrentView,
  } = useShop();

  const isRtl = lang === 'ar';
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<CarouselScrollState>({
    canScrollPrev: false,
    canScrollNext: false,
    isScrollable: false,
  });

  const carouselItems = useMemo(
    () => filterRecentlyViewedProducts(recentlyViewedProducts, excludeProductId),
    [recentlyViewedProducts, excludeProductId]
  );

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) {
      setScrollState({ canScrollPrev: false, canScrollNext: false, isScrollable: false });
      return;
    }
    setScrollState(getCarouselScrollState(el.scrollLeft, el.clientWidth, el.scrollWidth));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) {
      setScrollState({ canScrollPrev: false, canScrollNext: false, isScrollable: false });
      return;
    }

    const frame = window.requestAnimationFrame(updateScrollState);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateScrollState();
      });
      observer.observe(el);
    }

    window.addEventListener('resize', updateScrollState, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [carouselItems.length, lang, updateScrollState]);

  const handleScrollBy = (direction: 'prev' | 'next') => {
    const el = trackRef.current;
    if (!el) return;
    const offset = computeCarouselScrollOffset(el.clientWidth, direction, isRtl);
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section
      id="recently-viewed-carousel"
      data-testid="recently-viewed-carousel"
      aria-labelledby="recently-viewed-carousel-heading"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="pt-10 border-t border-[#DCE5F0] dark:border-[#1E293B]"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#007AFF] dark:text-[#38BDF8]">
            <History className="w-4 h-4 shrink-0" />
            <span>{isRtl ? 'محفوظ تلقائياً على جهازك' : 'Saved on this device'}</span>
            {carouselItems.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="recently-viewed-carousel-count"
                  className="tabular-nums text-[#64748B] dark:text-slate-400"
                >
                  {isRtl
                    ? `${carouselItems.length} منتجات`
                    : `${carouselItems.length} of ${MAX_RECENTLY_VIEWED}`}
                </span>
              </>
            )}
          </div>

          <h3
            id="recently-viewed-carousel-heading"
            className="text-xl sm:text-2xl font-bold text-[#172033] dark:text-[#F8FAFC] tracking-tight"
          >
            {isRtl ? 'المنتجات التي شاهدتها مؤخراً' : 'Recently Viewed Products'}
          </h3>

          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-300">
            {isRtl
              ? 'تابع من حيث توقفت — تصفح الأجهزة التي عاينتها مؤخراً بسهولة.'
              : 'Pick up where you left off — browse the devices you explored recently.'}
          </p>
        </div>

        {/* Actions & Carousel Arrows */}
        {carouselItems.length > 0 && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={clearRecentlyViewed}
              data-testid="recently-viewed-carousel-clear"
              aria-label={isRtl ? 'مسح سجل التصفح' : 'Clear recently viewed history'}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-bold text-[#475569] dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isRtl ? 'مسح السجل' : 'Clear History'}</span>
            </button>

            <div className="flex items-center gap-1.5" role="group" aria-label={isRtl ? 'التنقل في الشريط' : 'Carousel navigation'}>
              <button
                type="button"
                data-testid="recently-viewed-carousel-prev"
                onClick={() => handleScrollBy('prev')}
                disabled={!scrollState.canScrollPrev}
                aria-label={isRtl ? 'المنتج السابق' : 'Previous recently viewed'}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
                  scrollState.canScrollPrev
                    ? 'border-[#DCE5F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2E] text-[#172033] dark:text-[#F8FAFC] hover:bg-[#007AFF] hover:border-[#007AFF] hover:text-white cursor-pointer shadow-xs'
                    : 'border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0E1726] text-[#94A3B8] dark:text-slate-600 cursor-not-allowed opacity-60'
                }`}
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              <button
                type="button"
                data-testid="recently-viewed-carousel-next"
                onClick={() => handleScrollBy('next')}
                disabled={!scrollState.canScrollNext}
                aria-label={isRtl ? 'المنتج التالي' : 'Next recently viewed'}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
                  scrollState.canScrollNext
                    ? 'border-[#DCE5F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2E] text-[#172033] dark:text-[#F8FAFC] hover:bg-[#007AFF] hover:border-[#007AFF] hover:text-white cursor-pointer shadow-xs'
                    : 'border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0E1726] text-[#94A3B8] dark:text-slate-600 cursor-not-allowed opacity-60'
                }`}
              >
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty State or Horizontal Carousel Track */}
      {carouselItems.length === 0 ? (
        <div
          data-testid="recently-viewed-carousel-empty"
          className="rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC]/70 dark:bg-[#0E1726] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">
                {isRtl ? 'لا توجد منتجات أخرى تمت مشاهدتها مؤخراً' : 'No other recently viewed products yet'}
              </p>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                {isRtl
                  ? 'تصفح أجهزة أخرى من المتجر لتظهر تلقائياً في هذا الشريط المخصص لك.'
                  : 'Explore more devices in our catalog and your recent picks will appear here automatically.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('products')}
            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            {isRtl ? 'تصفح المنتجات' : 'Browse Products'}
          </button>
        </div>
      ) : (
        <div
          ref={trackRef}
          onScroll={updateScrollState}
          data-testid="recently-viewed-carousel-track"
          role="region"
          aria-roledescription="carousel"
          aria-label={isRtl ? 'شريط المنتجات المشاهدة مؤخراً' : 'Recently viewed products carousel'}
          className="oaa-carousel-track flex items-stretch gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pt-2 pb-3"
        >
          {carouselItems.map((item) => (
            <div
              key={item.id}
              className="w-[260px] sm:w-[280px] lg:w-[300px] shrink-0 snap-start"
            >
              <ProductCard
                product={item}
                layout="grid"
                testId="recently-viewed-carousel-item"
                onRemove={() => removeFromRecentlyViewed(item.id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
