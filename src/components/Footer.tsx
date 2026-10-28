import React from 'react';
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
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { StoreLogo } from './StoreLogo';
import { NewsletterFooterSection } from './NewsletterFooterSection';

export const Footer: React.FC = () => {
  const { lang, t, storeSettings, setCurrentView, selectCategory, selectBrand, categories, brands } = useShop();

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
          {/* Col 1: Brand Info */}
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
                ? 'وجهتكم الرائدة في صيدا وكافة مناطق لبنان لأحدث الهواتف الذكية، أجهزة اللابتوب، الملحقات والحلول المالية المتكاملة OMT، ويسترن يونيون و ويش موني.'
                : "Lebanon's premier technology and electronics destination in Saida. Flagship smartphones, high-performance laptops, accessories, and certified financial services."}
            </p>

            {/* Contact details */}
            <div className="space-y-2 pt-2 text-xs">
              <a
                href="tel:81900916"
                className="flex items-center gap-2.5 text-[#172033] dark:text-[#F8FAFC] hover:text-[#007AFF] dark:hover:text-[#38BDF8] transition-colors font-bold"
              >
                <div className="w-7 h-7 rounded-lg bg-[#EAF3FF] dark:bg-[#1E293B] flex items-center justify-center text-[#007AFF] flex-shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <span>81 900 916</span>
              </a>

              <div className="flex items-start gap-2.5 text-[#172033] dark:text-[#F8FAFC]">
                <div className="w-7 h-7 rounded-lg bg-[#EAF3FF] dark:bg-[#1E293B] flex items-center justify-center text-[#007AFF] flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span>{lang === 'ar' ? storeSettings.locationAr : storeSettings.locationEn}</span>
              </div>

              <div className="flex items-start gap-2.5 text-[#64748B] dark:text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-center text-[#007AFF] flex-shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-[#172033] dark:text-[#F8FAFC] block">
                    {lang === 'ar'
                      ? (storeSettings.openingSchedule?.customMessageAr || 'مفتوح يومياً — 17 ساعة يومياً')
                      : (storeSettings.openingSchedule?.customMessageEn || 'OPEN EVERY DAY — 17 HOURS DAILY')}
                  </span>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-400 block">
                    {lang === 'ar' ? storeSettings.openingHoursAr : storeSettings.openingHoursEn}
                  </span>
                </div>
              </div>
            </div>

            {/* WhatsApp Contact Button */}
            <div className="pt-2">
              <a
                href={`https://wa.me/${storeSettings.whatsapp || '96181900916'}?text=${encodeURIComponent(
                  `Hello ${storeSettings.storeName}! I am inquiring about your products.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-black text-xs shadow-md shadow-emerald-700/30 transition-all cursor-pointer group active:scale-95"
              >
                <WhatsApp3DIcon size={20} />
                <span>{lang === 'ar' ? 'استفسار / طلب عبر واتساب (81900916)' : 'Inquire / Order on WhatsApp (81900916)'}</span>
              </a>
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
                  <span>{lang === 'ar' ? 'توتش ستور وخطوط الاتصال' : 'Touch Store Saida'}</span>
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
              ? `© 2027 ${storeSettings.storeNameAr || 'أرناؤوط ستور'} (${storeSettings.storeName}). صيدا، ساحة النجمة، لبنان. هاتف: ${storeSettings.phone}.`
              : `© 2027 ${storeSettings.storeName}. Saida, Nijme Square, Lebanon. Phone: ${storeSettings.phone}. All rights reserved.`}
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
