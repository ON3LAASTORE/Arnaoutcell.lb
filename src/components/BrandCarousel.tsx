import React from 'react';
import { useShop } from '../context/ShopContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export const BrandCarousel: React.FC = () => {
  const { lang, brands, selectBrand, setCurrentView } = useShop();

  return (
    <section className="py-14 md:py-20 bg-[#F5F8FC] dark:bg-[#0A0F1D] border-b border-[#DCE5F0] dark:border-[#1E293B] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] dark:bg-[#1E293B] border border-[#BAE6FD] dark:border-[#007AFF]/40 text-[#007AFF] dark:text-[#38BDF8] text-xs font-bold tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'شركاء النجاح المعتمدون' : 'OFFICIAL BRANDS & PARTNERS'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight">
              {lang === 'ar' ? 'أشهر الماركات العالمية في أرناؤوط ستور' : 'Shop by Leading Tech Brands'}
            </h2>
            <p className="text-[#64748B] dark:text-slate-300 text-xs sm:text-sm mt-1">
              {lang === 'ar'
                ? 'منتجات أصلية 100% بكفالة معتمدة من الوكلاء الرسميين في لبنان.'
                : '100% genuine products with manufacturer warranty in Lebanon.'}
            </p>
          </div>

          <button
            onClick={() => {
              setCurrentView('brands');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-[#007AFF] hover:text-[#0066D6] dark:text-[#38BDF8] dark:hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>{lang === 'ar' ? 'عرض كافة الماركات' : 'View Full Brand Directory'}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>

        {/* Brand Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {brands.map((brand) => (
            <div
              key={brand.id}
              onClick={() => selectBrand(brand.name)}
              className="group p-3 sm:p-4 rounded-xl bg-white dark:bg-[#111A2E] hover:bg-[#F5F8FC] dark:hover:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] dark:hover:border-[#38BDF8] flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:scale-105 shadow-xs hover:shadow-[0_4px_16px_-2px_rgba(0,122,255,0.12)]"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F5F8FC] dark:bg-[#0A0F1D] border border-[#DCE5F0] dark:border-[#1E293B] mb-2 p-1 flex items-center justify-center group-hover:border-[#007AFF] transition-colors">
                <img
                  src={brand.logo}
                  alt={`${brand.name} official electronics brand at ARNAOUT STORE Lebanon`}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover rounded-full"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span className="font-bold text-xs text-[#172033] dark:text-[#F8FAFC] group-hover:text-[#007AFF] dark:group-hover:text-[#38BDF8] transition-colors truncate max-w-full">
                {brand.name}
              </span>
              {brand.productCount ? (
                <span className="text-[10px] text-[#64748B] dark:text-slate-400 mt-0.5">
                  {brand.productCount} {lang === 'ar' ? 'منتج' : 'items'}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
