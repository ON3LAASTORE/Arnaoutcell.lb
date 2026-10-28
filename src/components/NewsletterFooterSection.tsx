import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { subscribeToNewsletter } from '../services/newsletterService';
import {
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
} from 'lucide-react';

export const NewsletterFooterSection: React.FC = () => {
  const { lang, storeSettings } = useShop();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    alreadySubscribed?: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await subscribeToNewsletter(email, lang, 'footer');
      setResult({
        success: res.success,
        message: lang === 'ar' ? res.messageAr : res.messageEn,
        alreadySubscribed: res.alreadySubscribed,
      });

      if (res.success && !res.alreadySubscribed) {
        setEmail('');
      }
    } catch {
      setResult({
        success: false,
        message:
          lang === 'ar'
            ? 'حدث خطأ أثناء الاشتراك. يرجى التحقق من اتصالك والمحاولة مجدداً.'
            : 'An unexpected error occurred. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] text-white p-6 sm:p-10 mb-14 border border-blue-500/20 shadow-xl shadow-blue-950/20">
      {/* Ambient Radial Highlights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#007AFF]/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Headlines & Benefits */}
        <div className="lg:col-span-7 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-[#38BDF8] text-xs font-bold tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {lang === 'ar'
                ? 'نادي أرناؤوط ستور VIP الإخباري'
                : 'ARNAOUT STORE VIP CLUB'}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
            {lang === 'ar'
              ? 'كن أول من يعلم بأحدث الأجهزة والتخفيضات الحصرية'
              : 'Stay Ahead with 2027 Tech Drops & Exclusive Deals'}
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
            {lang === 'ar'
              ? `انضم لأكثر من 2,400+ من عشاق الإلكترونيات في صيدا ولبنان. احصل على عروض فورية بأسعار الدولار النقدي، تنبيهات الأجهزة الجديدة، وهدايا التسوق الحصرية من ${storeSettings.storeNameAr || 'أرناؤوط ستور'}.`
              : `Join 2,400+ tech lovers across Saida and Lebanon. Get early alerts on fresh USD price drops, flash discounts, and flagship device arrivals straight to your inbox.`}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{lang === 'ar' ? 'بدون رسائل مزعجة' : 'Zero Spam Guarantee'}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#38BDF8] flex-shrink-0" />
              <span>{lang === 'ar' ? 'عروض أسعار خاصة للأعضاء' : 'VIP Member Pricing'}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{lang === 'ar' ? 'إلغاء الاشتراك بنقرة واحدة' : '1-Click Unsubscribe'}</span>
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Subscription Form */}
        <div className="lg:col-span-5">
          {result?.success ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {lang === 'ar' ? 'تم تأكيد اشتراكك بنجاح!' : 'Subscription Confirmed!'}
                  </h4>
                  <span className="text-[11px] text-emerald-300/90 font-mono">
                    {lang === 'ar' ? 'عضوية VIP مفعلة' : 'VIP Member Active'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">
                {result.message}
              </p>

              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs text-[#38BDF8] hover:underline font-semibold cursor-pointer pt-1 inline-block"
              >
                {lang === 'ar' ? '← تسجيل بريد إلكتروني آخر' : '← Register another email'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5 text-[#38BDF8]" />
                </div>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'أدخل بريدك الإلكتروني (name@example.com)...'
                      : 'Enter your email (name@example.com)...'
                  }
                  className="w-full pl-11 pr-4 rtl:pl-4 rtl:pr-11 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all shadow-inner"
                  disabled={isSubmitting}
                />
              </div>

              {result && !result.success && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{result.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#007AFF] to-[#0051C6] hover:from-[#0066E0] hover:to-[#0047AF] text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جارٍ الاشتراك...' : 'Subscribing...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    <span>
                      {lang === 'ar' ? 'اشترك في العروض الآن' : 'Subscribe for VIP Deals'}
                    </span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                {lang === 'ar'
                  ? '🔒 بياناتك محمية بالكامل. لن نشارك بريدك مع أي جهة خارجية أبداً.'
                  : '🔒 We respect your privacy. No spam, ever. Unsubscribe with one click.'}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
