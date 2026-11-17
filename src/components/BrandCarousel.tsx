import React, { useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { buildBrandShowcaseBanners } from '../utils/brandShowcaseHelpers';
import { BrandBannerCard } from './BrandBannerCard';

export const BrandCarousel: React.FC = () => {
  const { lang, brands, products, selectBrand, setCurrentView } = useShop();

  const showcaseItems = useMemo(
    () =>
      buildBrandShowcaseBanners(brands, products, {
        featuredOnly: true,
        limit: 8,
        visualsPerBrand: 3,
        lang,
      }),
    [brands, products, lang]
  );

  return (
    <section
      id="brand-showcase-section"
      className="py-14 md:py-20 bg-[#F5F8FC] dark:bg-[#0A0F1D] border-b border-[#DCE5F0] dark:border-[#1E293B] transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] dark:bg-[#1E293B] border border-[#BAE6FD] dark:border-[#007AFF]/40 text-[#007AFF] dark:text-[#38BDF8] text-xs font-bold tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'شركاء النجاح المعتمدون' : 'OFFICIAL BRANDS & PARTNERS'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight">
              {lang === 'ar' ? 'أشهر الماركات العالمية في متجر ON AlAA' : 'Shop by Leading Tech Brands'}
            </h2>
            <p className="text-[#64748B] dark:text-slate-300 text-xs sm:text-sm mt-1">
              {lang === 'ar'
                ? 'منتجات أصلية 100% بكفالة معتمدة من الوكلاء الرسميين في لبنان.'
                : '100% genuine products with manufacturer warranty in Lebanon.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentView('brands');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-[#007AFF] hover:text-[#0066D6] dark:text-[#38BDF8] dark:hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>
              {lang === 'ar'
                ? `عرض كافة الماركات (${brands.length})`
                : `View All ${brands.length} Brands`}
            </span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>

        {/* 2-Column Spacious Horizontal Brand Showcase Grid */}
        <div className="oaa-brand-grid">
          {showcaseItems.map((item, idx) => (
            <BrandBannerCard
              key={item.brand.id}
              item={item}
              onSelect={selectBrand}
              priority={idx < 4}
              lang={lang}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
