import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  CreditCard,
  Smartphone,
  MapPin,
  Phone,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { WhatsApp3DIcon } from '../components/icons/ThreeDIcons';
import { WarrantyCheckerTool } from '../components/WarrantyCheckerTool';
import {
  SERVICES_FAQS,
  SERVICES_FAQ_CATEGORIES,
  ServicesFaqCategory,
  filterServicesFaqs,
} from '../utils/servicesFaqHelpers';

export const ServicesPage: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<ServicesFaqCategory>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>(SERVICES_FAQS[0]?.id ?? null);

  const visibleFaqs = filterServicesFaqs(selectedFaqCategory);

  const handleToggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  const getCategoryIcon = (category: Exclude<ServicesFaqCategory, 'all'>) => {
    switch (category) {
      case 'delivery':
        return <Truck className="w-4 h-4 text-[#007AFF] shrink-0" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-[#007AFF] shrink-0" />;
      case 'warranty':
        return <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />;
    }
  };

  return (
    <div className="relative z-10 py-12 md:py-20 bg-white dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider">
            <CreditCard className="w-4 h-4" />
            <span>{lang === 'ar' ? 'خدمات ويش موني والاتصالات — ON AlAA STORE' : 'WHISH WALLET & TELECOM SERVICES'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#172033]">
            {lang === 'ar' ? 'خدمات ويش موني وتوتش للاتصالات' : 'Whish Money & Touch Services'}
          </h1>
          <p className="text-[#64748B] text-sm sm:text-base leading-relaxed">
            {lang === 'ar'
              ? 'من متجر ON AlAA STORE الإلكتروني في الشوف مع خدمة تغطي كافة مناطق لبنان، نوفر دعم خدمات ويش موني والاتصالات بأعلى معايير السرعة والأمان.'
              : 'Through ON AlAA STORE online hub based in Chouf serving customers across all Lebanon, we assist with Whish Money digital wallet and Touch/Alfa telecom services.'}
          </p>
        </div>

        {/* Online Store & Delivery Notice */}
        <div className="p-6 rounded-3xl bg-[#F5F8FC] border border-[#DCE5F0] mb-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] text-[#007AFF] flex items-center justify-center flex-shrink-0 border border-[#BAE6FD]">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#172033] text-base">
                {lang === 'ar' ? 'متجر إلكتروني في الشوف • توصيل لجميع لبنان' : 'Online Store Based in Chouf • All Lebanon Delivery'}
              </h4>
              <p className="text-xs text-[#64748B] mt-0.5">
                {lang === 'ar' ? storeSettings.locationAr : storeSettings.locationEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:03986718"
              className="px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Phone className="w-4 h-4" />
              <span>03 986 718</span>
            </a>
            <a
              href="https://wa.me/9613986718?text=Hello%20ON%20AlAA%20STORE%2C%20I%20have%20an%20inquiry%20regarding%20Whish%20%26%20Touch%20services"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-700/30 active:scale-95 group"
            >
              <WhatsApp3DIcon size={18} />
              <span>{lang === 'ar' ? 'استفسار / طلب عبر واتساب (03986718)' : 'Inquire / Order on WhatsApp (03986718)'}</span>
            </a>
          </div>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Whish Money */}
          <div className="p-8 rounded-3xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] shadow-xs hover:shadow-[0_4px_20px_-4px_rgba(0,122,255,0.12)] transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD] flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-[#007AFF] px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD]">
                Whish Money Agent
              </span>
            </div>

            <h3 className="text-xl font-bold text-[#172033]">
              {lang === 'ar' ? 'ويش موني — المحفظة الرقمية' : 'Whish Money Hub'}
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {lang === 'ar'
                ? 'شحن رصيد المحفظة الإلكترونية وسحب الكاش بدون تعقيدات، شراء بطاقات الألعاب الرقمية (PlayStation, PUBG, Steam, Xbox)، وشحن اشتراكات الإنترنت.'
                : 'Top-up your Whish digital wallet, cash-out, and buy online gaming cards and digital streaming subscriptions.'}
            </p>

            <div className="space-y-2 pt-2 text-xs text-[#172033]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'سحب وتعبئة كاش فوري' : 'Zero hassle Cash-In and Cash-Out'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'كافة بطاقات الألعاب والتطبيقات' : 'Gaming vouchers and digital gift cards'}</span>
              </div>
            </div>
          </div>

          {/* Touch Store */}
          <div className="p-8 rounded-3xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] shadow-xs hover:shadow-[0_4px_20px_-4px_rgba(0,122,255,0.12)] transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-[#16A34A] px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                Touch Store Certified
              </span>
            </div>

            <h3 className="text-xl font-bold text-[#172033]">
              {lang === 'ar' ? 'توتش ستور وخدمات الخطوط' : 'Touch Store & Mobile Services'}
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {lang === 'ar'
                ? 'خدمات خطوط الهاتف المحمول المعتمدة: شراء خطوط مسبقة ولاحقة الدفع، استخراج بدل ضائع، تجديد وتمديد صلاحية الأيام، وتفعيل باقات الـ 4G/5G.'
                : 'Authorized Touch and Alfa line services: new SIM cards, replacement SIMs, prepaid line validity extension, and 4G/5G data packs.'}
            </p>

            <div className="space-y-2 pt-2 text-xs text-[#172033]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'تبديل شرائح SIM وبدل ضائع فوري' : 'Immediate replacement SIM activation'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'شحن فوري للأيام والدولارات' : 'Instant days and recharge top-ups'}</span>
              </div>
            </div>

            {/* Direct Line for Touch Store: 03 986 718 */}
            <div className="pt-4 border-t border-[#DCE5F0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#64748B] font-semibold">{lang === 'ar' ? 'الخط المباشر لخدمات الخطوط:' : 'Touch Store Direct Line:'}</span>
              <div className="flex items-center gap-2">
                <a
                  href="tel:03986718"
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>03 986 718</span>
                </a>
                <a
                  href="https://wa.me/9613986718?text=Hello%20ON%20AlAA%20STORE%2C%20I%20have%20an%20inquiry%20regarding%20Touch%20telecom%20services"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center gap-1 transition-all"
                  title="WhatsApp: 03 986 718"
                >
                  <WhatsApp3DIcon size={16} />
                  <span>واتساب</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Electronics Warranty Checker */}
        <WarrantyCheckerTool />

        {/* Frequently Asked Questions Section */}
        <section
          aria-labelledby="services-faq-heading"
          className="mt-16 sm:mt-20 pt-14 border-t border-[#DCE5F0] dark:border-[#1E293B]"
        >
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF3FF] dark:bg-[#111A2E] border border-[#BAE6FD] dark:border-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] text-xs font-bold tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>{lang === 'ar' ? 'مركز المساعدة والمعلومات' : 'CUSTOMER HELP & INFORMATION'}</span>
            </div>
            <h2
              id="services-faq-heading"
              className="scroll-mt-24 text-2xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight"
            >
              {lang === 'ar' ? 'الأسئلة الشائعة (FAQ)' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-[#64748B] dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
              {lang === 'ar'
                ? 'إجابات واضحة حول التوصيل لكافة مناطق لبنان، طرق الدفع المعتمدة، وشروط الكفالة الرسمية للأجهزة الإلكترونية.'
                : 'Clear answers to common questions about nationwide Lebanon deliveries, accepted payment methods, and official electronics warranty terms.'}
            </p>
          </div>

          {/* FAQ Category Filter Tabs */}
          <div
            role="group"
            aria-label={lang === 'ar' ? 'تصفية الأسئلة الشائعة' : 'Filter FAQ topics'}
            className="flex flex-wrap items-center justify-center gap-2 mb-8"
          >
            {SERVICES_FAQ_CATEGORIES.map((cat) => {
              const isSelected = selectedFaqCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedFaqCategory(cat.id);
                    const nextList = filterServicesFaqs(cat.id);
                    if (nextList.length > 0 && !nextList.some((item) => item.id === openFaqId)) {
                      setOpenFaqId(nextList[0].id);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25'
                      : 'bg-[#F5F8FC] dark:bg-[#111A2E] text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white border border-[#DCE5F0] dark:border-[#1E293B]'
                  }`}
                >
                  {lang === 'ar' ? cat.labelAr : cat.labelEn}
                </button>
              );
            })}
          </div>

          {/* FAQ Accordion List */}
          <div className="max-w-4xl mx-auto space-y-3">
            {visibleFaqs.map((faq) => {
              const isExpanded = openFaqId === faq.id;
              const panelId = `${faq.id}-panel`;
              const buttonId = `${faq.id}-btn`;

              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-white dark:bg-[#111A2E] border-[#007AFF]/60 dark:border-[#38BDF8]/50 shadow-[0_6px_22px_-6px_rgba(0,122,255,0.12)]'
                      : 'bg-[#F8FAFC] dark:bg-[#0E1726] border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#93C5FD] dark:hover:border-[#007AFF]/50'
                  }`}
                >
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => handleToggleFaq(faq.id)}
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 text-left rtl:text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-[#EAF3FF] dark:bg-[#1A253C] border border-[#BAE6FD]/60 dark:border-[#1E293B] flex items-center justify-center shrink-0">
                        {getCategoryIcon(faq.category)}
                      </span>
                      <span className="font-bold text-sm sm:text-base text-[#172033] dark:text-[#F8FAFC] leading-snug">
                        {lang === 'ar' ? faq.questionAr : faq.questionEn}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-5 h-5 text-[#64748B] dark:text-slate-400 shrink-0 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-[#007AFF] dark:text-[#38BDF8]' : ''
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="px-5 sm:px-6 pb-5 pt-0 text-xs sm:text-sm text-[#475569] dark:text-slate-300 leading-relaxed"
                    >
                      <div className="pt-3 border-t border-[#DCE5F0]/70 dark:border-[#1E293B] pl-11 rtl:pl-0 rtl:pr-11">
                        {lang === 'ar' ? faq.answerAr : faq.answerEn}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Direct Support Callout */}
          <div className="max-w-4xl mx-auto mt-8 p-5 sm:p-6 rounded-2xl bg-[#EAF3FF] dark:bg-[#111A2E] border border-[#BAE6FD] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left rtl:sm:text-right space-y-0.5">
              <p className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">
                {lang === 'ar'
                  ? 'هل لديك سؤال آخر حول الطلب أو الكفالة؟'
                  : 'Still have questions about delivery, payments, or warranty?'}
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                {lang === 'ar'
                  ? 'فريق ON AlAA STORE في الشوف متاح يومياً 8:00 ص – 1:00 ص لخدمة جميع مناطق لبنان.'
                  : 'Our Chouf-based support team is available daily 8:00 AM – 1:00 AM for all Lebanon.'}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href="tel:03986718"
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#0E1726] hover:bg-slate-50 border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#007AFF]" />
                <span dir="ltr">03 986 718</span>
              </a>
              <a
                href="https://wa.me/9613986718?text=Hello%20ON%20AlAA%20STORE%2C%20I%20have%20a%20question%20regarding%20delivery%2C%20payment%2C%20or%20warranty."
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-colors"
              >
                <WhatsApp3DIcon size={16} />
                <span>{lang === 'ar' ? 'تواصل عبر واتساب' : 'Ask on WhatsApp'}</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
