import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from './ProductCard';
import { Flame, Sparkles, ArrowRight, TrendingUp, Award } from 'lucide-react';

export const SpecialOffersColumn: React.FC = () => {
  const { lang, products, setCurrentView, storeSettings } = useShop();

  const [activeTab, setActiveTab] = useState<'all' | 'phones' | 'accessories' | 'gaming'>('all');

  // Filter products on special offer
  const offerProducts = products.filter((p) => p.isSpecialOffer && p.isPublished);

  // Filter by selected tab
  const filteredOffers = offerProducts.filter((p) => {
    if (activeTab === 'phones') return p.category.toLowerCase().includes('phone');
    if (activeTab === 'accessories')
      return (
        p.category.toLowerCase().includes('power') ||
        p.category.toLowerCase().includes('charger') ||
        p.category.toLowerCase().includes('watch') ||
        p.category.toLowerCase().includes('ear') ||
        p.category.toLowerCase().includes('headphone')
      );
    if (activeTab === 'gaming')
      return (
        p.category.toLowerCase().includes('gaming') ||
        p.category.toLowerCase().includes('smart') ||
        p.category.toLowerCase().includes('drone')
      );
    return true;
  });

  // Group into responsive columns
  const col1 = filteredOffers.filter((_, idx) => idx % 2 === 0);
  const col2 = filteredOffers.filter((_, idx) => idx % 2 === 1);

  return (
    <section id="special-offers-section" className="py-16 md:py-24 bg-[#F5F8FC] dark:bg-[#0A0F1D] relative border-b border-[#DCE5F0] dark:border-[#1E293B] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header with Title and Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-[#DC2626] dark:text-red-400 text-xs font-bold tracking-wider mb-2">
              <Flame className="w-4 h-4 fill-current text-[#DC2626]" />
              <span>{lang === 'ar' ? 'عروض وتخفيضات حصرية' : 'EXCLUSIVE DEALS'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight">
              {lang === 'ar' ? (
                <>
                  أقوى العروض الخاصة — <span className="text-[#007AFF]">{storeSettings.storeNameAr || 'أرناؤوط ستور'}</span>
                </>
              ) : (
                <>
                  Special Offers & Flash Sales — <span className="text-[#007AFF]">{storeSettings.storeName}</span>
                </>
              )}
            </h2>
            <p className="text-[#64748B] dark:text-slate-300 text-sm sm:text-base mt-1 max-w-xl">
              {lang === 'ar'
                ? 'تخفيضات أسبوعية حقيقية ومضمونة على أحدث الهواتف الذكية والإلكترونيات في صيدا وكافة مناطق لبنان.'
                : 'Genuine, verified discounts on next-generation electronics with official warranty and fast Lebanon dispatch.'}
            </p>
          </div>

          {/* Offer Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#111A2E] rounded-xl border border-[#DCE5F0] dark:border-[#1E293B] self-start md:self-auto overflow-x-auto max-w-full shadow-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
            >
              {lang === 'ar' ? 'كافة العروض' : 'All Offers'}
            </button>
            <button
              onClick={() => setActiveTab('phones')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'phones'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
            >
              {lang === 'ar' ? 'الهواتف' : 'Phones'}
            </button>
            <button
              onClick={() => setActiveTab('accessories')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'accessories'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
            >
              {lang === 'ar' ? 'الإكسسوارات والشواحن' : 'Audio & Power'}
            </button>
            <button
              onClick={() => setActiveTab('gaming')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'gaming'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
            >
              {lang === 'ar' ? 'الجيمنغ والدرونز' : 'Gaming & Gear'}
            </button>
          </div>
        </div>

        {/* Column-Style Product Layout */}
        {filteredOffers.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1 */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-2 border-b border-[#DCE5F0]">
                <div className="flex items-center gap-2 text-[#007AFF] font-bold text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'عروض الهواتف والأجهزة الذكية' : 'Flagship & Mobile Highlights'}</span>
                </div>
                <span className="text-[11px] font-semibold text-[#64748B]">
                  {col1.length} {lang === 'ar' ? 'عروض' : 'Deals'}
                </span>
              </div>

              {col1.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  layout="column"
                  showOfferDetails={true}
                />
              ))}
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-2 border-b border-[#DCE5F0]">
                <div className="flex items-center gap-2 text-[#007AFF] font-bold text-sm">
                  <Award className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'عروض الصوتيات والإكسسوارات السريعة' : 'Gadgets & Fast Charge Deals'}</span>
                </div>
                <span className="text-[11px] font-semibold text-[#64748B]">
                  {col2.length} {lang === 'ar' ? 'عروض' : 'Deals'}
                </span>
              </div>

              {col2.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  layout="column"
                  showOfferDetails={true}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#DCE5F0]">
            <Sparkles className="w-10 h-10 text-[#007AFF] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-[#172033] mb-1">
              {lang === 'ar' ? 'لا توجد عروض في هذا القسم حالياً' : 'No active offers in this tab'}
            </h3>
            <p className="text-sm text-[#64748B]">
              {lang === 'ar' ? 'تابعنا لتكون أول من يستفيد من العروض القادمة' : 'Check back shortly for new discounted deals'}
            </p>
          </div>
        )}

        {/* View All Deals Button */}
        <div className="text-center mt-12">
          <button
            onClick={() => {
              setCurrentView('offers');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-[#EAF3FF] border border-[#DCE5F0] hover:border-[#007AFF] text-[#007AFF] font-bold text-sm shadow-sm transition-all cursor-pointer group"
          >
            <span>{lang === 'ar' ? 'عرض جميع العروض والتخفيضات' : 'View All Special Offers & Discounts'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};
