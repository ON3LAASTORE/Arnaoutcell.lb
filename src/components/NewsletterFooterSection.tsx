import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { subscribeToNewsletter } from '../services/newsletterService';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Send,
  Loader2,
} from 'lucide-react';

export const NewsletterFooterSection: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    alreadySubscribed?: boolean;
    subscribedEmail?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await subscribeToNewsletter(email, lang, 'footer');
      setResult({
        success: res.success,
        message: isArabic ? res.messageAr : res.messageEn,
        alreadySubscribed: res.alreadySubscribed,
        subscribedEmail: res.email,
      });

      if (res.success && !res.alreadySubscribed) {
        setEmail('');
      }
    } catch {
      setResult({
        success: false,
        message: isArabic
          ? 'حدث خطأ أثناء الاشتراك. يرجى المحاولة مرة أخرى.'
          : 'Unable to complete your subscription right now. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorId = 'footer-newsletter-error';

  return (
    <section
      id="footer-newsletter-section"
      data-testid="newsletter-footer-section"
      dir={isArabic ? 'rtl' : 'ltr'}
      aria-labelledby="footer-newsletter-heading"
      className="relative overflow-hidden rounded-2xl bg-[#0F172A] text-white p-6 sm:p-8 lg:p-10 mb-14 border border-slate-800 shadow-lg"
    >
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Editorial Headline & Benefits */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#38BDF8]">
            <span>{storeSettings.storeName || 'ON AlAA STORE'}</span>
            <span aria-hidden="true" className="text-slate-500">
              ·
            </span>
            <span className="text-slate-300">
              {isArabic ? 'النشرة البريدية للعروض التقنية' : 'Tech Deals & Marketing Updates'}
            </span>
          </div>

          <h3
            id="footer-newsletter-heading"
            className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-snug max-w-2xl"
          >
            {isArabic
              ? 'اشترك للحصول على أحدث العروض التقنية والتخفيضات الحصرية'
              : 'Get Special Tech Deals & Marketing Updates'}
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
            {isArabic
              ? 'انضم إلى قائمة عملائنا في الشوف وكافة مناطق لبنان لتصلك تنبيهات الهواتف الذكية الجديدة، العروض الأسبوعية بالدولار النقدي، والتخفيضات الخاصة مباشرة إلى بريدك الإلكتروني.'
              : 'Join shoppers across Chouf and all Lebanon for direct inbox alerts on flagship smartphone drops, USD cash discounts, and seasonal electronics deals.'}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs text-slate-300">
            <span>{isArabic ? 'بدون رسائل مزعجة' : 'Zero spam guarantee'}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>{isArabic ? 'أسعار خاصة للمشتركين' : 'Subscriber-only deals'}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>{isArabic ? 'إلغاء الاشتراك في أي وقت' : 'Unsubscribe anytime'}</span>
          </div>
        </div>

        {/* Right Column: Subscription Form or Confirmation */}
        <div className="lg:col-span-5">
          {result?.success ? (
            <div
              role="status"
              data-testid="newsletter-success"
              className="p-5 sm:p-6 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-100 space-y-3"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    {result.alreadySubscribed
                      ? isArabic
                        ? 'أنت مشترك بالفعل'
                        : 'Already Subscribed'
                      : isArabic
                      ? 'تم تأكيد اشتراكك بنجاح'
                      : 'Subscription Confirmed'}
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed">{result.message}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs text-[#38BDF8] hover:text-white hover:underline font-semibold cursor-pointer pt-1 inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] rounded"
              >
                <span>
                  {isArabic ? 'تسجيل بريد إلكتروني آخر' : 'Register another email'}
                </span>
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  {isArabic ? 'البريد الإلكتروني' : 'Email address'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-[#38BDF8]">
                    <Mail className="w-4 h-4" />
                  </div>

                  <input
                    id="footer-newsletter-email"
                    data-testid="newsletter-email-input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (result && !result.success) {
                        setResult(null);
                      }
                    }}
                    placeholder={
                      isArabic
                        ? 'أدخل بريدك الإلكتروني (name@example.com)'
                        : 'Enter your email (name@example.com)'
                    }
                    aria-invalid={Boolean(result && !result.success)}
                    aria-describedby={result && !result.success ? errorId : undefined}
                    className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/40 transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {result && !result.success && (
                <div
                  id={errorId}
                  role="alert"
                  data-testid="newsletter-error"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{result.message}</span>
                </div>
              )}

              <button
                type="submit"
                data-testid="newsletter-submit-btn"
                disabled={isSubmitting}
                className="w-full py-3 px-5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isArabic ? 'جارٍ الاشتراك...' : 'Subscribing...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isArabic ? 'اشترك للحصول على العروض' : 'Subscribe for Tech Deals'}
                    </span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 text-center">
                <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span>
                  {isArabic
                    ? 'بياناتك محمية ولن نشارك بريدك الإلكتروني مع أي طرف ثالث.'
                    : 'Your privacy is protected. Unsubscribe at any time.'}
                </span>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
