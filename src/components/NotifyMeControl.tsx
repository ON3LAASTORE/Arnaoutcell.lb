import React, { useState, useEffect } from 'react';
import { BellRing, CheckCircle2, Mail, Loader2, X } from 'lucide-react';
import { Product } from '../types';
import {
  subscribeToStockNotification,
  hasPendingLocalSubscription,
} from '../services/stockNotificationService';

interface NotifyMeControlProps {
  product: Product;
  lang: 'en' | 'ar';
  variant?: 'compact' | 'panel';
}

export const NotifyMeControl: React.FC<NotifyMeControlProps> = ({
  product,
  lang,
  variant = 'panel',
}) => {
  const [isExpanded, setIsExpanded] = useState(variant === 'panel');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setStatus('idle');
    setFeedback('');
    setIsExpanded(variant === 'panel');
  }, [product.id, variant]);

  const productTitle = lang === 'ar' ? product.nameAr || product.name : product.name;
  const inputId = `notify-email-${variant}-${product.id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsSubmitting(true);
    setStatus('idle');
    setFeedback('');

    try {
      const result = await subscribeToStockNotification({
        product,
        email,
        lang,
      });

      if (result.success) {
        setStatus('success');
        setFeedback(lang === 'ar' ? result.messageAr : result.messageEn);
        if (!result.alreadySubscribed) {
          setEmail('');
        }
      } else {
        setStatus('error');
        setFeedback(lang === 'ar' ? result.messageAr : result.messageEn);
      }
    } catch (err) {
      setStatus('error');
      setFeedback(
        lang === 'ar'
          ? 'حدث خطأ أثناء حفظ البريد الإلكتروني. يرجى المحاولة مجدداً.'
          : 'Could not register your email right now. Please try again.'
      );
      console.error('Stock notification error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (variant === 'compact' && !isExpanded) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(true);
        }}
        aria-label={
          lang === 'ar'
            ? `أعلمني عند توفر ${productTitle}`
            : `Notify me when ${productTitle} is available`
        }
        data-testid={`notify-trigger-${product.id}`}
        className="w-full py-1.5 sm:py-2 px-2 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700/80 text-amber-800 dark:text-amber-300 font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[36px] sm:min-h-[40px]"
      >
        <BellRing className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">
          {lang === 'ar' ? 'أعلمني عند التوفر' : 'Notify Me When Available'}
        </span>
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      data-testid={`notify-panel-${product.id}`}
      className={
        variant === 'compact'
          ? 'p-2.5 rounded-xl bg-amber-50/90 dark:bg-[#111A2E] border border-amber-300 dark:border-amber-700/70 space-y-2'
          : 'p-4 rounded-2xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-amber-300/80 dark:border-amber-700/60 space-y-2.5'
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-[#172033] dark:text-[#F8FAFC]">
              {lang === 'ar' ? 'أعلمني عند التوفر' : 'Notify Me When Available'}
            </p>
            {variant === 'panel' && (
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5 leading-relaxed">
                {lang === 'ar'
                  ? 'أدخل بريدك الإلكتروني وسنرسل لك تحديثاً تلقائياً فور عودة هذا المنتج للمخزون.'
                  : 'Enter your email and we will send you an automated alert the moment this product is restocked.'}
              </p>
            )}
          </div>
        </div>

        {variant === 'compact' && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            aria-label={lang === 'ar' ? 'إغلاق تنبيه التوفر' : 'Close restock alert form'}
            className="p-1 rounded-md text-[#64748B] hover:text-[#172033] dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {status === 'success' ? (
        <div
          role="status"
          className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold flex items-start gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{feedback}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-1.5">
          <label htmlFor={inputId} className="sr-only">
            {lang === 'ar'
              ? `البريد الإلكتروني لتنبيه توفر ${productTitle}`
              : `Email address for ${productTitle} restock alert`}
          </label>
          <div className="flex flex-col sm:flex-row gap-1.5">
            <div className="relative flex-1">
              <Mail className="w-3.5 h-3.5 text-[#64748B] absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id={inputId}
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') {
                    setStatus('idle');
                    setFeedback('');
                  }
                }}
                placeholder={lang === 'ar' ? 'name@example.com' : 'Enter your email address...'}
                className="w-full bg-white dark:bg-[#0B1220] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-2 text-xs text-[#172033] dark:text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-label={
                lang === 'ar'
                  ? `تفعيل التنبيه لـ ${productTitle}`
                  : `Send restock alert request for ${productTitle}`
              }
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#007AFF] to-[#0055D6] hover:from-[#0066D6] hover:to-[#0048B8] disabled:opacity-60 text-white text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellRing className="w-3.5 h-3.5" />
              )}
              <span>{lang === 'ar' ? 'أعلمني' : 'Notify Me'}</span>
            </button>
          </div>

          {status === 'error' && feedback && (
            <p role="alert" className="text-[11px] font-semibold text-[#DC2626] dark:text-red-400">
              {feedback}
            </p>
          )}

          {email && hasPendingLocalSubscription(product.id, email) && status === 'idle' && (
            <p className="text-[11px] font-medium text-[#007AFF] dark:text-[#38BDF8]">
              {lang === 'ar'
                ? 'هذا البريد مسجل بالفعل لتنبيه التوفر.'
                : 'This email is already queued for a restock alert.'}
            </p>
          )}
        </form>
      )}
    </div>
  );
};
