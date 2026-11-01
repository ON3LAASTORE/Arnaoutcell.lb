import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  MapPin,
  Clock,
  Phone,
  Navigation,
  ExternalLink,
  Building2,
  CheckCircle2,
  Sparkles,
  Car,
  Wrench,
  PackageCheck,
  CreditCard,
  Share2,
  Send,
  Copy,
  Check,
  Radio,
  Compass,
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { StoreStatusBadge } from './StoreStatusBadge';
import { StoreLocationModal } from './StoreLocationModal';
import {
  SAIDA_STORE_DATA,
  buildWhatsAppLocationUrl,
  buildLiveRouteUrl,
  buildSendToPhoneUrl,
  buildLocationShareData,
} from '../utils/storeLocatorHelpers';

export const StoreLocatorSection: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const [copiedPlusCode, setCopiedPlusCode] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const phone = storeSettings.phone || SAIDA_STORE_DATA.phone;
  const whatsappPhone = storeSettings.whatsapp || SAIDA_STORE_DATA.whatsapp;

  const handleCopyPlusCode = async () => {
    try {
      await navigator.clipboard.writeText(SAIDA_STORE_DATA.plusCode);
      setCopiedPlusCode(true);
      setTimeout(() => setCopiedPlusCode(false), 2200);
    } catch {
      // fallback
    }
  };

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
            <Building2 className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>{isArabic ? 'معرضنا في صيدا — ساحة النجمة' : 'SHOWROOM & STORE LOCATOR'}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#172033] dark:text-white tracking-tight">
            {isArabic ? (
              <>
                <span className="text-[#007AFF]">سكوير أرناؤوط سيل ستور</span> — صيدا ساحة النجمة
              </>
            ) : (
              <>
                <span className="text-[#007AFF]">SQUARE ARNAOUT CELL STORE</span>, SAIDA - NEJMEH
              </>
            )}
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#64748B] dark:text-slate-400 leading-relaxed font-normal">
            {isArabic
              ? 'موقعنا الاستراتيجي في قلب مدينة صيدا بساحة النجمة. تفضل بزيارتنا لمعاينة أحدث الهواتف الذكية والأجهزة التقنية، الاستلام الفوري، وخدمة الصيانة والكفالة المعتمدة.'
              : 'Our central flagship showroom in downtown Saida at Nejmeh Square. Visit us to experience the latest flagship phones, pick up online orders, or get on-site warranty service.'}
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
            2. TWO-COLUMN RESPONSIVE STORE LOCATOR CARD LAYOUT
        ========================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* -----------------------------------------------------------------------
              LEFT COLUMN: ADDRESS, HOURS, CONTACT & AMENITIES CARD
          ------------------------------------------------------------------------ */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            {/* Address & Business Hours Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm space-y-6">
              {/* Store Identity Badge */}
              <div className="flex items-center justify-between border-b border-[#DCE5F0] dark:border-[#1E293B] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#007AFF] text-white flex items-center justify-center font-black text-lg shadow-md shadow-[#007AFF]/25">
                    SA
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#172033] dark:text-white leading-tight">
                      {isArabic ? SAIDA_STORE_DATA.nameAr : SAIDA_STORE_DATA.name}
                    </h3>
                    <span className="text-[11px] text-[#007AFF] dark:text-[#38BDF8] font-bold">
                      {isArabic ? 'صيدا - ساحة النجمة' : 'SAIDA - NEJMEH, Sidon'}
                    </span>
                  </div>
                </div>

                {/* Operating Duration Pill */}
                <div className="px-3 py-1 rounded-full text-xs font-black bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  {isArabic ? 'مفتوح 17 ساعة' : 'Open 17 hours'}
                </div>
              </div>

              {/* Plus Code Highlight Pill */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#162038] border border-[#BAE6FD] dark:border-[#1E3A5F] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-[#007AFF]" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-slate-400 block">
                      {isArabic ? 'رمز بلس (Google Plus Code):' : 'Google Plus Code:'}
                    </span>
                    <span className="text-xs font-black font-mono text-[#172033] dark:text-white">
                      {SAIDA_STORE_DATA.plusCode}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCopyPlusCode}
                  className="px-2.5 py-1.5 rounded-xl bg-[#EAF3FF] dark:bg-[#1E293B] hover:bg-[#DCE5F0] text-[#007AFF] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Copy Plus Code"
                >
                  {copiedPlusCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPlusCode ? (isArabic ? 'تم!' : 'Copied!') : (isArabic ? 'نسخ' : 'Copy')}</span>
                </button>
              </div>

              {/* Physical Address Block */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF3FF] dark:bg-[#1A253C] text-[#007AFF] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                    {isArabic ? 'العنوان الجغرافي للمحل:' : 'Store Physical Address:'}
                  </span>
                  <p className="text-sm font-black text-[#172033] dark:text-white leading-snug">
                    {isArabic ? SAIDA_STORE_DATA.addressAr : SAIDA_STORE_DATA.addressEn}
                  </p>
                  <p className="text-xs text-[#007AFF] dark:text-[#38BDF8] font-bold">
                    {isArabic ? SAIDA_STORE_DATA.cityAr : SAIDA_STORE_DATA.cityEn}
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 pt-0.5">
                    {isArabic ? SAIDA_STORE_DATA.landmarkAr : SAIDA_STORE_DATA.landmarkEn}
                  </p>
                </div>
              </div>

              {/* Official Business Hours Block ("Open 17 hours") */}
              <div className="flex items-start gap-4 pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B]">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                    {isArabic ? 'ساعات الدوام الرسمية:' : 'Opening Hours:'}
                  </span>
                  <p className="text-sm font-black text-[#172033] dark:text-white">
                    {isArabic ? '8:00 صباحاً – 1:00 بعد منتصف الليل' : '8:00 AM – 1:00 AM (Next Day)'}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'مفتوح 17 ساعة يومياً طيلة أيام الأسبوع' : 'Open 17 hours daily (Continuous Operation)'}</span>
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    {isArabic
                      ? 'خدمة الاستلام والمعاينة والصيانة مستمرة حتى 1:00 ليلاً.'
                      : 'Orders, pickups, and in-store support available until 1:00 AM.'}
                  </p>
                </div>
              </div>

              {/* Contact Telephone & WhatsApp Quick Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <a
                  href={`tel:${phone}`}
                  className="p-3 rounded-2xl bg-white dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-white flex items-center gap-3 transition-all cursor-pointer group shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] dark:text-slate-400 block font-semibold">
                      {isArabic ? 'اتصال مباشر:' : 'Direct Call:'}
                    </span>
                    <span className="text-xs font-black">81 900 916</span>
                  </div>
                </a>

                <a
                  href={buildSendToPhoneUrl(whatsappPhone, 'whatsapp', isArabic)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-white dark:bg-[#162038] border border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 text-[#172033] dark:text-white flex items-center gap-3 transition-all cursor-pointer group shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <WhatsApp3DIcon size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                      {isArabic ? 'موقع واتساب:' : 'WhatsApp Pin:'}
                    </span>
                    <span className="text-xs font-black">+961 81 900 916</span>
                  </div>
                </a>
              </div>

              {/* Primary User Actions: Send to Phone 81900916 & Share Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Send to phone 81900916 */}
                <a
                  href={buildSendToPhoneUrl('81900916', 'whatsapp', isArabic)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{isArabic ? 'إرسال للهاتف 81900916' : 'Send to phone 81900916'}</span>
                </a>

                {/* Share Location */}
                <button
                  onClick={handleShareLocation}
                  className="px-4 py-3 rounded-2xl bg-[#EAF3FF] dark:bg-[#1E293B] hover:bg-[#DCE5F0] text-[#007AFF] dark:text-[#38BDF8] border border-[#BAE6FD] dark:border-[#1E3A5F] text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {copiedShareLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedShareLink ? (isArabic ? 'تم نسخ الرابط!' : 'Copied!') : (isArabic ? 'مشاركة الموقع' : 'Share')}</span>
                </button>
              </div>
            </div>

            {/* Store Amenities Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-1">
                <Car className="w-4 h-4 text-[#007AFF] mx-auto" />
                <span className="text-[10px] font-bold text-[#172033] dark:text-slate-200 block">
                  {isArabic ? 'مواقف متوفرة' : 'Street Parking'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-1">
                <PackageCheck className="w-4 h-4 text-emerald-500 mx-auto" />
                <span className="text-[10px] font-bold text-[#172033] dark:text-slate-200 block">
                  {isArabic ? 'استلام مجاني' : 'Free Pickup'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-1">
                <Wrench className="w-4 h-4 text-amber-500 mx-auto" />
                <span className="text-[10px] font-bold text-[#172033] dark:text-slate-200 block">
                  {isArabic ? 'صيانة فورية' : 'On-Site Setup'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-1">
                <CreditCard className="w-4 h-4 text-purple-500 mx-auto" />
                <span className="text-[10px] font-bold text-[#172033] dark:text-slate-200 block">
                  {isArabic ? 'USD / Whish' : 'USD & Whish'}
                </span>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              RIGHT COLUMN: INTERACTIVE MAP VIEW WITH DIRECT LIVE ROUTE & GOOGLE MAPS
          ------------------------------------------------------------------------ */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="h-full min-h-[420px] sm:min-h-[480px] rounded-3xl overflow-hidden border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm relative bg-[#E2E8F0] dark:bg-[#111A2E] flex flex-col">
              {/* Embedded Map Visual Canvas */}
              <div className="relative flex-1 w-full h-full min-h-[320px]">
                {/* Real OpenStreetMap frame centered on 33.5623, 35.3722 (Nejmeh Square, Sidon) */}
                <iframe
                  title="SQUARE ARNAOUT CELL STORE Location Map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=35.3610%2C33.5550%2C35.3830%2C33.5690&layer=mapnik&marker=33.5623%2C35.3722"
                  className="w-full h-full border-0 absolute inset-0 filter saturate-125 dark:invert dark:hue-rotate-180 dark:contrast-90"
                  loading="lazy"
                />

                {/* Pulsating Map Pin Anchor on Top Center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center">
                  <div className="relative">
                    <span className="absolute -inset-2 rounded-full bg-[#007AFF]/40 animate-ping" />
                    <div className="relative px-3.5 py-1.5 rounded-2xl bg-[#007AFF] text-white text-xs font-black shadow-xl flex items-center gap-1.5 border-2 border-white">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>SQUARE ARNAOUT CELL STORE</span>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-[#007AFF] rotate-45 -mt-1.5 border-r border-b border-white" />
                </div>

                {/* Map Floating Top Badge: Plus Code & Landmark */}
                <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 z-20 bg-white/95 dark:bg-[#0E1726]/95 backdrop-blur-md p-2.5 rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] shadow-md flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-black text-[#172033] dark:text-white font-mono">
                    H97G+W2P, Sidon
                  </span>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                    • {isArabic ? 'ساحة النجمة صيدا' : 'Nejmeh Square'}
                  </span>
                </div>

                {/* Map Floating Details Button */}
                <div className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 z-20">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-white/95 dark:bg-[#0E1726]/95 backdrop-blur-md text-[#007AFF] text-xs font-black border border-[#DCE5F0] dark:border-[#1E293B] shadow-md flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'تفاصيل الملاحة' : 'Navigation Details'}</span>
                  </button>
                </div>
              </div>

              {/* Map Footer Bar with Action CTA Buttons */}
              <div className="p-4 sm:p-5 bg-white dark:bg-[#0E1726] border-t border-[#DCE5F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left rtl:sm:text-right">
                  <h4 className="text-xs sm:text-sm font-black text-[#172033] dark:text-white">
                    {isArabic ? 'إحداثيات GPS والطريق المباشر' : 'GPS Coordinates & Live Route'}
                  </h4>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono">
                    33.5623° N, 35.3722° E • H97G+W2P, Sidon
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Google Directions / Live Route Button */}
                  <a
                    href={SAIDA_STORE_DATA.googleDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#162038] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] text-[#172033] dark:text-white border border-[#DCE5F0] dark:border-[#1E293B] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>{isArabic ? 'الطريق المباشر' : 'Live Route'}</span>
                  </a>

                  {/* Primary Google Maps Button */}
                  <a
                    href={SAIDA_STORE_DATA.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#007AFF]/25 active:scale-95"
                  >
                    <span>{isArabic ? 'خرائط Google' : 'Google Maps'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Interactive Navigation Modal */}
      <StoreLocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
};
