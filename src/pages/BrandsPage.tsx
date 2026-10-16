import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ShieldCheck, Search } from 'lucide-react';

export const BrandsPage: React.FC = () => {
  const { lang, brands, selectBrand, products } = useShop();
  const [search, setSearch] = useState('');

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="py-12 md:py-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#DCE5F0]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الماركات الأصلية 100%' : 'AUTHORIZED BRANDS'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#172033]">
              {lang === 'ar' ? 'دليل الماركات والشركات العالمية' : 'Brand Directory & Manufacturers'}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              {lang === 'ar'
                ? 'تصفح أحدث أجهزة أبل، سامسونج، شاومي، أنكر، بورودو، جرين لايون، سوني وغيرها.'
                : 'Browse original flagships from Apple, Samsung, Xiaomi, Anker, Porodo, Green Lion, Sony, JBL, and more.'}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث عن ماركة...' : 'Search brand name...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] shadow-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((b) => {
            const count = products.filter(
              (p) => p.brand.toLowerCase() === b.name.toLowerCase()
            ).length;

            return (
              <div
                key={b.id}
                onClick={() => selectBrand(b.name)}
                className="group p-5 rounded-2xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] transition-all cursor-pointer flex flex-col items-center text-center shadow-xs hover:shadow-[0_4px_20px_-4px_rgba(0,122,255,0.12)] hover:-translate-y-0.5 duration-200"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F5F8FC] border border-[#DCE5F0] mb-3 p-1 flex items-center justify-center group-hover:border-[#007AFF] transition-colors">
                  <img
                    src={b.logo}
                    alt={b.name}
                    className="w-full h-full object-cover rounded-full"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-bold text-[#172033] text-sm group-hover:text-[#007AFF] transition-colors">
                  {b.name}
                </h3>
                <p className="text-[10px] text-[#64748B] line-clamp-1 mt-1">{b.description}</p>
                <span className="mt-3 text-[10px] font-bold text-[#007AFF] bg-[#EAF3FF] px-2.5 py-0.5 rounded-full border border-[#BAE6FD]">
                  {count > 0 ? `${count} ${lang === 'ar' ? 'منتج' : 'Items'}` : lang === 'ar' ? 'متوفر' : 'Catalog'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
