import React, { useState } from 'react';
import {
  X,
  Share2,
  Phone,
  Check,
  Clock,
  Globe,
  Truck,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { StoreStatusBadge } from './StoreStatusBadge';
import { openExternalUrl } from '../utils/navigation';
import {
  CHOUF_STORE_DATA,
  buildSendToPhoneUrl,
  buildLocationShareData,
} from '../utils/storeLocatorHelpers';
import { useShop } from '../context/ShopContext';
import { resolveStoreLogoUrl } from '../utils/storeSettingsHelpers';

interface StoreLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreLocationModal: React.FC<StoreLocationModalProps> = ({ isOpen, onClose }) => {
  const { lang, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const [copiedAll, setCopiedAll] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyAll = async () => {
    try {
      const shareData = buildLocationShareData(isArabic);
      await navigator.clipboard.writeText(shareData.fullMessage);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
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
    handleCopyAll();
  };

  const handleSendToCustomPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhone.trim()) return;
    const url = buildSendToPhoneUrl(customPhone, 'whatsapp', isArabic);
    openExternalUrl(url);
    setSendSuccessMessage(
      isArabic
        ? `تم فتح واتساب للتواصل مع الرقم ${customPhone}`
        : `Opening WhatsApp to contact ${customPhone}`
    );
    setTimeout(() => setSendSuccessMessage(null), 4000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-location-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#0E1726] rounded-3xl shadow-2xl border border-[#DCE5F0] dark:border-[#1E293B] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-[#007AFF] to-[#0051B3] text-white">
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-5 right-5 rtl:right-auto rtl:left-5 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 pr-10 rtl:pr-0 rtl:pl-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[#000000] p-[2px] border border-blue-400/55 ring-1 ring-white/25 shadow-[0_0_18px_rgba(0,122,255,0.45)] shrink-0 flex items-center justify-center">
              <img
                src={resolveStoreLogoUrl(storeSettings.logoUrl)}
                alt={storeSettings.storeName || 'ON AlAA STORE'}
                className="w-full h-full rounded-full object-contain object-center"
              />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black tracking-wider uppercase">
                <Globe className="w-3.5 h-3.5" />
                <span>{isArabic ? 'متجر إلكتروني — مقره الشوف' : 'ONLINE STORE — BASED IN CHOUF'}</span>
              </div>

              <h3 id="store-location-title" className="text-xl sm:text-2xl font-black leading-tight">
                {isArabic ? (storeSettings.storeNameAr || 'متجر ON AlAA') : (storeSettings.storeName || 'ON AlAA STORE')}
              </h3>

              <p className="text-xs sm:text-sm text-blue-100 font-medium flex items-center gap-2">
                <Truck className="w-4 h-4 flex-shrink-0" />
                <span>{isArabic ? 'التوصيل متاح لجميع مناطق لبنان' : 'Delivery Available to All Lebanon'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Status Bar */}
        <div className="p-4 sm:px-8 border-b border-[#DCE5F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#080D1A]">
          <StoreStatusBadge
            schedule={storeSettings.openingSchedule}
            isArabic={isArabic}
            variant="detailed"
          />
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Operations Hub Card */}
          <div className="p-5 rounded-2xl bg-[#EAF3FF] dark:bg-[#132238] border border-[#BAE6FD] dark:border-[#1E3A5F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#38BDF8] uppercase tracking-wider block">
                {isArabic ? 'مقر العمليات والتجهيز:' : 'Operations & Dispatch Hub:'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-[#172033] dark:text-white">
                  {isArabic ? CHOUF_STORE_DATA.landmarkAr : CHOUF_STORE_DATA.landmarkEn}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-300">
                {isArabic ? 'شحن فوري لباب البيت في كافة المحافظات' : 'Door-to-door express delivery nationwide'}
              </p>
            </div>

            <a
              href="https://wa.me/9613986718"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              <WhatsApp3DIcon size={18} />
              <span>{isArabic ? 'واتساب 03986718' : 'WhatsApp 03986718'}</span>
            </a>
          </div>

          {/* Primary Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="tel:03986718"
              className="p-3.5 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white flex flex-col items-center text-center gap-1.5 shadow-md shadow-[#007AFF]/25 transition-all group active:scale-95 cursor-pointer"
            >
              <Phone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black">{isArabic ? 'اتصال مباشر: 03986718' : 'Direct Call: 03986718'}</span>
              <span className="text-[10px] text-blue-100">{isArabic ? 'خدمة العملاء والطلبات' : 'Orders & Support'}</span>
            </a>

            <button
              onClick={handleNativeShare}
              className="p-3.5 rounded-2xl bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-[#2A374F] text-[#172033] dark:text-white flex flex-col items-center text-center gap-1.5 border border-[#DCE5F0] dark:border-[#334155] transition-all active:scale-95 cursor-pointer"
            >
              {copiedAll ? <Check className="w-5 h-5 text-emerald-500" /> : <Share2 className="w-5 h-5 text-[#007AFF]" />}
              <span className="text-xs font-black">{copiedAll ? (isArabic ? 'تم نسخ الرابط!' : 'Copied!') : (isArabic ? 'مشاركة المتجر' : 'Share Store')}</span>
              <span className="text-[10px] text-[#64748B] dark:text-slate-400">{isArabic ? 'مشاركة رابط المتجر' : 'Share Store Link'}</span>
            </button>
          </div>

          {/* Operating Hours Callout */}
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 text-xs">
              <span className="font-black text-purple-900 dark:text-purple-200 block">
                {isArabic ? 'الطلبات أونلاين متاحة 24/7' : 'Online Orders Available 24/7'}
              </span>
              <p className="text-[#172033] dark:text-slate-200 font-bold">
                {isArabic ? CHOUF_STORE_DATA.openingHoursAr : CHOUF_STORE_DATA.openingHoursEn}
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                {isArabic
                  ? 'خدمة العملاء، الاستشارات التقنية، ومتابعة شحنات التوصيل يومياً من 10:00 ص حتى 1:00 بعد منتصف الليل.'
                  : 'Customer support, tech inquiries, and courier tracking are active daily from 10:00 AM until 1:00 AM.'}
              </p>
            </div>
          </div>

          {/* Send to Any Phone Form */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] space-y-3">
            <h4 className="text-xs font-black text-[#172033] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>{isArabic ? 'إرسال تفاصيل المتجر والتوصيل إلى رقم هاتف' : 'Send Store Details to Any Phone'}</span>
            </h4>

            <form onSubmit={handleSendToCustomPhone} className="flex gap-2">
              <input
                type="tel"
                placeholder={isArabic ? 'أدخل رقم الهاتف (مثال: 03986718)' : 'Enter phone number (e.g. 03986718)'}
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <WhatsApp3DIcon size={16} />
                <span>{isArabic ? 'إرسال واتساب' : 'Send'}</span>
              </button>
            </form>

            {sendSuccessMessage && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold animate-fadeIn">
                ✓ {sendSuccessMessage}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-8 bg-[#F8FAFC] dark:bg-[#0A0F1D] border-t border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>{isArabic ? 'كفالة رسمية معتمدة' : 'Official Warranty Guaranteed'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#172033] dark:bg-white text-white dark:text-[#172033] text-xs font-black hover:opacity-90 transition-opacity cursor-pointer"
          >
            {isArabic ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
