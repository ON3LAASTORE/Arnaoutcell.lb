import React from 'react';
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
  Coffee,
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { checkStoreOpenStatus } from '../utils/storeSchedule';
import {
  SAIDA_STORE_DATA,
  buildWhatsAppLocationUrl,
} from '../utils/storeLocatorHelpers';

export const StoreLocatorSection: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const scheduleInfo = checkStoreOpenStatus(storeSettings.openingSchedule);

  const phone = storeSettings.phone || SAIDA_STORE_DATA.phone;
  const whatsappPhone = storeSettings.whatsapp || SAIDA_STORE_DATA.whatsapp;

  return (
    <section
      data-testid="store-locator-section"
      className="py-16 md:py-24 bg-white dark:bg-[#080D1A] border-b border-[#DCE5F0] dark:border-[#1E293B] transition-colors duration-200 selection:bg-[#007AFF] selection:text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. SECTION HEADER
        ========================================================================== */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#38BDF8] text-xs font-black tracking-wider uppercase border border-[#007AFF]/20">
            <Building2 className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>{isArabic ? 'معرضنا ومستودعنا في صيدا' : 'PHYSICAL SHOWROOM & STORE LOCATOR'}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#172033] dark:text-white tracking-tight">
            {isArabic ? (
              <>
                تفضل بزيارة <span className="text-[#007AFF]">أرناؤوط ستور</span> في ساحة النجمة — صيدا
              </>
            ) : (
              <>
                Visit <span className="text-[#007AFF]">ARNAOUT STORE</span> at Nijme Square — Saida
              </>
            )}
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#64748B] dark:text-slate-400 leading-relaxed font-normal">
            {isArabic
              ? 'موقعنا الاستراتيجي في قلب مدينة صيدا بساحة النجمة. تفضل بزيارتنا لمعاينة أحدث الهواتف الذكية والأجهزة التقنية، الاستلام الفوري، وخدمة الصيانة والكفالة المعتمدة.'
              : 'Our central flagship showroom in downtown Saida at Nijme Square. Visit us to experience the latest flagship phones, pick up online orders, or get on-site warranty service.'}
          </p>
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
                    AS
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#172033] dark:text-white leading-tight">
                      {isArabic ? storeSettings.storeNameAr || 'أرناؤوط ستور صيدا' : storeSettings.storeName}
                    </h3>
                    <span className="text-[11px] text-[#007AFF] dark:text-[#38BDF8] font-bold">
                      {isArabic ? 'الفرع الرئيسي • صيدا' : 'Flagship Store • Saida'}
                    </span>
                  </div>
                </div>

                {/* Live Real-time Status Badge */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                    scheduleInfo.isOpen
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      scheduleInfo.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span>{isArabic ? scheduleInfo.statusBadgeAr : scheduleInfo.statusBadgeEn}</span>
                </div>
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

              {/* Official Business Hours Block */}
              <div className="flex items-start gap-4 pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B]">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                    {isArabic ? 'ساعات الدوام الرسمية:' : 'Opening Hours (17h Daily):'}
                  </span>
                  <p className="text-sm font-black text-[#172033] dark:text-white">
                    {isArabic
                      ? '8:00 صباحاً – 1:00 بعد منتصف الليل'
                      : '8:00 AM – 1:00 AM (Next Day)'}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-extrabold">
                    {isArabic
                      ? 'مفتوح يومياً طيلة أيام الأسبوع (17 ساعة متواصلة)'
                      : 'Open Every Day — 17 Continuous Hours Daily'}
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
                  href={buildWhatsAppLocationUrl(whatsappPhone, isArabic)}
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
              RIGHT COLUMN: INTERACTIVE MAP VIEW WITH DIRECT GOOGLE MAPS LINK
          ------------------------------------------------------------------------ */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="h-full min-h-[380px] sm:min-h-[440px] rounded-3xl overflow-hidden border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm relative bg-[#E2E8F0] dark:bg-[#111A2E] flex flex-col">
              {/* Embedded Map Visual Canvas */}
              <div className="relative flex-1 w-full h-full min-h-[300px]">
                {/* Real OpenStreetMap / Carto Leaflet Iframe for Saida Nijme Square Coordinates */}
                <iframe
                  title="Saida Nijme Square Store Location Map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=35.3620%2C33.5560%2C35.3810%2C33.5700&layer=mapnik&marker=33.5631%2C35.3718"
                  className="w-full h-full border-0 absolute inset-0 filter saturate-125 dark:invert dark:hue-rotate-180 dark:contrast-90"
                  loading="lazy"
                />

                {/* Pulsating Map Pin Anchor on Top Center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center">
                  <div className="relative">
                    <span className="absolute -inset-2 rounded-full bg-[#007AFF]/40 animate-ping" />
                    <div className="relative px-3.5 py-1.5 rounded-2xl bg-[#007AFF] text-white text-xs font-black shadow-xl flex items-center gap-1.5 border-2 border-white">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>ARNAOUT STORE</span>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-[#007AFF] rotate-45 -mt-1.5 border-r border-b border-white" />
                </div>

                {/* Map Floating Top Badge */}
                <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 z-20 bg-white/95 dark:bg-[#0E1726]/95 backdrop-blur-md p-2.5 rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] shadow-md flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-black text-[#172033] dark:text-white">
                    {isArabic ? 'ساحة النجمة — صيدا (وسط المدينة)' : 'Nijme Square — Saida Center'}
                  </span>
                </div>
              </div>

              {/* Map Footer Bar with Action CTA Buttons */}
              <div className="p-4 sm:p-5 bg-white dark:bg-[#0E1726] border-t border-[#DCE5F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left rtl:sm:text-right">
                  <h4 className="text-xs sm:text-sm font-black text-[#172033] dark:text-white">
                    {isArabic ? 'طريقة الوصول والتوجيه عبر GPS' : 'GPS Coordinates & Live Route'}
                  </h4>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    33.5631° N, 35.3718° E • Saida, Lebanon
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Google Directions Button */}
                  <a
                    href={SAIDA_STORE_DATA.googleDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#162038] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] text-[#172033] dark:text-white border border-[#DCE5F0] dark:border-[#1E293B] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>{isArabic ? 'الاتجاهات' : 'Get Directions'}</span>
                  </a>

                  {/* Primary Google Maps Button */}
                  <a
                    href={SAIDA_STORE_DATA.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#007AFF]/25 active:scale-95"
                  >
                    <span>{isArabic ? 'فتح في خرائط Google' : 'Open in Google Maps'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
