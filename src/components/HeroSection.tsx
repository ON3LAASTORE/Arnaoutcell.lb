import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../context/ShopContext';
import {
  Flame,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Truck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle,
} from 'lucide-react';
import { WhatsApp3DIcon, Cart3DIcon, Zap3DIcon, Orbit3DIcon } from './icons/ThreeDIcons';
import { Product } from '../types';

export const HeroSection: React.FC = () => {
  const {
    lang,
    storeSettings,
    setCurrentView,
    products,
    addToCart,
    setQuickViewProduct,
  } = useShop();

  // Filter actual offer products from inventory
  const offerProducts = products.filter((p) => p.isSpecialOffer && p.isPublished);
  // Default to first offer or fallback
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);

  // Live countdown timer for deals
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 35, seconds: 48 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Active featured product on the welcome offer stage
  const currentOffer: Product | undefined =
    offerProducts[selectedOfferIndex % (offerProducts.length || 1)] || offerProducts[0];

  const discountAmount =
    currentOffer && currentOffer.originalPrice > currentOffer.price
      ? currentOffer.originalPrice - currentOffer.price
      : 0;

  const handleWhatsAppInquiry = (product: Product) => {
    const phone = storeSettings.whatsapp || '96181900916';
    const text = encodeURIComponent(
      lang === 'ar'
        ? `مرحباً أرناؤوط ستور! أود الاستفسار والطلب الفوري لعرض:\n- ${product.nameAr || product.name}\n- السعر المخفض: $${product.price} (وفرت $${product.originalPrice - product.price})\n- الكود: ${product.id}\nالرجاء تأكيد التوفر والتوصيل إلى منطقتي.`
        : `Hello ARNAOUT STORE! I want to inquire / order this special offer:\n- ${product.name}\n- Discounted Price: $${product.price} USD (Save $${product.originalPrice - product.price})\n- SKU: ${product.id}\nPlease confirm availability and delivery.`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleBuyNow = (product: Product) => {
    addToCart(product, 1);
    setCurrentView('checkout');
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0A101E] via-[#0E172B] to-[#070B14] text-white py-10 md:py-16 border-b border-blue-900/30 selection:bg-[#007AFF] selection:text-white">
      {/* Modern Maximalist Ambient Glow Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#007AFF_1px,transparent_1px)] [background-size:28px_28px] opacity-15 pointer-events-none" />
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[400px] bg-[#007AFF]/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[350px] bg-red-600/15 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-[350px] h-[350px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Dynamic Top Live Deal Marquee */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center justify-between gap-4 p-2.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-xs text-slate-300 overflow-hidden">
          <div className="flex items-center gap-2 flex-shrink-0 text-[#FF3B30] font-black uppercase tracking-wider text-[11px] px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/30">
            <Flame className="w-4 h-4 fill-current animate-pulse text-[#FF3B30]" />
            <span>{lang === 'ar' ? 'أقوى العروض الحصرية' : 'EXCLUSIVE OFFERS HUB'}</span>
          </div>

          <div className="flex-1 truncate text-[11px] md:text-xs font-semibold text-slate-300">
            {lang === 'ar'
              ? '⚡ أسعار مخفضة فورية • كفالة معتمدة صيدا ساحة النجمة • خدمة توصيل سريعة لكافة المحافظات • استفسار فوري عبر واتساب 81900916'
              : '⚡ Instant Savings on Flagship Tech • Official Saida Warranty • Express Dispatch Across Lebanon • Instant WhatsApp 81900916'}
          </div>

          <a
            href={`https://wa.me/${storeSettings.whatsapp || '96181900916'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors flex-shrink-0 group"
          >
            <WhatsApp3DIcon size={18} />
            <span>81 900 916</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Maximalist Welcome & Offer Pitch */}
          <div className="lg:col-span-6 space-y-6">
            {/* Super Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-400/40 text-[#38BDF8] text-xs font-extrabold tracking-wider uppercase backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-[#38BDF8] animate-spin-slow" />
              <span>
                {lang === 'ar'
                  ? 'صيدا ساحة النجمة • بيتك في عالم الإلكترونيات'
                  : 'Saida Nijme Square • Your Home In Electronics 🏠'}
              </span>
            </div>

            {/* Bold Maximalist Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              {lang === 'ar' ? (
                <>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                    أقوى عروض وتخفيضات
                  </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#007AFF] to-[#60A5FA]">
                    التكنولوجيا والأجهزة الذكية
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                    Next-Gen Tech Offers &
                  </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#007AFF] to-[#60A5FA]">
                    Exclusive Flash Deals
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle with Real Guarantee */}
            <p className="text-slate-300 text-sm sm:text-base font-normal leading-relaxed max-w-xl">
              {lang === 'ar'
                ? 'استمتع بأحدث الهواتف الذكية، شواحن GaN الفائقة، والأنظمة الصوتية المتطورة بأفضل أسعار صيدا ولبنان، مع كفالة رسمية موثقة ودعم تقني متخصص.'
                : 'Discover verified discounts on flagship smartphones, audiophile headsets, and high-speed GaN power gear with official Lebanon warranty and express dispatch.'}
            </p>

            {/* Live Flash Deal Countdown Block */}
            <div className="p-4 rounded-2xl bg-white/[0.07] backdrop-blur-xl border border-white/15 shadow-xl max-w-md">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-[#FF453A] uppercase tracking-wider">
                  <Flame className="w-4 h-4 fill-current text-[#FF453A]" />
                  <span>{lang === 'ar' ? 'ينتهي العرض الخاطف خلال:' : 'Flash Deal Countdown:'}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {lang === 'ar' ? 'متوفر للتسليم الفوري' : 'Live In Saida'}
                </span>
              </div>

              {/* Digital Numerals */}
              <div className="flex items-center gap-2 text-center font-mono">
                <div className="flex-1 bg-black/40 rounded-xl py-2 border border-white/10 shadow-inner">
                  <span className="text-xl sm:text-2xl font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-sans mt-0.5">
                    {lang === 'ar' ? 'ساعة' : 'Hours'}
                  </span>
                </div>
                <span className="text-[#38BDF8] font-bold text-lg animate-pulse">:</span>
                <div className="flex-1 bg-black/40 rounded-xl py-2 border border-white/10 shadow-inner">
                  <span className="text-xl sm:text-2xl font-black text-[#38BDF8]">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-sans mt-0.5">
                    {lang === 'ar' ? 'دقيقة' : 'Mins'}
                  </span>
                </div>
                <span className="text-[#38BDF8] font-bold text-lg animate-pulse">:</span>
                <div className="flex-1 bg-black/40 rounded-xl py-2 border border-white/10 shadow-inner">
                  <span className="text-xl sm:text-2xl font-black text-[#FF453A]">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-sans mt-0.5">
                    {lang === 'ar' ? 'ثانية' : 'Secs'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Offer Selector Chips */}
            {offerProducts.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === 'ar' ? 'أبرز عروض الواجهة الرئيسية:' : 'Spotlight Offer Products:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {offerProducts.slice(0, 4).map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedOfferIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedOfferIndex === idx
                          ? 'bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/40 border border-blue-400'
                          : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                      }`}
                    >
                      <span>{item.brand}</span>
                      <span className="text-[10px] text-amber-300">-${item.originalPrice - item.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Guarantees Row */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#38BDF8] flex-shrink-0" />
                <span>{lang === 'ar' ? 'شحن لكافة لبنان' : 'Lebanon Fast Dispatch'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{lang === 'ar' ? 'كفالة معتمدة رسمياً' : 'Official Warranty'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{lang === 'ar' ? 'مركز صيدا 8ص-1ص' : 'Open 8AM - 1AM'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3D Modern Maximalist Stage */}
          <div className="lg:col-span-6 relative">
            {currentOffer ? (
              <motion.div
                key={currentOffer.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative rounded-3xl bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 p-5 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,122,255,0.3)] overflow-hidden"
              >
                {/* Floating Discount Tag */}
                <div className="absolute top-4 left-4 rtl:right-4 rtl:left-auto flex flex-col gap-1.5 z-20">
                  <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white font-black text-xs shadow-lg shadow-red-600/30 tracking-wider">
                    {currentOffer.discountPercentage
                      ? `-${currentOffer.discountPercentage}% OFF`
                      : `SAVE $${discountAmount}`}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[#38BDF8] text-[10px] font-bold border border-white/10">
                    {currentOffer.brand} OFFICIAL
                  </span>
                </div>

                {/* 3D Preview Trigger Button */}
                <button
                  onClick={() => setQuickViewProduct(currentOffer)}
                  className="absolute top-4 right-4 rtl:left-4 rtl:right-auto px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#007AFF] text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shadow-md group"
                >
                  <Orbit3DIcon size={18} />
                  <span>{lang === 'ar' ? 'معاينة 3D' : '3D View'}</span>
                </button>

                {/* Main Product Showcase Stage */}
                <div className="relative h-64 sm:h-72 w-full flex items-center justify-center p-4 my-2">
                  <div className="absolute w-48 h-48 bg-[#007AFF]/25 blur-[60px] rounded-full pointer-events-none" />
                  <motion.img
                    src={currentOffer.images[0]}
                    alt={`${currentOffer.name} - ${currentOffer.brand} flagship electronics at ARNAOUT STORE Saida Lebanon`}
                    loading="eager"
                    // @ts-expect-error React 18 / 19 HTML fetchPriority attribute
                    fetchpriority="high"
                    fetchPriority="high"
                    decoding="async"
                    width={600}
                    height={600}
                    className="max-h-full max-w-full object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500 cursor-pointer"
                    onClick={() => setQuickViewProduct(currentOffer)}
                  />
                </div>

                {/* Product Info & Specs Bar */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#38BDF8] font-bold uppercase tracking-wider text-[11px]">
                      {currentOffer.category}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'متوفر في صيدا' : 'In Stock Saida'}
                    </span>
                  </div>

                  <h3
                    onClick={() => setQuickViewProduct(currentOffer)}
                    className="text-lg sm:text-xl font-black text-white hover:text-[#38BDF8] transition-colors cursor-pointer line-clamp-1"
                  >
                    {lang === 'ar' ? currentOffer.nameAr || currentOffer.name : currentOffer.name}
                  </h3>

                  {/* Pricing Matrix */}
                  <div className="flex items-baseline justify-between p-3 rounded-2xl bg-black/40 border border-white/10">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">
                        {lang === 'ar' ? 'السعر المخفض الآن:' : 'Offer Price:'}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          ${currentOffer.price}
                        </span>
                        {currentOffer.originalPrice > currentOffer.price && (
                          <span className="text-sm text-slate-400 line-through">
                            ${currentOffer.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    {discountAmount > 0 && (
                      <div className="text-right rtl:text-left">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {lang === 'ar' ? 'قيمة التوفير:' : 'Net Savings:'}
                        </span>
                        <span className="text-sm font-black text-[#10B981]">
                          +${discountAmount} USD
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Primary Direct CTAs */}
                  <div className="space-y-2 pt-1">
                    {/* The Official WhatsApp Order / Inquire Button */}
                    <button
                      onClick={() => handleWhatsAppInquiry(currentOffer)}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-green-600 to-emerald-700 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-emerald-700/40 active:scale-[0.98] group"
                    >
                      <WhatsApp3DIcon size={24} />
                      <span className="tracking-tight">
                        {lang === 'ar'
                          ? 'استفسار / طلب عبر واتساب (81900916)'
                          : 'Inquire / Order on WhatsApp (81900916)'}
                      </span>
                    </button>

                    {/* Dual Action: Pack It + Direct Order */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => addToCart(currentOffer, 1)}
                        className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/15 cursor-pointer active:scale-95 group"
                      >
                        <Cart3DIcon size={18} />
                        <span>{lang === 'ar' ? 'احجز قطعتك' : 'Pack It 🛍️'}</span>
                      </button>

                      <button
                        onClick={() => handleBuyNow(currentOffer)}
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#007AFF] to-[#0055D6] hover:from-[#0066D6] hover:to-[#0048B8] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#007AFF]/30 cursor-pointer active:scale-95 group"
                      >
                        <Zap3DIcon size={18} />
                        <span>{lang === 'ar' ? 'شراء فوري' : 'Direct Order ⚡'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/10">
                <Sparkles className="w-8 h-8 text-[#007AFF] mx-auto mb-2" />
                <p>{lang === 'ar' ? 'جاري تحميل العروض الحصرية...' : 'Loading Special Offers...'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
