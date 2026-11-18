import React, { useEffect, useRef } from 'react';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';
import {
  ADMIN_SESSION_WARNING_MS,
  computeWarningProgressPercent,
  formatCountdownMmSs,
} from '../../utils/adminSessionTimerHelpers';

interface SessionTimeoutWarningModalProps {
  isOpen: boolean;
  remainingMs: number;
  isAr: boolean;
  onExtendSession: () => void;
  onSignOut: () => void;
}

export const SessionTimeoutWarningModal: React.FC<SessionTimeoutWarningModalProps> = ({
  isOpen,
  remainingMs,
  isAr,
  onExtendSession,
  onSignOut,
}) => {
  const staySignedInRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      staySignedInRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const countdownLabel = formatCountdownMmSs(remainingMs);
  const progressPercent = computeWarningProgressPercent(remainingMs, ADMIN_SESSION_WARNING_MS);
  const isCriticalFinalWindow = remainingMs <= 30_000;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-session-warning-title"
      aria-describedby="admin-session-warning-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 backdrop-blur-[2px] p-4"
    >
      <div className="bg-white border border-[#DCE5F0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
              isCriticalFinalWindow
                ? 'bg-red-50 border-red-200 text-[#DC2626]'
                : 'bg-amber-50 border-amber-200 text-[#B45309]'
            }`}
          >
            {isCriticalFinalWindow ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <h2
              id="admin-session-warning-title"
              className="text-base font-bold text-[#172033]"
            >
              {isAr ? 'تنبيه انتهاء الجلسة التلقائي' : 'Session Expiring Due to Inactivity'}
            </h2>
            <p
              id="admin-session-warning-desc"
              className="text-xs text-[#64748B] leading-relaxed"
            >
              {isAr
                ? 'حفاظاً على أمان لوحة التحكم، سيتم تسجيل خروجك تلقائياً بعد 15 دقيقة من عدم النشاط. اختر "البقاء متصلاً" لتمديد جلستك.'
                : 'For portal security, inactive administrator sessions automatically sign out after 15 minutes. Extend your session below to stay signed in.'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569]">
              {isAr ? 'الوقت المتبقي قبل الخروج:' : 'Time until auto-logout:'}
            </span>
            <span
              data-testid="warning-modal-countdown"
              aria-live="off"
              className={`text-xl font-bold font-mono tabular-nums transition-colors ${
                isCriticalFinalWindow ? 'text-[#DC2626]' : 'text-[#B45309]'
              }`}
            >
              {countdownLabel}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={isAr ? 'الوقت المتبقي للجلسة' : 'Remaining session warning time'}
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-2 rounded-full bg-[#DCE5F0] overflow-hidden"
          >
            <div
              data-testid="warning-modal-progress"
              className={`h-full rounded-full transition-[width,background-color] duration-700 ease-linear ${
                isCriticalFinalWindow ? 'bg-[#DC2626]' : 'bg-[#D97706]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#DCE5F0] hover:bg-red-50 text-[#DC2626] font-bold text-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل الخروج الآن' : 'Sign Out Now'}</span>
          </button>
          <button
            ref={staySignedInRef}
            type="button"
            onClick={onExtendSession}
            className="px-4 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40 text-white font-bold text-xs shadow-sm shadow-[#007AFF]/20 transition-colors cursor-pointer"
          >
            {isAr ? 'البقاء متصلاً' : 'Stay Signed In'}
          </button>
        </div>
      </div>
    </div>
  );
};
