import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { subscribeToNewsletter } from '../services/newsletterService';
import {
  X,
  Mail,
  Sparkles,
  Gift,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  Flame,
  Loader2,
} from 'lucide-react';
import {
  MODAL_TRIGGER_DELAY_MS,
  SESSION_DISMISS_KEY,
  LOCAL_SUBSCRIBED_FLAG,
  generateWelcomeVoucherCode,
} from '../utils/newsletterModalHelpers';

export const TimedNewsletterModal: React.FC = () => {
  const { lang, currentView, setCurrentView } = useShop();
  const isArabic = lang === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Timer: trigger after 15 seconds on Homepage if not dismissed/subscribed
  useEffect(() => {
    // Only trigger on Homepage
    if (currentView !== 'home') return;

    try {
      const isDismissed = sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true';
      if (isDismissed) return;

      const alreadySubscribed = localStorage.getItem(LOCAL_SUBSCRIBED_FLAG) === 'true';
      if (alreadySubscribed) return;
    } catch {
      // In case storage is blocked in privacy mode
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, MODAL_TRIGGER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [currentView]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
    } catch {
      // safe fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await subscribeToNewsletter(email.trim(), lang, 'timed_modal');

      if (!result.success) {
        setErrorMessage(isArabic ? result.messageAr : result.messageEn);
        setIsSubmitting(false);
        return;
      }

      // Mark as subscribed locally so it doesn't pop up again
      try {
        localStorage.setItem(LOCAL_SUBSCRIBED_FLAG, 'true');
        sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
      } catch {
        // safe fallback
      }

      const voucher = generateWelcomeVoucherCode();
      setSuccessResult({
        code: voucher,
        message: isArabic ? result.messageAr : result.messageEn,
      });
    } catch {
      setErrorMessage(
        isArabic
          ? 'حدث خطأ أثناء الاشتراك. يرجى المحاولة مرة أخرى.'
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyVoucher = () => {
    if (!successResult?.code) return;
    navigator.clipboard.writeText(successResult.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleContinueShopping = () => {
    handleDismiss();
    setCurrentView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          data-testid="timed-newsletter-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleDismiss();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-3xl overflow-hidden bg-gradient-to-b from-[#130E26] via-[#0E0B1F] to-[#070512] border border-purple-500/30 text-white shadow-2xl shadow-purple-950/60"
          >
            {/* Ambient Cosmic Background Orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/25 blur-[90px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 blur-[90px] rounded-full pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close newsletter modal"
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 relative z-10">
              {successResult ? (
                /* Success / Voucher State */
                <div className="text-center space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {isArabic ? '🎉 أهلاً بك في نادي VIP!' : '🎉 Welcome to the VIP Club!'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                      {successResult.message}
                    </p>
                  </div>

                  {/* Exclusive Voucher Box */}
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-purple-300 block">
                      {isArabic ? 'كود خصم الترحيب الحصري ($15 OFF):' : 'Exclusive Welcome Voucher ($15 OFF):'}
                    </span>
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/60 border border-purple-400/30">
                      <span className="font-mono text-base font-black tracking-widest text-[#C084FC]">
                        {successResult.code}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyVoucher}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{isArabic ? 'تم النسخ!' : 'Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isArabic ? 'نسخ الكود' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleContinueShopping}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>{isArabic ? 'تسوّق واستخدم الخصم الآن' : 'Shop & Use Voucher Now'}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              ) : (
                /* Sign-Up Form State */
                <div className="space-y-5 text-center sm:text-left rtl:sm:text-right">
                  {/* VIP Pill & Incentive */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-extrabold tracking-wider uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isArabic ? 'عرض حصري للزوار' : 'VIP VISITOR EXCLUSIVE'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-400/30">
                      <Gift className="w-3 h-3" />
                      <span>{isArabic ? 'وفر $15 على طلبك' : 'Save $15 Today'}</span>
                    </span>
                  </div>

                  {/* Heading & Subtitle */}
                  <div className="space-y-1.5">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                      {isArabic
                        ? 'احصل على خصم $15 وتنبيهات أحدث الأجهزة'
                        : 'Unlock $15 OFF & Exclusive 2027 Tech Drops'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {isArabic
                        ? 'انضم لأكثر من 2,400+ من عشاق الإلكترونيات في صيدا ولبنان. احصل فوراً على كود خصم، تنبيهات أسعار الدولار النقدي، وعروض أوبو وآيفون الاستثنائية.'
                        : 'Join 2,400+ tech lovers across Saida & Lebanon. Receive an instant $15 voucher, fresh cash USD price drop alerts, and VIP flash discounts.'}
                    </p>
                  </div>

                  {/* Benefit Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5">
                      <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>{isArabic ? 'تنبيهات تخفيضات فورية' : 'Early VIP Flash Alerts'}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5">
                      <Flame className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span>{isArabic ? 'عروض أسعار خاصة' : 'Member-Only Pricing'}</span>
                    </div>
                  </div>

                  {/* Email Submission Form */}
                  <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4 text-purple-400" />
                      </div>
                      <input
                        ref={inputRef}
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={
                          isArabic
                            ? 'أدخل بريدك الإلكتروني (name@example.com)...'
                            : 'Enter your email (name@example.com)...'
                        }
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3.5 rounded-2xl bg-black/60 border border-purple-400/30 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                      />
                    </div>

                    {errorMessage && (
                      <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30 text-left rtl:text-right">
                        {errorMessage}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !email.trim()}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group active:scale-98"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isArabic ? 'جارٍ تفعيل الخصم...' : 'Claiming Voucher...'}</span>
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4" />
                          <span>{isArabic ? 'احصل على الخصم واشترك' : 'Claim $15 Voucher & Join'}</span>
                          <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isArabic ? 'بدون أي رسائل مزعجة' : 'Zero Spam Guarantee'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={handleDismiss}
                        className="hover:text-slate-300 underline cursor-pointer"
                      >
                        {isArabic ? 'لا شكراً، سأتصفح فقط' : 'No thanks, browse only'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
