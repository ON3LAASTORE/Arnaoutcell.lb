import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Sparkles, ArrowRight, ShieldCheck, Truck, Clock, Flame, ChevronLeft, ChevronRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { lang, storeSettings, setCurrentView } = useShop();
  const [activeSlide, setActiveSlide] = useState(0);

  // Countdown timer for flash deals
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

  const slides = storeSettings.heroSlides && storeSettings.heroSlides.length > 0
    ? storeSettings.heroSlides
    : [
        {
          id: '1',
          badgeEn: 'PREMIUM TECHNOLOGY STORE',
          badgeAr: 'متجر الإلكترونيات الرائد',
          titleEn: 'YOUR HOME IN ELECTRONICS',
          titleAr: 'بيتك في عالم الإلكترونيات',
          subtitleEn: 'Discover the Latest Technology, Smartphones, Smart Accessories & Audiophile Gear with Official Lebanon Warranty.',
          subtitleAr: 'اكتشف أحدث الهواتف الذكية، أجهزة اللابتوب، الملحقات المتطورة والأنظمة الصوتية بكفالة معتمدة.',
          image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200&auto=format&fit=crop&q=80',
          ctaLink: 'special-offers',
          ctaTextEn: 'Explore Exclusive Offers',
          ctaTextAr: 'استكشف العروض الحصرية',
        },
      ];

  const current = slides[activeSlide % slides.length];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F5F8FC] to-white dark:from-[#0A0F1D] dark:via-[#0E1726] dark:to-[#0A0F1D] py-12 md:py-20 border-b border-[#DCE5F0] dark:border-[#1E293B] transition-colors duration-200">
      {/* Background soft ambient accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#007AFF]/5 dark:bg-[#007AFF]/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-10 w-[400px] h-[250px] bg-blue-100/40 dark:bg-sky-950/30 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Text & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tech Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF3FF] dark:bg-[#1E293B] border border-[#BAE6FD] dark:border-[#007AFF]/40 text-[#007AFF] dark:text-[#38BDF8] text-xs font-bold tracking-wider">
              <Sparkles className="w-4 h-4 text-[#007AFF]" />
              <span>{lang === 'ar' ? current.badgeAr : current.badgeEn}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight leading-[1.1]">
              {lang === 'ar' ? (
                <>
                  <span className="block">{current.titleAr}</span>
                  <span className="text-[#007AFF]">
                    أحدث التقنيات والأجهزة الذكية
                  </span>
                </>
              ) : (
                <>
                  <span className="block">{current.titleEn}</span>
                  <span className="text-[#007AFF]">
                    Premium Tech & Electronics
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-[#64748B] dark:text-slate-300 text-base sm:text-lg max-w-2xl font-normal leading-relaxed">
              {lang === 'ar' ? current.subtitleAr : current.subtitleEn}
            </p>

            {/* Flash Deal Live Countdown */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm max-w-md">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#DC2626] uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-[#DC2626]" />
                  <span>{lang === 'ar' ? 'ينتهي العرض الخاطف خلال:' : 'Flash Deal Ends In:'}</span>
                </div>
                <span className="text-[11px] font-semibold text-[#007AFF]">Saida In-Stock</span>
              </div>
              <div className="flex items-center gap-2 text-center font-mono">
                <div className="flex-1 bg-[#F5F8FC] dark:bg-[#0A0F1D] rounded-xl py-1.5 border border-[#DCE5F0] dark:border-[#1E293B]">
                  <span className="text-lg font-black text-[#172033] dark:text-[#F8FAFC]">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="block text-[9px] uppercase tracking-wider text-[#64748B] dark:text-slate-400">{lang === 'ar' ? 'ساعة' : 'Hours'}</span>
                </div>
                <span className="text-[#007AFF] font-bold">:</span>
                <div className="flex-1 bg-[#F5F8FC] dark:bg-[#0A0F1D] rounded-xl py-1.5 border border-[#DCE5F0] dark:border-[#1E293B]">
                  <span className="text-lg font-black text-[#007AFF]">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="block text-[9px] uppercase tracking-wider text-[#64748B] dark:text-slate-400">{lang === 'ar' ? 'دقيقة' : 'Mins'}</span>
                </div>
                <span className="text-[#007AFF] font-bold">:</span>
                <div className="flex-1 bg-[#F5F8FC] dark:bg-[#0A0F1D] rounded-xl py-1.5 border border-[#DCE5F0] dark:border-[#1E293B]">
                  <span className="text-lg font-black text-[#DC2626]">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="block text-[9px] uppercase tracking-wider text-[#64748B] dark:text-slate-400">{lang === 'ar' ? 'ثانية' : 'Secs'}</span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  const elem = document.getElementById('special-offers-section');
                  if (elem) {
                    elem.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setCurrentView('offers');
                  }
                }}
                className="px-6 py-3.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-sm tracking-wide shadow-md shadow-[#007AFF]/25 transition-all flex items-center gap-2 cursor-pointer group"
              >
                <span>{lang === 'ar' ? current.ctaTextAr : current.ctaTextEn}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setCurrentView('products')}
                className="px-6 py-3.5 rounded-xl bg-white dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] font-bold text-sm transition-all cursor-pointer shadow-xs"
              >
                {lang === 'ar' ? 'تصفح كافة المنتجات' : 'Browse All Tech'}
              </button>
            </div>

            {/* Trust Badges Bar */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#DCE5F0] dark:border-[#1E293B] text-xs text-[#64748B] dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
                <span>{lang === 'ar' ? 'توصيل لكافة لبنان' : 'Lebanon Fast Delivery'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                <span>{lang === 'ar' ? 'كفالة رسمية معتمدة' : 'Official Warranty'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
                <span>{lang === 'ar' ? 'خدمات OMT و Whish' : 'OMT & Whish Hub'}</span>
              </div>
            </div>
          </div>

          {/* Clean Apple-style Product Showcase Box */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-3xl overflow-hidden border border-[#DCE5F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2E] shadow-xl shadow-[#007AFF]/5 dark:shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
                <img
                  src={current.image}
                  alt="Featured Electronics"
                  className="w-full h-80 sm:h-96 object-cover object-center transform hover:scale-105 transition-transform duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

                {/* Floating Tech Card */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 dark:bg-[#0E1726]/95 backdrop-blur-md border border-[#DCE5F0] dark:border-[#1E293B] shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#007AFF] uppercase tracking-widest block">
                        {(storeSettings.storeName || 'ARNAOUT STORE').toUpperCase()} • SAIDA
                      </span>
                      <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC] text-sm sm:text-base">
                        {lang === 'ar' ? 'أقوى العروض بانتظاركم' : 'Special In-Store & Online Deals'}
                      </h4>
                    </div>
                    <button
                      onClick={() => setCurrentView('offers')}
                      className="px-3.5 py-1.5 rounded-lg bg-[#007AFF] text-white font-bold text-xs hover:bg-[#0066D6] transition-colors shadow-xs"
                    >
                      {lang === 'ar' ? 'عرض' : 'View'}
                    </button>
                  </div>
                </div>

                {/* Navigation Dots if multiple slides */}
                {slides.length > 1 && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/90 dark:bg-[#0E1726]/90 backdrop-blur-md p-1.5 rounded-full border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm">
                    <button
                      onClick={() => setActiveSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
                      className="p-1 hover:text-[#007AFF] text-[#172033] dark:text-[#F8FAFC] transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {slides.map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === activeSlide ? 'bg-[#007AFF]' : 'bg-[#DCE5F0] dark:bg-slate-700'
                        }`}
                      />
                    ))}
                    <button
                      onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                      className="p-1 hover:text-[#007AFF] text-[#172033] dark:text-[#F8FAFC] transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
