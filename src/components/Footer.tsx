import React from 'react';
import { useShop } from '../context/ShopContext';
import { Phone, MapPin, ShieldCheck, ChevronRight } from 'lucide-react';
import { StoreLogo } from './StoreLogo';
import { NewsletterFooterSection } from './NewsletterFooterSection';
import {
  getFooterPhones,
  getFooterLocations,
  getFooterPolicyLinks,
  getFooterOpeningHours,
} from '../utils/footerContentHelpers';

export const Footer: React.FC = () => {
  const { lang, t, storeSettings, setCurrentView } = useShop();
  const isArabic = lang === 'ar';

  const phones = getFooterPhones();
  const locations = getFooterLocations(lang);
  const policyLinks = getFooterPolicyLinks(lang);
  const openingHours = getFooterOpeningHours(lang);

  const handleNavigate = (targetView: string) => {
    setCurrentView(targetView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      data-testid="site-footer"
      dir={isArabic ? 'rtl' : 'ltr'}
      className="bg-[#161A1D] text-[#9CA3AF] pt-[60px] pb-28 md:pb-[40px] border-t border-white/[0.08]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter Subscription Bar */}
        <NewsletterFooterSection />

        {/* 3-Column Reference Footer Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12 items-start">
          {/* Column 1 (Left): Brand Logo, Call to Action, Phone Numbers & Locations */}
          <div className="space-y-5">
            <StoreLogo
              size="md"
              inverted={true}
              onClick={() => handleNavigate('home')}
            />

            <div className="space-y-3.5 pt-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                {isArabic ? 'هل لديك استفسار؟ اتصل بنا الآن!' : 'Got Questions? Call us now!'}
              </h3>

              {/* Two Distinct Telephone Lines */}
              <div className="space-y-2.5">
                {phones.map((phone) => (
                  <a
                    key={phone.telHref}
                    href={phone.telHref}
                    className="flex items-center gap-3 text-white hover:text-[#38BDF8] transition-colors group w-fit"
                  >
                    <span className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] group-hover:border-[#38BDF8]/50 flex items-center justify-center text-[#38BDF8] shrink-0 transition-colors">
                      <Phone className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span dir="ltr" className="text-[15px] font-semibold tabular-nums tracking-wide">
                      {phone.display}
                    </span>
                  </a>
                ))}
              </div>

              {/* Two Physical Store / Service Location Lines */}
              <div className="space-y-2.5 pt-1">
                {locations.map((loc) => (
                  <div
                    key={loc.text}
                    className="flex items-start gap-3 text-[13.5px] leading-relaxed text-[#CBD5E1]"
                  >
                    <span className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#9CA3AF] shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span className="pt-1 text-[#9CA3AF]">{loc.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2 (Middle): Quick Links & Policies Stack */}
          <nav
            aria-label={isArabic ? 'روابط سريعة والسياسات' : 'Quick Links and Policies'}
            className="w-full"
          >
            <ul className="divide-y divide-white/[0.08] border-b border-white/[0.08]">
              {policyLinks.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => handleNavigate(link.targetView)}
                    className="w-full py-3.5 text-sm font-medium text-[#D1D5DB] hover:text-white transition-colors flex items-center justify-between gap-3 text-left rtl:text-right cursor-pointer group"
                  >
                    <span className="group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform">
                      {link.label}
                    </span>
                    <ChevronRight
                      className="w-4 h-4 text-[#6B7280] group-hover:text-[#38BDF8] transition-colors shrink-0 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 3 (Right): Physical Store Opening Hours */}
          <div className="md:col-span-2 lg:col-span-1">
            <h3 className="text-base font-bold text-white tracking-tight mb-1.5">
              {isArabic ? 'ساعات عمل المتجر الفعلي' : 'Physical Store Opening Hours'}
            </h3>
            <p className="text-[13.5px] text-[#9CA3AF] mb-5">
              {isArabic
                ? 'يسعدنا دائماً خدمتكم واستقبالكم في متجرنا'
                : 'We will be glad to serve you at our Shop'}
            </p>

            <ul className="divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
              {openingHours.map((row) => (
                <li
                  key={row.dayLabel}
                  className="py-3.5 flex items-center justify-between gap-4 text-[13.5px]"
                >
                  <span className="font-semibold text-white whitespace-nowrap shrink-0">
                    {row.dayLabel}:
                  </span>
                  <span
                    dir={row.isSpecial ? (isArabic ? 'rtl' : 'ltr') : 'ltr'}
                    className={`tabular-nums text-right rtl:text-left ${
                      row.isSpecial ? 'text-[#38BDF8] font-medium' : 'text-[#D1D5DB]'
                    }`}
                  >
                    {row.hoursLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Utility Strip */}
        <div className="mt-10 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9CA3AF]">
          <p className="text-center sm:text-left rtl:sm:text-right">
            {isArabic
              ? `© 2027 ${storeSettings.storeNameAr || 'أون علاء ستور'} (${storeSettings.storeName || 'ON ALAA STORE'}). جميع الحقوق محفوظة.`
              : `© 2027 ${storeSettings.storeName || 'ON ALAA STORE'}. Chouf, Lebanon. All rights reserved.`}
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleNavigate('track-order')}
              className="text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
            >
              {t.trackOrder}
            </button>
            <span aria-hidden="true" className="text-white/20">
              |
            </span>
            <button
              type="button"
              onClick={() => handleNavigate('admin')}
              className="text-[#9CA3AF] hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
              <span>{t.adminPortal}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
