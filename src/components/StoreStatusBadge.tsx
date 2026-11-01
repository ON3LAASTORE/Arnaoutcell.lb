import React, { useState, useEffect } from 'react';
import { Clock, Radio, Sparkles } from 'lucide-react';
import { checkStoreOpenStatus, ScheduleCalculationResult } from '../utils/storeSchedule';
import type { StoreOpeningSchedule } from '../types';

interface StoreStatusBadgeProps {
  schedule?: Partial<StoreOpeningSchedule>;
  isArabic?: boolean;
  variant?: 'pill' | 'card' | 'compact' | 'detailed';
  showLocalTime?: boolean;
  className?: string;
}

export const StoreStatusBadge: React.FC<StoreStatusBadgeProps> = ({
  schedule,
  isArabic = false,
  variant = 'pill',
  showLocalTime = true,
  className = '',
}) => {
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleCalculationResult>(() =>
    checkStoreOpenStatus(schedule)
  );

  // Re-calculate dynamically every 20 seconds to stay real-time
  useEffect(() => {
    // Initial evaluation
    setScheduleInfo(checkStoreOpenStatus(schedule));

    const interval = setInterval(() => {
      setScheduleInfo(checkStoreOpenStatus(schedule));
    }, 20000);

    return () => clearInterval(interval);
  }, [schedule]);

  const {
    isOpen,
    statusBadgeEn,
    statusBadgeAr,
    timeRemainingTextEn,
    timeRemainingTextAr,
    currentLebanonTime,
    durationHours,
  } = scheduleInfo;

  // COMPACT PILL VARIANT
  if (variant === 'compact') {
    return (
      <div
        data-testid="store-status-compact"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border transition-all ${
          isOpen
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800/80 shadow-xs'
        } ${className}`}
      >
        <span className="relative flex h-2 w-2">
          {isOpen && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isOpen ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </span>
        <span>{isArabic ? (isOpen ? 'مفتوح الآن' : 'مغلق الآن') : (isOpen ? 'OPEN NOW' : 'CLOSED NOW')}</span>
      </div>
    );
  }

  // STANDARD PILL VARIANT
  if (variant === 'pill') {
    return (
      <div
        data-testid="store-status-pill"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border transition-all ${
          isOpen
            ? 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
            : 'bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-xs'
        } ${className}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          {isOpen && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isOpen ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </span>

        <span className="tracking-tight">
          {isArabic ? statusBadgeAr : statusBadgeEn}
        </span>

        {showLocalTime && (
          <>
            <span className="text-gray-300 dark:text-gray-600 font-normal">•</span>
            <span className="text-[11px] font-medium opacity-90">
              {isArabic ? `بتوقيت صيدا: ${currentLebanonTime}` : `Saida: ${currentLebanonTime}`}
            </span>
          </>
        )}
      </div>
    );
  }

  // DETAILED CARD VARIANT
  return (
    <div
      data-testid="store-status-detailed"
      className={`p-4 rounded-2xl border transition-all ${
        isOpen
          ? 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 dark:from-emerald-950/30 dark:via-[#0E1726] dark:to-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 shadow-xs'
          : 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-amber-950/30 dark:via-[#0E1726] dark:to-amber-950/20 border-amber-200 dark:border-amber-900/60 shadow-xs'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {isOpen && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isOpen ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span
            className={`text-xs font-black tracking-wider uppercase ${
              isOpen ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {isArabic ? (isOpen ? 'مفتوح الآن للاستلام والمعاينة' : 'مغلق حالياً') : (isOpen ? 'LIVE • STORE OPEN NOW' : 'STORE CURRENTLY CLOSED')}
          </span>
        </div>

        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#172033] dark:text-slate-300">
          {isArabic ? `${durationHours} ساعة يومياً` : `Open ${durationHours} hours`}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
        <div className="space-y-0.5">
          <p className="font-bold text-[#172033] dark:text-white">
            {isArabic ? statusBadgeAr : statusBadgeEn}
          </p>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400">
            {isArabic ? timeRemainingTextAr : timeRemainingTextEn}
          </p>
        </div>

        {showLocalTime && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#007AFF] dark:text-[#38BDF8] bg-[#007AFF]/5 dark:bg-[#007AFF]/10 px-2.5 py-1 rounded-xl self-start sm:self-center">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isArabic ? `توقيت صيدا: ${currentLebanonTime}` : `Saida Time: ${currentLebanonTime}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
