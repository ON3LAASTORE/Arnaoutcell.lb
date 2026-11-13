import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from './ProductCard';
import { Flame, Sparkles, ArrowRight, Tag, Smartphone, Headphones, BatteryCharging, Gamepad2 } from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { ReactBitsColumns } from './animations/ReactBitsColumns';

export const SpecialOffersColumn: React.FC = () => {
  const { lang, products, setCurrentView, storeSettings } = useShop();

  const [activeTab, setActiveTab] = useState<'all' | 'phones' | 'audio' | 'power' | 'rugged'>('all');

  // Filter products on special offer
  const offerProducts = products.filter((p) => p.isSpecialOffer && p.isPublished);

  // Filter by selected tab
  const filteredOffers = offerProducts.filter((p) => {
    const cat = p.category.toLowerCase();
    const name = p.name.toLowerCase();
    if (activeTab === 'phones') {
      return cat.includes('phone') || name.includes('iphone') || name.includes('s24') || name.includes('doogee');
    }
    if (activeTab === 'audio') {
      return cat.includes('airpods') || cat.includes('headphone') || cat.includes('earphone') || cat.includes('audio');
    }
    if (activeTab === 'power') {
      return cat.includes('power') || cat.includes('charger') || cat.includes('cable') || name.includes('anker');
    }
    if (activeTab === 'rugged') {
      return cat.includes('rugged') || cat.includes('watch') || cat.includes('smart') || cat.includes('drone');
    }
    return true;
  });

  return (
    <section
      id="special-offers-section"
      className="py-14 md:py-20 bg-[#F5F8FC] dark:bg-[#070C16] relative border-b border-[#DCE5F0] dark:border-[#1E293B] transition-colors duration-200"
    >
      {/* Background Subtle Maximalist Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-96 h-96 bg-red-500/5 dark:bg-red-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-[#DC2626] dark:text-red-400 text-xs font-black tracking-wider mb-2">
              <Flame className="w-4 h-4 fill-current text-[#DC2626]" />
              <span>{lang === 'ar' ? 'العروض الحصرية بأسعار الجملة' : 'VERIFIED SPECIAL OFFERS'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight">
              {lang === 'ar' ? (
                <>
                  أقوى العروض المخفضة — <span className="text-[#007AFF]">{storeSettings.storeNameAr || 'ON AlAA STORE'}</span>
                </>
              ) : (
                <>
                  Official Special Offers — <span className="text-[#007AFF]">{storeSettings.storeName || 'ON AlAA STORE'}</span>
                </>
              )}
            </h2>
            <p className="text-[#64748B] dark:text-slate-300 text-sm sm:text-base mt-1.5 max-w-2xl">
              {lang === 'ar'
                ? 'تخفيضات أسبوعية حقيقية بكفالة معتمدة من ON AlAA STORE في الشوف، مع توصيل متاح لجميع مناطق لبنان أو الطلب عبر واتساب 03986718.'
                : 'Genuine, direct discounts on top smartphones, audio gear, and fast chargers with official ON AlAA STORE warranty and delivery available to all Lebanon.'}
            </p>
          </div>

          {/* Modern Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#111A2E] rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'كافة العروض' : 'All Offers'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20">
                {offerProducts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('phones')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'phones'
                  ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الهواتف الذكية' : 'Smartphones'}</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audio'
                  ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الصوتيات وسماعات' : 'Audio & Sound'}</span>
            </button>

            <button
              onClick={() => setActiveTab('power')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'power'
                  ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              <BatteryCharging className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'شواحن وباوربانك' : 'Power & GaN'}</span>
            </button>

            <button
              onClick={() => setActiveTab('rugged')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'rugged'
                  ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الأجهزة المتطورة' : 'Smart Gear'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Offer Products Grid */}
        {filteredOffers.length > 0 ? (
          <ReactBitsColumns columns={4} showDividers={false}>
            {filteredOffers.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                layout="grid"
                showOfferDetails={true}
                priority={idx < 2}
              />
            ))}
          </ReactBitsColumns>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-[#0E1726] rounded-3xl border border-dashed border-[#DCE5F0] dark:border-[#1E293B]">
            <Sparkles className="w-10 h-10 text-[#007AFF] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-[#172033] dark:text-white mb-1">
              {lang === 'ar' ? 'لا توجد عروض في هذا القسم حالياً' : 'No active offers in this section'}
            </h3>
            <p className="text-sm text-[#64748B] dark:text-slate-400">
              {lang === 'ar' ? 'اختر قسماً آخر أو تصفح كامل العروض' : 'Select another category or view all offers'}
            </p>
          </div>
        )}

        {/* Direct WhatsApp Callout Banner */}
        <div className="mt-12 p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left rtl:md:text-right">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-200">
              {lang === 'ar' ? 'متجر أونلاين في الشوف • توصيل لجميع لبنان' : 'Online Store Based in Chouf • All Lebanon Delivery'}
            </span>
            <h4 className="text-xl sm:text-2xl font-black">
              {lang === 'ar'
                ? 'هل تبحث عن جهاز أو سعر خاص؟ تواصل معنا فوراً'
                : 'Need custom advice or instant stock check on any offer?'}
            </h4>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
              {lang === 'ar'
                ? 'فريق ON AlAA STORE جاهز للرد على استفساراتكم وتأكيد الطلب مع توصيل متاح لجميع المناطق اللبنانية.'
                : 'Our team is active on WhatsApp to process instant orders with fast delivery available across all Lebanon.'}
            </p>
          </div>

          <a
            href={`https://wa.me/9613986718?text=${encodeURIComponent(
              'Hello ON AlAA STORE! I am inquiring about current special offers and flash discounts.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-emerald-800 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 active:scale-95 group"
          >
            <WhatsApp3DIcon size={22} />
            <span>{lang === 'ar' ? 'استفسار / طلب عبر واتساب (03986718)' : 'Inquire / Order on WhatsApp (03986718)'}</span>
          </a>
        </div>
      </div>
    </section>
  );
};
