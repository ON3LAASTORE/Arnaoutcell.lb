import React, { useState, useRef, useEffect } from 'react';
import { useFirestoreSyncStatus } from '../hooks/useFirestoreSyncStatus';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Database,
  ArrowUpDown,
} from 'lucide-react';

interface ConnectivityIndicatorProps {
  lang?: 'en' | 'ar';
  isCompact?: boolean;
  className?: string;
}

export const ConnectivityIndicator: React.FC<ConnectivityIndicatorProps> = ({
  lang = 'en',
  isCompact = false,
  className = '',
}) => {
  const {
    status,
    meta,
    fromCache,
    hasPendingWrites,
    isNavigatorOnline,
    lastSyncedFormatted,
    isReconnecting,
    reconnect,
  } = useFirestoreSyncStatus(lang);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
      }
    };

    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [popoverOpen]);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await reconnect();
  };

  const getStatusIcon = () => {
    if (status === 'synced') {
      return <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (status === 'syncing') {
      return <ArrowUpDown className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin" />;
    }
    if (status === 'cached') {
      return <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    }
    return <WifiOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setPopoverOpen((prev) => !prev)}
        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all duration-150 cursor-pointer text-xs font-semibold select-none ${meta.badgeClasses} ${
          popoverOpen ? 'ring-2 ring-primary/30' : ''
        }`}
        title={meta.tooltip}
        aria-label={`${isAr ? 'حالة الاتصال' : 'Connectivity Status'}: ${meta.label}`}
        aria-expanded={popoverOpen}
        aria-haspopup="dialog"
      >
        {/* Pulsing Dot */}
        <span className="relative flex h-2 w-2">
          {meta.isPulsing && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${meta.dotColor}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${meta.dotColor}`} />
        </span>

        {/* Status text: full on desktop, short or icon on compact */}
        {isCompact ? (
          <span className="hidden sm:inline text-[11px] font-bold tracking-tight">
            {meta.shortLabel}
          </span>
        ) : (
          <span className="text-[11px] font-bold tracking-tight">
            <span className="hidden sm:inline">{meta.label}</span>
            <span className="sm:hidden">{meta.shortLabel}</span>
          </span>
        )}

        {/* Sync spinner when actively reconnecting */}
        {isReconnecting && (
          <RefreshCw className="w-3 h-3 animate-spin text-current opacity-80" />
        )}
      </button>

      {/* Popover Card */}
      {popoverOpen && (
        <div
          role="dialog"
          aria-label={isAr ? 'تفاصيل حالة الاتصال والمزامنة' : 'Connectivity & Synchronization Details'}
          className={`absolute top-full mt-2 w-72 sm:w-80 rounded-2xl p-4 bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-2xl z-50 text-[#172033] dark:text-[#F8FAFC] animate-in fade-in zoom-in-95 duration-150 ${
            isAr ? 'left-0 sm:left-auto sm:right-0 text-right' : 'right-0 text-left'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#DCE5F0] dark:border-[#1E293B] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B]">
                {getStatusIcon()}
              </div>
              <div>
                <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>{meta.label}</span>
                  <span className={`inline-block w-2 h-2 rounded-full ${meta.dotColor}`} />
                </div>
                <div className="text-[10px] text-[#64748B] dark:text-slate-400">
                  {isAr ? 'مؤشر فايربيس للمزامنة' : 'Firebase Sync Monitor'}
                </div>
              </div>
            </div>

            {/* Quick Reconnect Button */}
            <button
              onClick={handleManualSync}
              disabled={isReconnecting}
              className="p-1.5 rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] text-[#007AFF] transition-colors disabled:opacity-50 cursor-pointer"
              title={isAr ? 'إعادة التزامن اليدوي' : 'Force Cloud Sync'}
              aria-label={isAr ? 'إعادة التزامن اليدوي' : 'Force Cloud Sync'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Description */}
          <p className="text-[11px] text-[#64748B] dark:text-slate-300 mb-3 leading-relaxed">
            {meta.tooltip}
          </p>

          {/* Status Breakdown Grid */}
          <div className="space-y-2 bg-[#F8FAFC] dark:bg-[#111A2E]/70 p-2.5 rounded-xl border border-[#DCE5F0]/70 dark:border-[#1E293B]/70 text-[11px]">
            {/* Live Server Sync */}
            <div className="flex items-center justify-between">
              <span className="text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>{isAr ? 'سيرفر فايربيس:' : 'Firebase Server:'}</span>
              </span>
              <span className="font-semibold flex items-center gap-1">
                {!fromCache && isNavigatorOnline ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {isAr ? 'متزامن مباشر' : 'Live Sync'}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    {isAr ? 'ذاكرة مخزنة' : 'Cached Local'}
                  </span>
                )}
              </span>
            </div>

            {/* Data Source */}
            <div className="flex items-center justify-between">
              <span className="text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>{isAr ? 'مصدر البيانات:' : 'Active Source:'}</span>
              </span>
              <span className="font-semibold text-[#172033] dark:text-slate-200">
                {fromCache
                  ? (isAr ? 'IndexedDB (محلي)' : 'IndexedDB (Offline)')
                  : (isAr ? 'سحابة Google Cloud' : 'Google Cloud Firestore')}
              </span>
            </div>

            {/* Pending Writes */}
            <div className="flex items-center justify-between">
              <span className="text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>{isAr ? 'تعديلات معلقة:' : 'Pending Writes:'}</span>
              </span>
              <span className={`font-semibold ${hasPendingWrites ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'}`}>
                {hasPendingWrites
                  ? (isAr ? 'نعم (بانتظار المزامنة)' : 'Yes (Queued)')
                  : (isAr ? 'لا يوجد (متطابق)' : '0 (Up to date)')}
              </span>
            </div>

            {/* Last Synced */}
            <div className="flex items-center justify-between border-t border-[#DCE5F0]/50 dark:border-[#1E293B]/50 pt-1.5 mt-1">
              <span className="text-[#64748B] dark:text-slate-400">
                {isAr ? 'آخر تحديث سحابي:' : 'Last Cloud Sync:'}
              </span>
              <span className="font-mono text-[10px] text-[#172033] dark:text-slate-300">
                {lastSyncedFormatted}
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleManualSync}
              disabled={isReconnecting}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-transform duration-100 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>
                {isReconnecting
                  ? (isAr ? 'جاري التحقق والمزامنة...' : 'Syncing with Cloud...')
                  : (isAr ? 'تحديث ومزامنة فورية' : 'Sync Real-Time Now')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
