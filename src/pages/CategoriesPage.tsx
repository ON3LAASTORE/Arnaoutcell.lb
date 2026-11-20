import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Layers, Search, ArrowRight } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const { lang, categories, selectCategory, products } = useShop();
  const [search, setSearch] = useState('');

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.nameAr.includes(search) ||
      c.subcategories?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="py-12 md:py-20 bg-white dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#DCE5F0] dark:border-[#1E293B]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] dark:bg-[#111A2E] border border-[#BAE6FD] dark:border-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] text-xs font-bold tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الدليل الكامل' : 'FULL DIRECTORY'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC]">
              {lang === 'ar' ? `كافة أقسام الإلكترونيات (${categories.length} قسماً)` : `All ${categories.length} Electronic Categories`}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1">
              {lang === 'ar'
                ? 'تصفح كافة الفئات المتخصصة، من الهواتف واللابتوبات إلى قطع الصيانة والإلكترونيات المنزلية.'
                : 'Explore all specialized electronic hardware, accessories, and maintenance supplies.'}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث في الأقسام...' : 'Search categories...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FFFFFF] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder-[#94A3B8] dark:placeholder-slate-500 focus:outline-none focus:border-[#007AFF] shadow-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((cat) => {
            const count = products.filter(
              (p) => p.category.toLowerCase() === cat.name.toLowerCase()
            ).length;

            return (
              <div
                key={cat.id}
                onClick={() => selectCategory(cat.slug)}
                className="group p-5 rounded-2xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] dark:hover:border-[#38BDF8] transition-all cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-[0_4px_20px_-4px_rgba(0,122,255,0.12)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#38BDF8] bg-[#EAF3FF] dark:bg-[#0E1726] px-2.5 py-1 rounded-md border border-[#BAE6FD] dark:border-[#1E293B]">
                      {count} {lang === 'ar' ? 'منتجات' : 'Products'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#64748B] dark:text-slate-400 group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
                  </div>

                  <h3 className="text-base font-bold text-[#172033] dark:text-[#F8FAFC] group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] transition-colors mb-2">
                    {lang === 'ar' ? cat.nameAr : cat.name}
                  </h3>

                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {cat.subcategories.map((sub, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-[#F5F8FC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-[#64748B] dark:text-slate-300 px-2 py-0.5 rounded-md font-medium"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
