import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../context/ShopContext';
import {
  Star,
  ShieldCheck,
  CheckCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Quote,
  Sparkles,
  ShoppingBag,
  HeartHandshake,
  MessageCircle,
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import {
  Testimonial,
  getNextSlideIndex,
  getPrevSlideIndex,
  getCardsPerView,
  getTotalPages,
  calculateAverageRating,
} from '../utils/testimonialHelpers';

export const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 'test-1',
    name: 'Hassan Kanaan',
    nameAr: 'حسن كنعان',
    locationEn: 'Saida — Nijme Square',
    locationAr: 'صيدا — ساحة النجمة',
    rating: 5,
    productPurchasedEn: 'OPPO Reno 16 Series 5G (3D Pop Planet)',
    productPurchasedAr: 'أوبو رينو 16 سيريس 5G (إصدار 3D Pop Planet)',
    reviewEn:
      'Purchased directly from ARNAOUT STORE in Saida. The 3D Pop Planet finish is truly breathtaking in person, and the 50MP selfie camera AI is top tier! Extremely friendly staff who set up the device on the spot.',
    reviewAr:
      'اشتريت الجهاز مباشرة من معرض أرناؤوط ستور بساحة النجمة في صيدا. تصميم 3D Pop Planet بالواقع خيالي وكاميرا السيلفي 50MP والذكاء الاصطناعي قمة بالإبداع! فريق محترم ومحترف جداً.',
    date: 'October 2026',
    verified: true,
    avatarInitials: 'HK',
    avatarColor: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'test-2',
    name: 'Nour El-Hajj',
    nameAr: 'نور الحاج',
    locationEn: 'Beirut — Achrafieh',
    locationAr: 'بيروت — الأشرفية',
    rating: 5,
    productPurchasedEn: 'iPhone 16 Pro Max 256GB Desert Titanium',
    productPurchasedAr: 'آيفون 16 برو ماكس 256 جيجابايت',
    reviewEn:
      'Fastest delivery in Lebanon! Ordered in the evening via WhatsApp and received the sealed device the next afternoon in Beirut. Verified Apple warranty and paid in fresh USD upon inspection. Highly recommend!',
    reviewAr:
      'أسرع خدمة توصيل في لبنان! تواصلت معهم ع الواتساب بعد الظهر وتاني يوم كان الجهاز مختوم واصل لعندي على بيروت. كفالة رسمية وسعر ممتاز بالدولار النقدي عند المعاينة.',
    date: 'October 2026',
    verified: true,
    avatarInitials: 'NH',
    avatarColor: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'test-3',
    name: 'Dr. Jad Mansour',
    nameAr: 'د. جاد منصور',
    locationEn: 'Tripoli — Mina',
    locationAr: 'طرابلس — الميناء',
    rating: 5,
    productPurchasedEn: 'Samsung Galaxy S25 Ultra 512GB Titanium',
    productPurchasedAr: 'سامسونج جالاكسي S25 الترا 512 جيجابايت',
    reviewEn:
      'Exceptional customer care. They answered all my questions about warranty coverage and camera specs immediately. The S25 Ultra arrived in pristine factory condition with official receipt.',
    reviewAr:
      'تعامل راقٍ وخدمة استثنائية. جاوبوني على كل استفسارات الكفالة والمواصفات فوراً، وجهاز S25 الترا وصل لطرابلس بتغليف المصنع الأصلي مع الفاتورة.',
    date: 'September 2026',
    verified: true,
    avatarInitials: 'JM',
    avatarColor: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'test-4',
    name: 'Maya Sleiman',
    nameAr: 'مايا سليمان',
    locationEn: 'Tyre — South Lebanon',
    locationAr: 'صور — جنوب لبنان',
    rating: 5,
    productPurchasedEn: 'Sony WH-1000XM5 Wireless Headphones',
    productPurchasedAr: 'سماعات سوني WH-1000XM5 اللاسلكية',
    reviewEn:
      'Genuine sound quality! I was skeptical ordering online, but ARNAOUT STORE proved why they have such a great reputation across the South. 100% authentic Sony with active noise cancellation.',
    reviewAr:
      'صوت نقي وأصلي 100%. كنت مترددة بالطلب أونلاين، بس مصداقية أرناؤوط ستور بالجنوب معروفة. السماعة وصلت على صور بعزل ضوضاء ممتاز وتغليف متقن.',
    date: 'September 2026',
    verified: true,
    avatarInitials: 'MS',
    avatarColor: 'from-pink-500 to-rose-600',
  },
  {
    id: 'test-5',
    name: 'Rami Chahine',
    nameAr: 'رامي شاهين',
    locationEn: 'Mount Lebanon — Baabda',
    locationAr: 'جبل لبنان — بعبدا',
    rating: 5,
    productPurchasedEn: 'Anker 737 GaN 140W Power Bank',
    productPurchasedAr: 'باور بانك أنكر 737 بقوة 140 واط GaN',
    reviewEn:
      'Must-have power bank for daily laptop and phone charging during power outages in Lebanon. Original Anker GaN tech with full warranty. Charges my MacBook at full speed!',
    reviewAr:
      'باور بانك ضروري وممتاز لشحن اللابتوب والموبايل مع أزمة الكهربا بلبنان. شاحن أنكر الأصلي بكفالة واضحة، بيشحن الماك بوك بسرعة كاملة!',
    date: 'August 2026',
    verified: true,
    avatarInitials: 'RC',
    avatarColor: 'from-amber-500 to-orange-600',
  },
  {
    id: 'test-6',
    name: 'Karim Zein',
    nameAr: 'كريم زين',
    locationEn: 'Nabatieh',
    locationAr: 'النبطية',
    rating: 5,
    productPurchasedEn: 'OPPO Find X8 Pro Hasselblad Edition',
    productPurchasedAr: 'أوبو فايند X8 برو إصدار هاسيلبلاد',
    reviewEn:
      'The dual periscope zoom on this phone is unbelievable. Ordered via WhatsApp 81900916 and paid with OMT transfer smoothly. ARNAOUT STORE is my go-to tech shop.',
    reviewAr:
      'التقريب وكاميرات هاسيلبلاد خرافية بكل معنى الكلمة. طلبت عبر واتساب 81900916 والدفع تم بسهولة، أفضل متجر إلكترونيات بالجنوب بلا منازع.',
    date: 'August 2026',
    verified: true,
    avatarInitials: 'KZ',
    avatarColor: 'from-violet-500 to-purple-600',
  },
  {
    id: 'test-7',
    name: 'Lina Bazzi',
    nameAr: 'لينا بزّي',
    locationEn: 'Beirut — Hamra',
    locationAr: 'بيروت — الحمرا',
    rating: 5,
    productPurchasedEn: 'Apple AirPods Pro 2 (USB-C)',
    productPurchasedAr: 'سماعات أبل إيربودز برو 2 (USB-C)',
    reviewEn:
      'Crisp audio, verified serial number on Apple website, and warm follow-up from their support team. Delivered right to my door in Hamra within 24 hours.',
    reviewAr:
      'سماعات أصلية وفحصت السيريال على موقع أبل الرسمي. خدمة عملاء ومتابعة ممتازة من وقت الطلب حتى الاستلام ببيروت.',
    date: 'July 2026',
    verified: true,
    avatarInitials: 'LB',
    avatarColor: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'test-8',
    name: 'Fadi Abboud',
    nameAr: 'فادي عبود',
    locationEn: 'Zahle — Bekaa',
    locationAr: 'زحلة — البقاع',
    rating: 5,
    productPurchasedEn: 'UGREEN Nexode 100W GaN 4-Port Charger',
    productPurchasedAr: 'شاحن يوجرين نكسود 100 واط 4 منافذ',
    reviewEn:
      'Replaced 4 different chargers with one compact block. Fast delivery to Zahle within 36 hours. Pristine packaging and genuine product with Lebanese store guarantee.',
    reviewAr:
      'شاحن سريع وممتاز وفّر علي 4 شواحن مختلفة. التوصيل لزحلة كان سريع ومحترف والجهاز أصلي 100% مع كفالة صيدا المعتمدة.',
    date: 'July 2026',
    verified: true,
    avatarInitials: 'FA',
    avatarColor: 'from-blue-600 to-indigo-700',
  },
];

export const TestimonialsSlider: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive cards calculation
  useEffect(() => {
    const updateCards = () => {
      setCardsPerView(getCardsPerView(window.innerWidth));
    };
    updateCards();
    window.addEventListener('resize', updateCards);
    return () => window.removeEventListener('resize', updateCards);
  }, []);

  const maxIndex = Math.max(0, TESTIMONIALS_DATA.length - cardsPerView);

  // Next Slide
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  // Prev Slide
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  // Auto-slide effect (every 5 seconds)
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, handleNext]);

  // Touch Swipe Handlers for mobile UX
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    // Minimum swipe threshold
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        // Swiped Left
        isArabic ? handlePrev() : handleNext();
      } else {
        // Swiped Right
        isArabic ? handleNext() : handlePrev();
      }
    }
    setTouchStartX(null);
  };

  const totalPages = getTotalPages(TESTIMONIALS_DATA.length, cardsPerView);
  const avgRating = calculateAverageRating(TESTIMONIALS_DATA);

  return (
    <section
      data-testid="customer-testimonial-slider"
      className="py-16 md:py-20 bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] dark:from-[#0B0F19] dark:to-[#070A12] border-b border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden selection:bg-[#007AFF] selection:text-white"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. SECTION HEADER WITH AGGREGATE TRUST METRICS
        ========================================================================== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-3 max-w-2xl text-center md:text-left rtl:md:text-right">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#38BDF8] text-xs font-black tracking-wider uppercase border border-[#007AFF]/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isArabic ? 'آراء وتجارب العملاء الحقيقية' : 'VERIFIED CUSTOMER EXPERIENCES'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-[#172033] dark:text-white tracking-tight">
              {isArabic ? (
                <>
                  ثقة أكثر من <span className="text-[#007AFF]">10,000 عميل</span> في صيدا وكافة لبنان
                </>
              ) : (
                <>
                  Trusted by <span className="text-[#007AFF]">10,000+ Customers</span> Across Lebanon
                </>
              )}
            </h2>

            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed font-normal">
              {isArabic
                ? 'اقرأ تجارب حقيقية من عملائنا في صيدا، بيروت، طرابلس، والجنوب عند شراء الأجهزة الرائدة الأصلية مع كفالة معتمدة وخدمة توصيل سريعة بالدولار النقدي.'
                : 'Read real reviews from tech enthusiasts across Saida, Beirut, Tripoli, and the South who purchased authentic flagships, audio gear, and fast charging essentials from ARNAOUT STORE.'}
            </p>
          </div>

          {/* Aggregate Rating Score Badge */}
          <div className="flex items-center justify-center md:justify-end gap-3 flex-shrink-0">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm flex items-center gap-3">
              <div className="text-center border-r rtl:border-r-0 rtl:border-l border-[#DCE5F0] dark:border-[#1E293B] pr-3 rtl:pr-0 rtl:pl-3">
                <span className="text-2xl font-black text-[#172033] dark:text-white block leading-none">
                  {avgRating}
                </span>
                <div className="flex items-center gap-0.5 mt-1 justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-black text-[#172033] dark:text-white block">
                  {isArabic ? 'تقييم ممتاز 5/5' : 'Exceptional 5/5'}
                </span>
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium block">
                  {isArabic ? '1,840+ تقييم شراء معتمد' : '1,840+ verified buyer reviews'}
                </span>
              </div>
            </div>

            {/* Slider Navigation Arrows (Desktop) */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={isArabic ? handleNext : handlePrev}
                aria-label="Previous testimonials"
                className="p-2.5 rounded-xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-white hover:bg-[#007AFF] hover:text-white hover:border-[#007AFF] transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>

              <button
                type="button"
                onClick={isArabic ? handlePrev : handleNext}
                aria-label="Next testimonials"
                className="p-2.5 rounded-xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-white hover:bg-[#007AFF] hover:text-white hover:border-[#007AFF] transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. RESPONSIVE TESTIMONIAL CARD SLIDER
        ========================================================================== */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative overflow-hidden cursor-grab active:cursor-grabbing"
        >
          <motion.div
            className="flex transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(${
                isArabic
                  ? `${currentIndex * (100 / cardsPerView)}%`
                  : `-${currentIndex * (100 / cardsPerView)}%`
              })`,
            }}
          >
            {TESTIMONIALS_DATA.map((item) => (
              <div
                key={item.id}
                style={{ flex: `0 0 ${100 / cardsPerView}%` }}
                className="px-2.5 sm:px-3"
              >
                <div className="h-full flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm hover:shadow-xl hover:border-[#007AFF]/50 transition-all duration-300 relative group">
                  {/* Subtle Top Quotation Watermark */}
                  <Quote className="w-8 h-8 text-slate-100 dark:text-slate-800/80 absolute top-5 right-5 rtl:right-auto rtl:left-5 pointer-events-none" />

                  <div>
                    {/* Customer Avatar & Location Row */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${item.avatarColor} text-white font-black text-sm flex items-center justify-center shadow-md flex-shrink-0`}
                        >
                          {item.avatarInitials}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#172033] dark:text-white text-sm sm:text-base leading-tight">
                            {isArabic ? item.nameAr || item.name : item.name}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#007AFF]" />
                            <span>{isArabic ? item.locationAr : item.locationEn}</span>
                          </div>
                        </div>
                      </div>

                      {/* Verified Badge */}
                      {item.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 flex-shrink-0">
                          <CheckCircle className="w-3 h-3" />
                          <span>{isArabic ? 'مشتري معتمد' : 'Verified Buyer'}</span>
                        </span>
                      )}
                    </div>

                    {/* Star Rating & Purchased Device Tag */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-1">
                        {[...Array(item.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="text-xs font-bold text-[#172033] dark:text-white ml-1.5 rtl:ml-0 rtl:mr-1.5">
                          5.0
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F5F8FC] dark:bg-[#1A253C] text-[11px] font-bold text-[#007AFF] dark:text-[#38BDF8] border border-[#DCE5F0] dark:border-[#1E293B] max-w-full truncate">
                        <ShoppingBag className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {isArabic ? item.productPurchasedAr : item.productPurchasedEn}
                        </span>
                      </div>
                    </div>

                    {/* Review Body */}
                    <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed font-normal italic">
                      "{isArabic ? item.reviewAr : item.reviewEn}"
                    </p>
                  </div>

                  {/* Card Footer: Date & Store Guarantee */}
                  <div className="pt-4 mt-5 border-t border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isArabic ? 'كفالة معتمدة صيدا' : 'Official Warranty'}</span>
                    </span>
                    <span className="font-medium">{item.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* =========================================================================
            3. SLIDER CONTROLS (PAGINATION DOTS & PLAY/PAUSE)
        ========================================================================== */}
        <div className="flex items-center justify-between gap-4 mt-8 pt-4">
          {/* Direct WhatsApp Review Submission Shortcut */}
          <a
            href={`https://wa.me/${storeSettings.whatsapp || '96181900916'}?text=${encodeURIComponent(
              isArabic
                ? 'مرحباً أرناؤوط ستور! أود مشاركة تقييمي وتجربتي مع الشراء والأجهزة.'
                : 'Hello ARNAOUT STORE! I want to share my customer review and feedback.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#007AFF] hover:text-[#0066D6] dark:text-[#38BDF8] dark:hover:text-sky-300 flex items-center gap-1.5 transition-colors group"
          >
            <MessageCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span>{isArabic ? 'شاركنا تجربتك عبر واتساب' : 'Share your feedback on WhatsApp'}</span>
          </a>

          {/* Pagination Dots */}
          <div className="flex items-center gap-1.5">
            {[...Array(maxIndex + 1)].map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentIndex === dotIdx
                    ? 'w-7 bg-[#007AFF]'
                    : 'w-2 bg-[#DCE5F0] dark:bg-slate-700 hover:bg-[#007AFF]/50'
                }`}
              />
            ))}
          </div>

          {/* Autoplay Pause / Play Control */}
          <button
            type="button"
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            aria-label={isAutoPlaying ? 'Pause review autoplay' : 'Play review autoplay'}
            className="flex items-center gap-1 text-xs text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white transition-colors cursor-pointer"
          >
            {isAutoPlaying ? (
              <>
                <Pause className="w-3 h-3" />
                <span className="hidden sm:inline text-[11px]">{isArabic ? 'إيقاف' : 'Pause'}</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span className="hidden sm:inline text-[11px]">{isArabic ? 'تشغيل' : 'Auto'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
