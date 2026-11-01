import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  MapPin,
  Phone,
  Clock,
  MessageSquare,
  Send,
  CheckCircle,
  Building2,
  Sparkles,
  Navigation,
  Share2,
  Copy,
  Check,
  Compass,
  ExternalLink,
} from 'lucide-react';
import { WhatsApp3DIcon } from '../components/icons/ThreeDIcons';
import { StoreStatusBadge } from '../components/StoreStatusBadge';
import {
  SAIDA_STORE_DATA,
  buildLiveRouteUrl,
  buildSendToPhoneUrl,
  buildLocationShareData,
} from '../utils/storeLocatorHelpers';

export const ContactPage: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copiedPlusCode, setCopiedPlusCode] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleCopyPlusCode = async () => {
    try {
      await navigator.clipboard.writeText(SAIDA_STORE_DATA.plusCode);
      setCopiedPlusCode(true);
      setTimeout(() => setCopiedPlusCode(false), 2200);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
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
        // fallback
      }
    }

    try {
      await navigator.clipboard.writeText(shareData.fullMessage);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) return;
    setSubmitted(true);
    setName('');
    setPhone('');
    setMessage('');
  };

  return (
    <div className="py-12 md:py-20 bg-white dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] dark:bg-[#132238] border border-[#BAE6FD] dark:border-[#1E3A5F] text-[#007AFF] text-xs font-bold tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>{isArabic ? 'صيدا — ساحة النجمة' : 'SAIDA - NEJMEH FLAGSHIP STORE'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#172033] dark:text-white">
            {isArabic ? SAIDA_STORE_DATA.nameAr : SAIDA_STORE_DATA.name}
          </h1>

          <p className="text-[#64748B] dark:text-slate-400 text-xs sm:text-sm">
            {isArabic
              ? 'موقعنا الاستراتيجي في ساحة النجمة بصيدا. تفضل بزيارتنا أو تواصل معنا للاستفسار عن الأجهزة، الصيانة، وخدمات التحويل المالي.'
              : 'Our central location at Nejmeh Square in Sidon. Visit our showroom or get in touch for device inquiries, warranty, and orders.'}
          </p>

          {/* Dynamic Live Status Indicator */}
          <div className="pt-2 flex justify-center">
            <StoreStatusBadge
              schedule={storeSettings.openingSchedule}
              isArabic={isArabic}
              variant="pill"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Information & GPS Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DCE5F0] dark:border-[#1E293B] pb-3">
                <h3 className="text-base font-bold text-[#172033] dark:text-white">
                  {isArabic ? 'معلومات الموقع والاتصال' : 'Location & Store Info'}
                </h3>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  {isArabic ? 'مفتوح 17 ساعة' : 'Open 17 hours'}
                </span>
              </div>

              {/* Dynamic Status Card */}
              <StoreStatusBadge
                schedule={storeSettings.openingSchedule}
                isArabic={isArabic}
                variant="detailed"
              />

              {/* Plus Code & GPS Box */}
              <div className="p-4 rounded-2xl bg-[#EAF3FF] dark:bg-[#132238] border border-[#BAE6FD] dark:border-[#1E3A5F] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#007AFF] dark:text-[#38BDF8] uppercase tracking-wider block">
                    {isArabic ? 'رمز بلس (Google Plus Code):' : 'Google Plus Code:'}
                  </span>
                  <span className="text-base font-black font-mono text-[#172033] dark:text-white">
                    {SAIDA_STORE_DATA.plusCode}
                  </span>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-400 block">
                    GPS: 33.5623° N, 35.3722° E
                  </span>
                </div>

                <button
                  onClick={handleCopyPlusCode}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E1726] text-[#007AFF] text-xs font-bold border border-[#BAE6FD] flex items-center gap-1 cursor-pointer"
                >
                  {copiedPlusCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPlusCode ? (isArabic ? 'تم!' : 'Copied!') : (isArabic ? 'نسخ' : 'Copy')}</span>
                </button>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block font-semibold">
                    {isArabic ? 'الهاتف المباشر:' : 'Direct Call:'}
                  </span>
                  <a
                    href="tel:81900916"
                    className="text-base font-black text-[#172033] dark:text-white hover:text-[#007AFF] transition-colors"
                  >
                    81 900 916
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <WhatsApp3DIcon size={24} />
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block font-semibold">
                    {isArabic ? 'خدمة واتساب الرسمية:' : 'Official WhatsApp:'}
                  </span>
                  <a
                    href="https://wa.me/96181900916"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-[#16A34A] hover:underline"
                  >
                    +961 81 900 916
                  </a>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block font-semibold">
                    {isArabic ? 'العنوان الجغرافي:' : 'Physical Address:'}
                  </span>
                  <p className="text-[#172033] dark:text-white font-semibold leading-relaxed">
                    {isArabic ? SAIDA_STORE_DATA.addressAr : SAIDA_STORE_DATA.addressEn}
                  </p>
                  <p className="text-[11px] text-[#007AFF] font-bold">
                    {isArabic ? SAIDA_STORE_DATA.landmarkAr : SAIDA_STORE_DATA.landmarkEn}
                  </p>
                </div>
              </div>

              {/* Hours ("Open 17 hours") */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-[#64748B] dark:text-slate-400 block font-semibold">
                    {isArabic ? 'ساعات العمل الرسمية:' : 'Store Opening Schedule:'}
                  </span>
                  <p className="text-xs font-black text-purple-600 dark:text-purple-400">
                    {isArabic ? 'مفتوح 17 ساعة يومياً (8:00 ص – 1:00 ص)' : 'Open 17 hours daily (8:00 AM – 1:00 AM)'}
                  </p>
                  <p className="text-xs font-semibold text-[#172033] dark:text-white">
                    {isArabic ? SAIDA_STORE_DATA.openingHoursAr : SAIDA_STORE_DATA.openingHoursEn}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Live Route & Send to phone 81900916 & Share */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B]">
                <a
                  href={SAIDA_STORE_DATA.googleDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'الطريق الحي' : 'Live Route'}</span>
                </a>

                <a
                  href={buildSendToPhoneUrl('81900916', 'whatsapp', isArabic)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <WhatsApp3DIcon size={16} />
                  <span>{isArabic ? 'إرسال 81900916' : 'Send 81900916'}</span>
                </a>

                <button
                  onClick={handleShare}
                  className="px-3 py-2.5 rounded-xl bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-slate-200 text-[#172033] dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-[#007AFF]" />}
                  <span>{copiedShare ? (isArabic ? 'تم!' : 'Copied!') : (isArabic ? 'مشاركة' : 'Share')}</span>
                </button>
              </div>
            </div>

            {/* Interactive Saida Map Visual Card */}
            <div className="rounded-3xl overflow-hidden border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC] dark:bg-[#0E1726] relative h-64 shadow-xs">
              <iframe
                title="SQUARE ARNAOUT CELL STORE Map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=35.3610%2C33.5550%2C35.3830%2C33.5690&layer=mapnik&marker=33.5623%2C35.3722"
                className="w-full h-full border-0 absolute inset-0 filter saturate-125 dark:invert dark:hue-rotate-180"
                loading="lazy"
              />

              <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/95 dark:bg-[#0E1726]/95 backdrop-blur-md p-3 rounded-2xl border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-[#172033] dark:text-white block">
                    {isArabic ? 'صيدا — ساحة النجمة' : 'Saida — Nejmeh Square'}
                  </span>
                  <span className="text-[10px] text-[#64748B] font-mono">
                    H97G+W2P, Sidon
                  </span>
                </div>

                <a
                  href={SAIDA_STORE_DATA.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#007AFF] text-white text-[11px] font-bold flex items-center gap-1"
                >
                  <span>{isArabic ? 'خرائط Google' : 'Google Maps'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Contact & Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#172033] dark:text-white mb-1">
                  {isArabic ? 'أرسل استفسارك أو طلبك' : 'Send an Inquiry or Feedback'}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  {isArabic
                    ? 'سيقوم فريق الدعم الفني بالرد عليكم ومساعدتكم فوراً.'
                    : 'Fill in your details and our team will get in touch promptly.'}
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-[#16A34A] mx-auto" />
                  <h4 className="text-sm font-bold text-[#172033] dark:text-white">
                    {isArabic ? 'تم إرسال رسالتكم بنجاح!' : 'Message Received!'}
                  </h4>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    {isArabic
                      ? 'شكراً لتواصلكم مع سكوير أرناؤوط سيل ستور صيدا. سنتصل بكم على الرقم المسجل في أقرب وقت.'
                      : 'Thank you for contacting SQUARE ARNAOUT CELL STORE. We will get back to you shortly.'}
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-3 px-4 py-2 rounded-xl bg-white dark:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#334155] text-xs font-semibold text-[#172033] dark:text-white hover:bg-[#F5F8FC]"
                  >
                    {isArabic ? 'إرسال رسالة أخرى' : 'Send another message'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs text-[#172033] dark:text-slate-300 font-semibold block mb-1.5">
                      {isArabic ? 'الاسم الكريم' : 'Full Name'} <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Walid S."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#FFFFFF] dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#172033] dark:text-slate-300 font-semibold block mb-1.5">
                      {isArabic ? 'رقم الهاتف اللبناني' : 'Phone Number'} <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="81 900 916 / 70 xxx xxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#FFFFFF] dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#172033] dark:text-slate-300 font-semibold block mb-1.5">
                      {isArabic ? 'تفاصيل الاستفسار أو الجهاز المطلوب' : 'Message / Requested Gadget'} <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder={isArabic ? 'اكتب استفسارك عن الأسعار، الصيانة، أو خدمات OMT...' : 'Enter your question about products, warranty, or OMT services...'}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-[#FFFFFF] dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-md shadow-[#007AFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isArabic ? 'إرسال الرسالة الآن' : 'Send Message Now'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
