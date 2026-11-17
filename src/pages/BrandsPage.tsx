import React, { useMemo, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ShieldCheck, Search } from 'lucide-react';
import { buildBrandShowcaseBanners } from '../utils/brandShowcaseHelpers';
import { BrandBannerCard } from '../components/BrandBannerCard';

export const BrandsPage: React.FC = () => {
  const { lang, brands, selectBrand, products } = useShop();
  const [search, setSearch] = useState('');

  const filteredBrands = useMemo(
    () =>
      brands.filter((b) =>
        b.name.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [brands, search]
  );

  const showcaseItems = useMemo(
    () =>
      buildBrandShowcaseBanners(filteredBrands, products, {
        featuredOnly: false,
        visualsPerBrand: 3,
        lang,
      }),
    [filteredBrands, products, lang]
  );

  return (
    <div className="py-12 md:py-20 bg-[#F8FAFC] dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#DCE5F0] dark:border-[#1E293B]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] dark:bg-[#1E293B] border border-[#BAE6FD] dark:border-[#007AFF]/40 text-[#007AFF] dark:text-[#38BDF8] text-xs font-bold tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الماركات الأصلية 100%' : 'AUTHORIZED BRANDS'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              {lang === 'ar' ? 'دليل الماركات والشركات العالمية' : 'Brand Directory & Manufacturers'}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-300 mt-1">
              {lang === 'ar'
                ? 'تصفح أحدث أجهزة أبل، سامسونج، شاومي، أنكر، ايس فاست، فونينغ، يسيدو، دوجي، ليتو وسائر الماركات العالمية.'
                : 'Browse original products from Apple, Samsung, Xiaomi, Anker, ACEFAST, FONENG, YESIDO, DOOGEE, LITO, and more.'}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث عن ماركة...' : 'Search brand name...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#007AFF] dark:focus:border-[#38BDF8] shadow-xs"
            />
          </div>
        </div>

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
    </div>
  );
};
