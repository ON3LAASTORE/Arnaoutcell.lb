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
  MessageCircle,
  PlusCircle,
  X,
  Send,
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
import {
  validateReviewSubmission,
  generateAvatarProps,
} from '../utils/reviewHelpers';
import {
  getTestimonials,
  addTestimonial as saveTestimonialToStorage,
} from '../services/storageService';

// All pre-existing mock reviews have been removed to be ready for new customer reviews and feedback
export const TESTIMONIALS_DATA: Testimonial[] = [];

export const TestimonialsSlider: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Review modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [productPurchased, setProductPurchased] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load testimonials from storage
  useEffect(() => {
    const stored = getTestimonials();
    setTestimonials(stored);
  }, []);

  // Responsive cards calculation
  useEffect(() => {
    const updateCards = () => {
      setCardsPerView(getCardsPerView(window.innerWidth));
    };
    updateCards();
    window.addEventListener('resize', updateCards);
    return () => window.removeEventListener('resize', updateCards);
  }, []);

  const maxIndex = Math.max(0, testimonials.length - cardsPerView);

  // Next Slide
  const handleNext = useCallback(() => {
    if (testimonials.length === 0) return;
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex, testimonials.length]);

  // Prev Slide
  const handlePrev = useCallback(() => {
    if (testimonials.length === 0) return;
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex, testimonials.length]);

  // Auto-slide effect (every 5 seconds)
  useEffect(() => {
    if (!isAutoPlaying || testimonials.length <= cardsPerView) return;
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, handleNext, testimonials.length, cardsPerView]);

  // Touch Swipe Handlers for mobile UX
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || testimonials.length === 0) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        isArabic ? handlePrev() : handleNext();
      } else {
        isArabic ? handleNext() : handlePrev();
      }
    }
    setTouchStartX(null);
  };

  const totalPages = getTotalPages(testimonials.length, cardsPerView);
  const avgRating = calculateAverageRating(testimonials);

  // Handle new customer review / feedback submission
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const validation = validateReviewSubmission(
      {
        name,
        rating,
        comment,
      },
      lang
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setValidationError(firstError || 'Please fill in all required fields.');
      return;
    }

    const avatar = generateAvatarProps(name);
    const newEntry = saveTestimonialToStorage({
      name: name.trim(),
      nameAr: name.trim(),
      locationEn: location.trim() || 'Saida — Lebanon',
      locationAr: location.trim() || 'صيدا — لبنان',
      rating,
      productPurchasedEn: productPurchased.trim() || 'Tech Accessories & Devices',
      productPurchasedAr: productPurchased.trim() || 'أجهزة وإلكترونيات',
      reviewEn: comment.trim(),
      reviewAr: comment.trim(),
      verified: true,
      avatarInitials: avatar.initials,
      avatarColor: avatar.color,
    });

    setTestimonials((prev) => [newEntry, ...prev]);
    setSubmitSuccess(true);

    setTimeout(() => {
      setSubmitSuccess(false);
      setIsModalOpen(false);
      setName('');
      setLocation('');
      setProductPurchased('');
      setComment('');
      setRating(5);
    }, 1200);
  };

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
              <span>{isArabic ? 'آراء وتجارب العملاء' : 'VERIFIED CUSTOMER REVIEWS & FEEDBACK'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-[#172033] dark:text-white tracking-tight">
              {isArabic ? (
                <>
                  شاركنا <span className="text-[#007AFF]">رأيك وتجربتك</span> مع أرناؤوط ستور
                </>
              ) : (
                <>
                  Share Your <span className="text-[#007AFF]">Review & Feedback</span>
                </>
              )}
            </h2>

            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed font-normal">
              {isArabic
                ? 'قسم التقييمات جاهز لاستقبال آراء وتجارب العملاء الحقيقية في صيدا وكافة المناطق اللبنانية. شاركنا رأيك حول أجهزتك وتجربة الشراء!'
                : 'Our customer feedback board is ready for genuine buyer reviews and ratings across Saida and Lebanon. Share your experience with us!'}
            </p>
          </div>

          {/* Action buttons & Aggregate Rating */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 flex-shrink-0">
            {/* Write a Review Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#007AFF]/20 active:scale-95 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isArabic ? 'أضف تقييمك الآن' : 'Write a Review'}</span>
            </button>

            {/* Aggregate Rating Score Badge */}
            <div className="p-3 rounded-2xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs flex items-center gap-3">
              <div className="text-center border-r rtl:border-r-0 rtl:border-l border-[#DCE5F0] dark:border-[#1E293B] pr-3 rtl:pr-0 rtl:pl-3">
                <span className="text-xl font-black text-[#172033] dark:text-white block leading-none">
                  {testimonials.length > 0 ? avgRating : '5.0'}
                </span>
                <div className="flex items-center gap-0.5 mt-1 justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-black text-[#172033] dark:text-white block">
                  {isArabic ? 'تقييمات المتجر' : 'Store Reviews'}
                </span>
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium block">
                  {testimonials.length > 0
                    ? isArabic
                      ? `${testimonials.length} تقييم موثق`
                      : `${testimonials.length} verified reviews`
                    : isArabic
                    ? 'كن أول من يقيمنا!'
                    : 'Be the first to review!'}
                </span>
              </div>
            </div>

            {/* Slider Navigation Arrows (Desktop, when reviews exist) */}
            {testimonials.length > cardsPerView && (
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
            )}
          </div>
        </div>

        {/* =========================================================================
            2. REVIEWS DISPLAY OR EMPTY STATE
        ========================================================================== */}
        {testimonials.length === 0 ? (
          /* Clean Empty State: Ready for New Reviews & Feedback */
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs text-center max-w-2xl mx-auto space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EAF3FF] dark:bg-[#1E293B] flex items-center justify-center text-[#007AFF] dark:text-[#38BDF8]">
              <Sparkles className="w-8 h-8 text-[#007AFF] animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#172033] dark:text-white">
                {isArabic ? 'جاهزون لاستقبال تقييمك ورأيك!' : 'Ready for Your Review & Feedback!'}
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                {isArabic
                  ? 'تم تحديث قسم التقييمات ليكون جاهزاً بالكامل لاستقبال تجاربكم الجديدة. شاركنا رأيك حول أجهزتك الأصلية وتعاملك مع أرناؤوط ستور في صيدا أو التوصيل لكافة لبنان.'
                  : 'All reviews have been refreshed and prepared to receive your new feedback. Share your experience with our devices and delivery across Lebanon!'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#007AFF]/20 active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isArabic ? 'اكتب تقييمك الآن' : 'Write a Review Now'}</span>
              </button>

              <a
                href={`https://wa.me/${storeSettings.whatsapp || '96181900916'}?text=${encodeURIComponent(
                  isArabic
                    ? 'مرحباً أرناؤوط ستور! أود مشاركة تقييمي وتجربتي مع الشراء والأجهزة.'
                    : 'Hello ARNAOUT STORE! I want to share my customer review and feedback.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm font-bold transition-all cursor-pointer"
              >
                <WhatsApp3DIcon size={18} />
                <span>{isArabic ? 'إرسال رأيك عبر واتساب (81900916)' : 'Send Feedback via WhatsApp'}</span>
              </a>
            </div>
          </div>
        ) : (
          /* Responsive Testimonial Slider when reviews exist */
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
              {testimonials.map((item) => (
                <div
                  key={item.id}
                  style={{ flex: `0 0 ${100 / cardsPerView}%` }}
                  className="px-2.5 sm:px-3"
                >
                  <div className="h-full flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm hover:shadow-xl hover:border-[#007AFF]/50 transition-all duration-300 relative group">
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
                            {item.rating}.0
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
        )}

        {/* =========================================================================
            3. SLIDER CONTROLS & WHATSAPP FEEDBACK LINK
        ========================================================================== */}
        <div className="flex items-center justify-between gap-4 mt-8 pt-4">
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

          {testimonials.length > cardsPerView && (
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
          )}

          {testimonials.length > cardsPerView && (
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
          )}
        </div>
      </div>

      {/* =========================================================================
          4. WRITE A REVIEW & SUBMIT FEEDBACK MODAL
      ========================================================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden text-[#172033] dark:text-[#F8FAFC]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#DCE5F0] dark:border-[#1E293B] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] dark:bg-[#1E293B] flex items-center justify-center text-[#007AFF] dark:text-[#38BDF8]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#172033] dark:text-white">
                      {isArabic ? 'كتابة تقييم ومشاركة رأيك' : 'Submit Customer Review & Feedback'}
                    </h3>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                      {isArabic ? 'أرناؤوط ستور — صيدا وكافة لبنان' : 'ON 3LAA STORE — Saida & All Lebanon'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {isArabic ? 'شكراً لمشاركتك رأيك!' : 'Thank you for your feedback!'}
                  </h4>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    {isArabic
                      ? 'تم نشر تقييمك بنجاح في قسم الآراء والتجارب.'
                      : 'Your review has been successfully posted to our verified reviews board.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {validationError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                      {validationError}
                    </div>
                  )}

                  {/* Rating Selector */}
                  <div>
                    <label className="text-xs font-bold text-[#172033] dark:text-white block mb-1.5">
                      {isArabic ? 'تقييمك العام:' : 'Your Rating:'}
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setRating(starVal)}
                          className="p-1 cursor-pointer transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-7 h-7 ${
                              starVal <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-amber-500 ml-2 rtl:ml-0 rtl:mr-2">
                        {rating} / 5
                      </span>
                    </div>
                  </div>

                  {/* Name and Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#172033] dark:text-slate-300 block mb-1">
                        {isArabic ? 'الاسم الكامل *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isArabic ? 'مثال: كريم سعد' : 'e.g. Karim Saad'}
                        className="w-full bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#172033] dark:text-slate-300 block mb-1">
                        {isArabic ? 'المدينة / المنطقة' : 'City / Area'}
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={isArabic ? 'صيدا، بيروت، صور...' : 'Saida, Beirut, Tyre...'}
                        className="w-full bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF]"
                      />
                    </div>
                  </div>

                  {/* Purchased Device / Service */}
                  <div>
                    <label className="text-xs font-semibold text-[#172033] dark:text-slate-300 block mb-1">
                      {isArabic ? 'الجهاز أو الخدمة التي حصلت عليها' : 'Purchased Device or Service'}
                    </label>
                    <input
                      type="text"
                      value={productPurchased}
                      onChange={(e) => setProductPurchased(e.target.value)}
                      placeholder={isArabic ? 'مثال: iPhone 16 Pro Max أو خدمة OMT' : 'e.g. iPhone 16 Pro Max or OMT Service'}
                      className="w-full bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="text-xs font-semibold text-[#172033] dark:text-slate-300 block mb-1">
                      {isArabic ? 'رأيك وتفاصيل تجربتك *' : 'Your Review & Experience Details *'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={
                        isArabic
                          ? 'اكتب رأيك حول جودة المنتج، سرعة التوصيل، أو التعامل في صيدا ساحة النجمة...'
                          : 'Write about the product quality, fast delivery, or customer service at Nijme Square...'
                      }
                      className="w-full bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3 py-2 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF] resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#172033] dark:hover:text-white cursor-pointer"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold shadow-md shadow-[#007AFF]/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'نشر التقييم' : 'Post Review'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
