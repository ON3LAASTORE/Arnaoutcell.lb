import React, { useMemo, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Category, Product } from '../types';
import { ArrowRight, ChevronDown, ChevronUp, Package, RefreshCw } from 'lucide-react';
import {
  buildCategoryBannerItems,
  CategoryBannerTheme,
} from '../utils/categoryBannerHelpers';

import phonesBannerImg from '../assets/images/cat_banner_phones_1794926015025.jpg';
import laptopsBannerImg from '../assets/images/cat_banner_laptops_1794926015514.jpg';
import audioBannerImg from '../assets/images/cat_banner_audio_1794926015357.jpg';
import wearablesBannerImg from '../assets/images/cat_banner_wearables_1794926014940.jpg';
import powerBannerImg from '../assets/images/cat_banner_power_gadgets_1794926015997.jpg';
import smartHomeBannerImg from '../assets/images/cat_banner_smart_home_1794926016257.jpg';

const BANNER_IMAGES: Record<CategoryBannerTheme, string> = {
  phones: phonesBannerImg,
  laptops: laptopsBannerImg,
  audio: audioBannerImg,
  wearables: wearablesBannerImg,
  power: powerBannerImg,
  smarthome: smartHomeBannerImg,
};

export interface CategoryGridProps {
  categories?: Category[];
  products?: Product[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectCategory?: (slug: string | null) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories: propCategories,
  products: propProducts,
  isLoading: propIsLoading,
  error: propError,
  onRetry,
  onSelectCategory,
}) => {
  const {
    lang,
    categories: contextCategories,
    products: contextProducts,
    categoriesLoading: contextLoading,
    categoriesError: contextError,
    refreshCategories,
    selectCategory: contextSelectCategory,
  } = useShop();

  const categories = propCategories ?? contextCategories;
  const products = propProducts ?? contextProducts;
  const isLoading = propIsLoading ?? contextLoading;
  const error = propError ?? contextError;
  const handleSelectCategory = onSelectCategory ?? contextSelectCategory;
  const handleRetry = onRetry ?? refreshCategories;

  const [showAll, setShowAll] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const bannerItems = useMemo(
    () => buildCategoryBannerItems(categories, products, showAll),
    [categories, products, showAll]
  );

  return (
    <section
      id="category-showcase-section"
      data-testid="category-grid-section"
      aria-labelledby="category-showcase-heading"
      className="py-16 md:py-24 bg-white dark:bg-[#0A0F1D] border-b border-[#DCE5F0] dark:border-[#1E293B] relative transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0070F3] dark:text-[#38BDF8] mb-2">
              {lang === 'ar'
                ? `${categories.length} قسماً متخصصاً`
                : `${categories.length} Specialized Departments`}
            </p>
            <h2
              id="category-showcase-heading"
              className="text-2xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight text-balance"
            >
              {lang === 'ar' ? 'تسوق حسب القسم' : 'Shop by Category'}
            </h2>
            <p className="text-[#64748B] dark:text-slate-300 text-sm sm:text-base mt-1.5 max-w-2xl">
              {lang === 'ar'
                ? 'استكشف كافة فئات الإلكترونيات، الهواتف الذكية والملحقات التقنية من ON ALAA STORE.'
                : 'Explore genuine smartphones, laptops, audio gear, and smart tech essentials.'}
            </p>
          </div>

          {categories.length > 6 && (
            <button
              type="button"
              data-testid="category-toggle-all"
              onClick={() => setShowAll((prev) => !prev)}
              className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#0070F3] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <span>
                {showAll
                  ? lang === 'ar'
                    ? 'عرض الأقسام الرئيسية فقط'
                    : 'Show Featured Categories'
                  : lang === 'ar'
                    ? `عرض جميع الأقسام (${categories.length})`
                    : `Show All Categories (${categories.length})`}
              </span>
              {showAll ? (
                <ChevronUp className="w-4 h-4 text-[#0070F3] dark:text-[#38BDF8]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#0070F3] dark:text-[#38BDF8]" />
              )}
            </button>
          )}
        </div>

        {/* Loading Skeleton State */}
        {isLoading && bannerItems.length === 0 ? (
          <div
            data-testid="category-grid-skeleton"
            className="oaa-category-grid"
            aria-busy="true"
            aria-label={lang === 'ar' ? 'جاري تحميل الأقسام' : 'Loading categories'}
          >
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="oaa-category-card animate-pulse bg-[#F5F8FC] dark:bg-[#0E1726] p-6 sm:p-8"
              >
                <div className="space-y-3 mt-auto">
                  <div className="h-7 w-2/3 rounded-lg bg-[#E2E8F0] dark:bg-[#1E293B]" />
                  <div className="h-4 w-4/5 rounded-lg bg-[#E2E8F0]/80 dark:bg-[#1E293B]/80" />
                  <div className="h-10 w-32 rounded-[8px] bg-[#0070F3]/25 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : error && bannerItems.length === 0 ? (
          <div
            data-testid="category-grid-error"
            className="rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC] dark:bg-[#0E1726] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#172033] dark:text-[#F8FAFC]">
                {lang === 'ar' ? 'تعذر تحميل الأقسام حالياً' : 'Unable to load product categories'}
              </h3>
              <p className="text-sm text-[#64748B] dark:text-slate-400">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleRetry();
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0070F3] hover:bg-[#0051D5] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          </div>
        ) : (
          /* Design System Data Grid (.oaa-category-grid / .oaa-category-card) */
          <div data-testid="oaa-category-grid" className="oaa-category-grid">
            {bannerItems.map((item, idx) => {
              const title = lang === 'ar' ? item.titleAr : item.titleEn;
              const subtitle = lang === 'ar' ? item.subtitleAr : item.subtitleEn;
              const ctaText = lang === 'ar' ? 'تسوق الآن' : 'Shop now';
              const countLabel =
                item.productCount > 0
                  ? lang === 'ar'
                    ? `${item.productCount} منتج متوفر`
                    : `${item.productCount} ${item.productCount === 1 ? 'item' : 'items'}`
                  : null;
              const imageSrc = item.imageUrl || BANNER_IMAGES[item.theme];
              const isFailed = Boolean(failedImages[item.category.id]);

              return (
                <article
                  key={item.category.id}
                  data-testid="category-banner-card"
                  data-category-slug={item.category.slug}
                  onClick={() => handleSelectCategory(item.category.slug)}
                  className="group oaa-category-card"
                >
                  {/* Background Photography with Smooth Hover Zoom */}
                  {!isFailed && imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={title}
                      width={1280}
                      height={720}
                      loading={idx < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({
                          ...prev,
                          [item.category.id]: true,
                        }))
                      }
                      className="oaa-category-card-img"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-end p-8"
                    >
                      <Package className="w-20 h-20 text-white/15" />
                    </div>
                  )}

                  {/* Measured Dark Gradient Overlay Scrim */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.34) 45%, rgba(0, 0, 0, 0.1) 65%)',
                    }}
                  />

                  {/* Overlayed Content Hierarchy (Bottom-Start) */}
                  <div className="relative z-10 p-6 sm:p-8 flex flex-col items-start text-start">
                    <h3 className="text-[24px] sm:text-[28px] font-bold leading-[1.2] text-white tracking-tight text-balance">
                      {title}
                    </h3>
                    <p className="text-[14px] leading-relaxed text-[#E2E8F0] mt-2 max-w-md line-clamp-2">
                      {countLabel ? `${countLabel} · ${subtitle}` : subtitle}
                    </p>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCategory(item.category.slug);
                      }}
                      aria-label={`${ctaText} — ${title}`}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0070F3] hover:bg-[#00BAF2] text-white text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BAF2] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      <span>{ctaText}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                    </button>
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
