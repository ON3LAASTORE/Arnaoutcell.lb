import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { resolveStoreLogoUrl } from '../utils/storeSettingsHelpers';
import {
  Clock,
  Phone,
  Truck,
  ShieldCheck,
  PackageCheck,
  CreditCard,
  Share2,
  Send,
  Check,
  Globe,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { StoreStatusBadge } from './StoreStatusBadge';
import {
  CHOUF_STORE_DATA,
  buildSendToPhoneUrl,
  buildLocationShareData,
} from '../utils/storeLocatorHelpers';

export const StoreLocatorSection: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const phone = storeSettings.phone || '03986718';
  const whatsappPhone = storeSettings.whatsapp || '9613986718';

  const handleShareLocation = async () => {
    const shareData = buildLocationShareData(isArabic);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareData.fullMessage);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <section
      id="store-locator-section"
      data-testid="store-locator-section"
      className="py-16 md:py-24 bg-white dark:bg-[#080D1A] border-b border-[#DCE5F0] dark:border-[#1E293B] transition-colors duration-200 selection:bg-[#007AFF] selection:text-white relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. SECTION HEADER
        ========================================================================== */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#38BDF8] text-xs font-black tracking-wider uppercase border border-[#007AFF]/20">
            <Globe className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>{isArabic ? 'متجر إلكتروني — مقره الشوف' : 'ONLINE TECH STORE — BASED IN CHOUF'}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#172033] dark:text-white tracking-tight">
            {isArabic ? (
              <>
                <span className="text-[#007AFF]">{storeSettings.storeNameAr || 'متجر ON AlAA'}</span> — التوصيل متاح لجميع مناطق لبنان
              </>
            ) : (
              <>
                <span className="text-[#007AFF]">{storeSettings.storeName || 'ON AlAA STORE'}</span> — Delivery Available to All Lebanon
              </>
            )}
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#64748B] dark:text-slate-400 leading-relaxed font-normal">
            {isArabic
              ? 'متجر إلكتروني متخصص بأحدث الهواتف الذكية والإلكترونيات مقره الشوف، مع خدمة شحن سريع وآمن ومباشر لكافة الأراضي اللبنانية وكفالة رسمية معتمدة.'
              : 'Specialized online electronics and smartphone store based in Chouf, offering fast, insured door-to-door delivery across all Lebanon with official warranty.'}
          </p>

          {/* Dynamic Real-time Open/Closed Status Pill */}
          <div className="pt-2 flex justify-center">
            <StoreStatusBadge
              schedule={storeSettings.openingSchedule}
              isArabic={isArabic}
              variant="pill"
            />
          </div>
        </div>

        {/* =========================================================================
            2. TWO-COLUMN RESPONSIVE LAYOUT
        ========================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* -----------------------------------------------------------------------
              LEFT COLUMN: STORE INFO, CONTACT & AMENITIES
          ------------------------------------------------------------------------ */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm space-y-6">
              {/* Store Identity Badge */}
              <div className="flex items-center justify-between border-b border-[#DCE5F0] dark:border-[#1E293B] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-13 h-13 rounded-full overflow-hidden bg-[#000000] p-[2px] border border-[#1E3A5F]/85 ring-1 ring-[#007AFF]/35 shadow-[0_0_14px_rgba(0,122,255,0.28)] shrink-0 flex items-center justify-center">
                    <img
                      src={resolveStoreLogoUrl(storeSettings.logoUrl)}
                      alt={storeSettings.storeName || 'ON AlAA STORE'}
                      className="w-full h-full rounded-full object-contain object-center"
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#172033] dark:text-white leading-tight">
                      {isArabic ? (storeSettings.storeNameAr || 'متجر ON AlAA') : (storeSettings.storeName || 'ON AlAA STORE')}
                    </h3>
                    <span className="text-[11px] text-[#007AFF] dark:text-[#38BDF8] font-bold">
                      {isArabic ? 'متجر إلكتروني — مقره الشوف' : 'Online Store — Based in Chouf'}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {isArabic ? 'توصيل لكل لبنان' : 'All Lebanon'}
                </div>
              </div>

              {/* Delivery Hub Location Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#162038] border border-[#BAE6FD] dark:border-[#1E3A5F] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-[#007AFF]" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-slate-400 block">
                      {isArabic ? 'المقر ومركز العمليات:' : 'Hub & Operations Base:'}
                    </span>
                    <span className="text-xs font-black text-[#172033] dark:text-white">
                      {isArabic ? CHOUF_STORE_DATA.landmarkAr : CHOUF_STORE_DATA.landmarkEn}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#EAF3FF] dark:bg-[#132238] text-[#007AFF] text-[10px] font-bold">
                  Lebanon
                </span>
              </div>

              {/* Hours / Schedule */}
              <div className="space-y-1.5 text-xs text-[#64748B] dark:text-slate-400">
                <div className="flex items-center gap-2 font-semibold text-[#172033] dark:text-white">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>{isArabic ? 'مواعيد استقبال الطلبات والدعم:' : 'Order Reception & Support:'}</span>
                </div>
                <p className="text-xs font-bold text-[#172033] dark:text-white rtl:pr-6 ltr:pl-6">
                  {isArabic ? CHOUF_STORE_DATA.openingHoursAr : CHOUF_STORE_DATA.openingHoursEn}
                </p>
                <p className="text-[11px] rtl:pr-6 ltr:pl-6 text-[#64748B] dark:text-slate-400">
                  {isArabic
                    ? 'يمكنكم إرسال الطلبات عبر الموقع والواتساب في أي وقت على مدار الساعة.'
                    : 'Place orders through our website or WhatsApp 24/7 anytime.'}
                </p>
              </div>

              {/* Direct Contact Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B]">
                <a
                  href={`tel:${phone}`}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-white flex items-center gap-3 transition-colors shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#EAF3FF] dark:bg-[#132238] flex items-center justify-center text-[#007AFF]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] dark:text-slate-400 block font-semibold">
                      {isArabic ? 'اتصال مباشر:' : 'Direct Call:'}
                    </span>
                    <span dir="ltr" className="text-xs font-black inline-block">03 986 718</span>
                  </div>
                </a>

                <a
                  href={`https://wa.me/9613986718`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-500 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 transition-colors shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-emerald-900/50 flex items-center justify-center">
                    <WhatsApp3DIcon size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                      {isArabic ? 'محادثة واتساب:' : 'WhatsApp:'}
                    </span>
                    <span dir="ltr" className="text-xs font-black inline-block">03 986 718</span>
                  </div>
                </a>
              </div>

              {/* Primary User Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <a
                  href={`https://wa.me/9613986718`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{isArabic ? 'طلب فوري عبر واتساب 03986718' : 'Order via WhatsApp 03986718'}</span>
                </a>

                <button
                  onClick={handleShareLocation}
                  className="px-4 py-3 rounded-2xl bg-[#EAF3FF] dark:bg-[#1E293B] hover:bg-[#DCE5F0] text-[#007AFF] dark:text-[#38BDF8] border border-[#BAE6FD] dark:border-[#1E3A5F] text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {copiedShareLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedShareLink ? (isArabic ? 'تم نسخ الرابط!' : 'Copied!') : (isArabic ? 'مشاركة المتجر' : 'Share Store')}</span>
                </button>
              </div>
            </div>

            {/* Store Service Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-1">
                <Truck className="w-4 h-4 text-[#007AFF] mx-auto" />
                <span className="text-[10px] font-bold text-[#172033] dark:text-slate-200 block">
                  {isArabic ? 'توصيل لكافة لبنان' : 'All Lebanon Delivery'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto" />
                <span className="text-[10px] font-bold text-[#172033] dark:text-slate-200 block">
                  {isArabic ? 'أجهزة أصلية 100%' : '100% Authentic'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-1">
                <PackageCheck className="w-4 h-4 text-amber-500 mx-auto" />
                <span className="text-[10px] font-bold text-[#172033] dark:text-slate-200 block">
                  {isArabic ? 'كفالة رسمية' : 'Official Warranty'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-1">
                <CreditCard className="w-4 h-4 text-purple-500 mx-auto" />
                <span className="text-[10px] font-bold text-[#172033] dark:text-slate-200 block">
                  {isArabic ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                </span>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              RIGHT COLUMN: NATIONWIDE DELIVERY COVERAGE & SERVICE GUARANTEES
          ------------------------------------------------------------------------ */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="h-full rounded-3xl overflow-hidden border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF] dark:from-[#0E1726] dark:to-[#132238] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#007AFF] text-white flex items-center justify-center shadow-lg shadow-[#007AFF]/25">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase text-[#007AFF] dark:text-[#38BDF8] tracking-wider block">
                        {isArabic ? 'تغطية الشحن السريع' : 'EXPRESS DELIVERY COVERAGE'}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[#172033] dark:text-white">
                        {isArabic ? 'التوصيل متاح لجميع مناطق لبنان 🚚' : 'Delivery Available to All Lebanon 🚚'}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
                  {isArabic
                    ? 'نوفر خدمة التوصيل السريع والمضمون إلى باب بيتك أو مكان عملك في جميع المدن والقرى اللبنانية. يتم فحص كل جهاز بعناية وتغليفه بإحكام مع كفالة رسمية وضمان تشغيل كامل.'
                    : 'We deliver fast and securely to your doorstep or workplace across all Lebanese cities and towns. Every product is inspected, safely packaged, and backed by full official warranty.'}
                </p>

                {/* Delivery Zone Cards */}
                <div className="space-y-3 pt-2">
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-[#172033] dark:text-white">
                          {isArabic ? 'منطقة الشوف وجبل لبنان' : 'Chouf & Mount Lebanon'}
                        </h4>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                          {isArabic ? 'توصيل فوري خلال 24 ساعة كحد أقصى' : 'Express dispatch within 24 hours max'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-black border border-emerald-200 dark:border-emerald-800">
                      {isArabic ? 'نفس اليوم / 24 ساعة' : 'Same Day / 24h'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-[#172033] dark:text-white">
                          {isArabic ? 'بيروت الكبرى وضواحيها' : 'Greater Beirut & Suburbs'}
                        </h4>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                          {isArabic ? 'شحن سريع ومباشر 1-2 أيام' : 'Fast direct courier 1-2 days'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-[#EAF3FF] dark:bg-[#132238] text-[#007AFF] dark:text-[#38BDF8] text-xs font-black border border-[#BAE6FD] dark:border-[#1E3A5F]">
                      {isArabic ? '1-2 أيام عمل' : '1-2 Days'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-[#172033] dark:text-white">
                          {isArabic ? 'كافة المحافظات اللبنانية (الشمال، الجنوب، البقاع)' : 'All Lebanon (North, South, Bekaa)'}
                        </h4>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                          {isArabic ? 'تغطية شاملة لكافة البلدات والمناطق' : 'Complete nationwide coverage to any town'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 text-xs font-black border border-purple-200 dark:border-purple-800">
                      {isArabic ? '1-3 أيام' : '1-3 Days'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom CTA Bar */}
              <div className="pt-4 border-t border-[#DCE5F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#172033] dark:text-white font-bold">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>
                    {isArabic ? 'كفالة رسمية + دعم فني متواصل' : 'Official Warranty + Dedicated Support'}
                  </span>
                </div>

                <a
                  href="https://wa.me/9613986718"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-[#007AFF]/25 transition-all cursor-pointer active:scale-95"
                >
                  <WhatsApp3DIcon size={18} />
                  <span>{isArabic ? 'طلب توصيل عبر واتساب (03986718)' : 'Order Delivery on WhatsApp (03986718)'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
