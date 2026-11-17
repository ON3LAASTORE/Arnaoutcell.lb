import React, { useState, useRef } from 'react';
import { useShop } from '../context/ShopContext';
import { subscribeToNewsletter } from '../services/newsletterService';
import { validateNewsletterEmail } from '../utils/newsletterHelpers';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const NewsletterFooterSection: React.FC = () => {
  const { lang } = useShop();
  const isArabic = lang === 'ar';

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    alreadySubscribed?: boolean;
    subscribedEmail?: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validation = validateNewsletterEmail(email);
    if (!validation.valid) {
      setResult({
        success: false,
        message: isArabic
          ? validation.errorAr || 'يرجى إدخال بريد إلكتروني صحيح.'
          : validation.errorEn || 'Please enter a valid email address.',
      });
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const [res] = await Promise.all([
        subscribeToNewsletter(validation.normalizedEmail, lang, 'footer'),
        new Promise((resolve) => setTimeout(resolve, 260)),
      ]);

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
      className="pb-10 mb-10 border-b border-white/[0.08]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Left Column: Editorial Copy */}
        <div className="lg:col-span-6 space-y-2">
          <h3
            id="footer-newsletter-heading"
            className="text-lg sm:text-xl font-bold text-white tracking-tight"
          >
            {isArabic
              ? 'اشترك في نشرتنا البريدية لأحدث العروض التقنية'
              : 'Subscribe to our Newsletter'}
          </h3>

          <p className="text-[13.5px] text-[#9CA3AF] leading-relaxed max-w-xl">
            {isArabic
              ? 'احصل على أحدث وصولات الهواتف والأجهزة الإلكترونية والتخفيضات الحصرية مباشرة إلى بريدك الإلكتروني.'
              : 'Get updates on new smartphone arrivals, flash electronics deals, and exclusive offers in Chouf and across Lebanon.'}
          </p>
        </div>

        {/* Right Column: Single Email Input + Primary Submit Button */}
        <div className="lg:col-span-6">
          {result?.success ? (
            <div
              role="status"
              data-testid="newsletter-success"
              className="p-4 sm:px-5 sm:py-4 rounded-xl bg-emerald-950/40 border border-emerald-500/35 text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-sm font-bold text-white">
                    {result.alreadySubscribed
                      ? isArabic
                        ? 'أنت مشترك بالفعل'
                        : 'Already Subscribed'
                      : isArabic
                      ? 'تم تأكيد اشتراكك بنجاح'
                      : 'Subscription Confirmed'}
                  </h4>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">{result.message}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs text-[#38BDF8] hover:text-white hover:underline font-semibold cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BAF2] rounded"
              >
                {isArabic ? 'تسجيل بريد آخر' : 'Use another email'}
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit} className="space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="relative flex-1 min-w-0">
                  <label htmlFor="footer-newsletter-email" className="sr-only">
                    {isArabic ? 'البريد الإلكتروني' : 'Email address'}
                  </label>
                  <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>

                  <input
                    ref={inputRef}
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
                        : 'Enter your email address'
                    }
                    aria-invalid={Boolean(result && !result.success)}
                    aria-describedby={result && !result.success ? errorId : undefined}
                    disabled={isSubmitting}
                    className={`w-full h-11 pl-10 pr-4 rtl:pl-4 rtl:pr-10 rounded-[10px] bg-[#1E2328] border text-white placeholder-[#9CA3AF] text-sm focus:outline-none transition-colors ${
                      result && !result.success
                        ? 'border-red-500/70 focus:border-red-400 focus:ring-2 focus:ring-red-500/30'
                        : 'border-white/[0.12] focus:border-[#00BAF2] focus:ring-2 focus:ring-[#00BAF2]/30'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  data-testid="newsletter-submit-btn"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="h-11 px-6 rounded-[10px] bg-[#00BAF2] hover:bg-[#00A2D4] text-[#0B1117] text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                      <span>{isArabic ? 'جارٍ الاشتراك...' : 'Subscribing...'}</span>
                    </>
                  ) : (
                    <span>{isArabic ? 'اشترك الآن' : 'Subscribe'}</span>
                  )}
                </button>
              </div>

              {result && !result.success && (
                <div
                  id={errorId}
                  role="alert"
                  data-testid="newsletter-error"
                  className="flex items-center gap-2 text-red-400 text-xs font-medium pt-0.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{result.message}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
