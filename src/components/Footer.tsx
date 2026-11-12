import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  ShieldCheck,
  Send,
  CreditCard,
  Banknote,
  Smartphone,
  Navigation,
  Share2,
  Compass,
  Check,
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { StoreLogo } from './StoreLogo';
import { NewsletterFooterSection } from './NewsletterFooterSection';
import { StoreStatusBadge } from './StoreStatusBadge';
import {
  SAIDA_STORE_DATA,
  buildSendToPhoneUrl,
  buildLocationShareData,
} from '../utils/storeLocatorHelpers';

export const Footer: React.FC = () => {
  const { lang, t, storeSettings, setCurrentView, selectCategory, selectBrand, categories, brands } = useShop();
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = async () => {
    const shareData = buildLocationShareData(lang === 'ar');
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
      setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      // fallback
    }
  };

  const handlePolicyClick = (policyType: string) => {
    setCurrentView(`policy-${policyType}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-white dark:bg-[#070B14] border-t border-[#DCE5F0] dark:border-[#1E293B] text-[#64748B] dark:text-slate-400 text-xs pt-16 pb-12 relative overflow-hidden transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter Subscription Banner */}
        <NewsletterFooterSection />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Col 1: Brand Info & Location */}
          <div className="lg:col-span-2 space-y-4">
            <StoreLogo
              size="md"
              onClick={() => {
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            <p className="text-[#64748B] dark:text-slate-300 text-xs leading-relaxed max-w-sm">
              {lang === 'ar'
                ? 'متجر إلكتروني مقره الشوف، وجهتكم الرائدة في كافة مناطق لبنان لأحدث الهواتف الذكية، أجهزة اللابتوب، الملحقات والحلول التقنية المعتمدة بكفالة رسمية.'
                : "Online Tech Store based in Chouf with fast delivery available to all Lebanon. Flagship smartphones, high-performance laptops, accessories, and certified warranty."}
            </p>

            {/* Dynamic Real-time Open/Closed Status Indicator */}
            <div className="pt-1">
              <StoreStatusBadge
                schedule={storeSettings.openingSchedule}
                isArabic={lang === 'ar'}
                variant="pill"
              />
            </div>

            {/* Contact & Location details */}
            <div className="space-y-2 pt-1 text-xs">
              <a
                href="tel:03986718"
                className="flex items-center gap-2.5 text-[#172033] dark:text-[#F8FAFC] hover:text-[#007AFF] dark:hover:text-[#38BDF8] transition-colors font-bold"
              >
                <div className="w-7 h-7 rounded-lg bg-[#EAF3FF] dark:bg-[#1E293B] flex items-center justify-center text-[#007AFF] flex-shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <span>03 986 718</span>
              </a>

              <div className="flex items-start gap-2.5 text-[#172033] dark:text-[#F8FAFC]">
                <div className="w-7 h-7 rounded-lg bg-[#EAF3FF] dark:bg-[#1E293B] flex items-center justify-center text-[#007AFF] flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold block">
                    {lang === 'ar' ? SAIDA_STORE_DATA.nameAr : SAIDA_STORE_DATA.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-[#007AFF] dark:text-[#38BDF8]">
                    <span className="font-mono font-bold bg-[#EAF3FF] dark:bg-[#1E293B] px-1.5 py-0.5 rounded">
                      {SAIDA_STORE_DATA.plusCode}
                    </span>
                    <span>• {lang === 'ar' ? 'الشوف • التوصيل متاح لجميع مناطق لبنان' : 'Chouf • Delivery Available to All Lebanon'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-[#64748B] dark:text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-[#172033] dark:text-[#F8FAFC] block">
                    {lang === 'ar' ? 'طلبات أونلاين 24/7 (الدعم: 8:00 ص – 1:00 ص)' : 'ONLINE ORDERS 24/7 (SUPPORT: 8:00 AM – 1:00 AM)'}
                  </span>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-400 block">
                    {lang === 'ar' ? SAIDA_STORE_DATA.openingHoursAr : SAIDA_STORE_DATA.openingHoursEn}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar: WhatsApp & Share */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href={buildSendToPhoneUrl('03986718', 'whatsapp', lang === 'ar')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
              >
                <WhatsApp3DIcon size={14} />
                <span>{lang === 'ar' ? 'طلب فوري عبر واتساب' : 'WhatsApp Order (03986718)'}</span>
              </a>

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-slate-200 text-[#172033] dark:text-white text-[11px] font-bold transition-colors cursor-pointer"
              >
                {copiedShare ? <Check className="w-3 h-3 text-emerald-500" /> : <Share2 className="w-3 h-3 text-[#007AFF]" />}
                <span>{copiedShare ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'مشاركة' : 'Share')}</span>
              </button>
            </div>
          </div>

          {/* Col 2: Popular Categories */}
          <div>
            <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider text-xs mb-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#007AFF]" />
              <span>{t.allCategories}</span>
            </h4>
            <ul className="space-y-2">
              {categories.slice(0, 7).map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => selectCategory(cat.slug)}
                    className="hover:text-[#007AFF] dark:hover:text-[#38BDF8] transition-colors cursor-pointer text-left rtl:text-right"
                  >
                    {lang === 'ar' ? cat.nameAr : cat.name}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setCurrentView('categories')}
                  className="text-[#007AFF] dark:text-[#38BDF8] hover:underline font-semibold"
                >
                  {lang === 'ar' ? 'عرض كافة الأقسام الـ 35 ←' : 'Browse All 35 Departments →'}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Top Brands */}
          <div>
            <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider text-xs mb-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#007AFF]" />
              <span>{t.brands}</span>
            </h4>
            <ul className="space-y-2">
              {brands.slice(0, 7).map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => selectBrand(b.name)}
                    className="hover:text-[#007AFF] dark:hover:text-[#38BDF8] transition-colors cursor-pointer text-left rtl:text-right"
                  >
                    {b.name}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setCurrentView('brands')}
                  className="text-[#007AFF] dark:text-[#38BDF8] hover:underline font-semibold"
                >
                  {lang === 'ar' ? 'دليل الماركات الكامل ←' : 'All Tech Brands →'}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Store Services & Policies */}
          <div>
            <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider text-xs mb-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#007AFF]" />
              <span>{lang === 'ar' ? 'الخدمات والسياسات' : 'Services & Policies'}</span>
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setCurrentView('services')}
                  className="text-[#172033] dark:text-[#F8FAFC] hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:underline font-semibold flex items-center gap-1"
                >
                  <Banknote className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>{lang === 'ar' ? 'خدمات OMT المالية' : 'OMT Services'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('services')}
                  className="text-[#172033] dark:text-[#F8FAFC] hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:underline font-semibold flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>{lang === 'ar' ? 'ويسترن يونيون' : 'Western Union'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('services')}
                  className="text-[#172033] dark:text-[#F8FAFC] hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:underline font-semibold flex items-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>{lang === 'ar' ? 'ويش موني (Whish Money)' : 'Whish Money Hub'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('services')}
                  className="text-[#172033] dark:text-[#F8FAFC] hover:text-[#007AFF] dark:hover:text-[#38BDF8] hover:underline font-semibold flex items-center gap-1"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>{lang === 'ar' ? 'خدمات الاتصالات والدعم' : 'Touch & Tech Support'}</span>
                </button>
              </li>
              <li className="pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B]">
                <button
                  onClick={() => handlePolicyClick('delivery')}
                  className="hover:text-[#007AFF] dark:hover:text-[#38BDF8] transition-colors"
                >
                  {lang === 'ar' ? 'سياسة التوصيل في لبنان' : 'Lebanon Delivery Policy'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePolicyClick('warranty')}
                  className="hover:text-[#007AFF] dark:hover:text-[#38BDF8] transition-colors"
                >
                  {lang === 'ar' ? 'شروط الكفالة الرسمية' : 'Official Warranty Terms'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePolicyClick('returns')}
                  className="hover:text-[#007AFF] dark:hover:text-[#38BDF8] transition-colors"
                >
                  {lang === 'ar' ? 'الاسترجاع والاستبدال' : 'Returns & Exchange'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handlePolicyClick('terms')}
                  className="hover:text-[#007AFF] dark:hover:text-[#38BDF8] transition-colors"
                >
                  {lang === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#DCE5F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#64748B] dark:text-slate-400">
          <p>
            {lang === 'ar'
              ? `© 2027 ${storeSettings.storeNameAr || 'أون علاء ستور'} (${storeSettings.storeName || 'ON AlAA STORE'}). متجر إلكتروني مقره الشوف، لبنان. التوصيل متاح لجميع مناطق لبنان. هاتف: ${storeSettings.phone || '03986718'}.`
              : `© 2027 ${storeSettings.storeName || 'ON AlAA STORE'}. Online Store based in Chouf, Lebanon. Delivery Available to All Lebanon. Phone: ${storeSettings.phone || '03986718'}. All rights reserved.`}
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('track-order')}
              className="text-[#007AFF] hover:underline"
            >
              {t.trackOrder}
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentView('admin')}
              className="text-[#64748B] hover:text-[#007AFF] flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>{t.adminPortal}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
