import React from 'react';
import { useShop } from '../context/ShopContext';
import { Phone, Sparkles, Clock } from 'lucide-react';
import { checkStoreOpenStatus, formatTimeDisplay } from '../utils/storeSchedule';

export const AnnouncementBar: React.FC = () => {
  const { storeSettings, lang, setCurrentView } = useShop();
  const bar = storeSettings.announcementBar;

  if (!bar?.enabled) return null;

  const scheduleInfo = checkStoreOpenStatus(storeSettings.openingSchedule);
  const openDisplay = formatTimeDisplay(storeSettings.openingSchedule?.openTime || '10:00', lang);
  const closeDisplay = formatTimeDisplay(storeSettings.openingSchedule?.closeTime || '01:00', lang);
  const text = lang === 'ar' ? bar.textAr || bar.textEn : bar.textEn;

  return (
    <aside
      aria-label="Store Announcements and Opening Hours"
      style={{
        backgroundColor: bar.bgColor && bar.bgColor !== '#064e3b' ? bar.bgColor : '#007AFF',
        color: bar.textColor && bar.textColor !== '#a7f3d0' ? bar.textColor : '#FFFFFF',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)',
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 1rem)',
      }}
      className="relative z-50 pb-2 text-xs md:text-sm font-medium border-b border-blue-400/20 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Schedule & Live Status Pill */}
        {storeSettings.openingSchedule?.displayHours !== false && (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 text-xs">
            <div
              data-testid="header-hours-pill"
              className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/15"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  scheduleInfo.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-bold tracking-tight">
                {lang === 'ar'
                  ? (scheduleInfo.isOpen ? 'مفتوح الآن' : 'مغلق الآن')
                  : (scheduleInfo.isOpen ? 'OPEN NOW' : 'CLOSED NOW')}
              </span>
              <span className="text-white/60">•</span>
              <Clock className="w-3.5 h-3.5 text-white/90" />
              <span className="font-medium text-[11px] text-white/95" dir="ltr">
                {`${openDisplay} – ${closeDisplay}`}
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
            href={`tel:${(storeSettings.phone || '03 986 718').replace(/\s+/g, '')}`}
            className="flex items-center gap-1.5 hover:text-white transition-colors bg-black/20 px-2.5 py-1 rounded-full border border-white/10"
          >
            <Phone className="w-3.5 h-3.5 text-white" />
            <span className="font-bold">{storeSettings.phone || '03 986 718'}</span>
          </a>
          <button
            onClick={() => setCurrentView('services')}
            className="underline underline-offset-2 hover:text-white transition-colors font-medium cursor-pointer"
          >
            {lang === 'ar' ? 'خدمات Whish والاتصالات' : 'Whish & Touch Services'}
          </button>
        </div>
      </div>
    </aside>
  );
};
