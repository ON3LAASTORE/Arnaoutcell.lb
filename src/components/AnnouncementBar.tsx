import React from 'react';
import { useShop } from '../context/ShopContext';
import { Phone, Sparkles, Clock } from 'lucide-react';
import { checkStoreOpenStatus } from '../utils/storeSchedule';

export const AnnouncementBar: React.FC = () => {
  const { storeSettings, lang, setCurrentView } = useShop();
  const bar = storeSettings.announcementBar;

  if (!bar?.enabled) return null;

  const scheduleInfo = checkStoreOpenStatus(storeSettings.openingSchedule);
  const text = lang === 'ar' ? bar.textAr || bar.textEn : bar.textEn;

  return (
    <aside
      aria-label="Store Announcements and Opening Hours"
      style={{
        backgroundColor: bar.bgColor && bar.bgColor !== '#064e3b' ? bar.bgColor : '#007AFF',
        color: bar.textColor && bar.textColor !== '#a7f3d0' ? bar.textColor : '#FFFFFF',
      }}
      className="relative z-50 py-2 px-4 text-xs md:text-sm font-medium border-b border-blue-400/20 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Schedule & Live Status Pill */}
        {storeSettings.openingSchedule?.displayHours !== false && (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 text-xs">
            <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/15">
              <Clock className="w-3.5 h-3.5 text-white/90" />
              <span className="font-bold tracking-tight">
                {lang === 'ar'
                  ? (storeSettings.openingSchedule?.customMessageAr || 'مفتوح يومياً — 17 ساعة يومياً')
                  : (storeSettings.openingSchedule?.customMessageEn || 'OPEN EVERY DAY — 17 HOURS DAILY')}
              </span>
              <span className="text-white/60">•</span>
              <span className="font-medium text-[11px] text-white/90">
                {lang === 'ar' ? '8:00 ص – 1:00 ص' : '8:00 AM – 1:00 AM'}
              </span>
            </div>
          </div>
        )}

        {/* Center: Main announcement text */}
        <div className="flex-1 flex items-center justify-center text-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-white/90 animate-pulse flex-shrink-0" />
          <span className="font-semibold tracking-wide truncate">{text}</span>
        </div>

        {/* Right: Phone & Services */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0 text-xs">
          <a
            href={`tel:${(storeSettings.phone || '81 900 916').replace(/\s+/g, '')}`}
            className="flex items-center gap-1.5 hover:text-white transition-colors bg-black/20 px-2.5 py-1 rounded-full border border-white/10"
          >
            <Phone className="w-3.5 h-3.5 text-white" />
            <span className="font-bold">{storeSettings.phone || '81 900 916'}</span>
          </a>
          <button
            onClick={() => setCurrentView('services')}
            className="underline underline-offset-2 hover:text-white transition-colors font-medium cursor-pointer"
          >
            {lang === 'ar' ? 'خدمات OMT و Whish' : 'OMT & Whish Services'}
          </button>
        </div>
      </div>
    </aside>
  );
};
