import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Language } from '../types';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  lang?: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  lang = 'en',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const resolvedConfirm = confirmLabel || (lang === 'ar' ? 'تأكيد' : 'Confirm');
  const resolvedCancel = cancelLabel || (lang === 'ar' ? 'إلغاء' : 'Cancel');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      data-testid="confirm-dialog"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-2xl p-6 space-y-4 text-[#172033] dark:text-[#F8FAFC]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-50 dark:bg-rose-950/50 text-[#DC2626] dark:text-rose-400 border border-red-200 dark:border-rose-800'
                  : 'bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] border border-[#BAE6FD] dark:border-[#007AFF]/40'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="confirm-dialog-title" className="text-base font-bold">
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label={resolvedCancel}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B]">
          <button
            type="button"
            data-testid="confirm-dialog-cancel"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-slate-200 dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] text-xs font-semibold transition-colors cursor-pointer"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            data-testid="confirm-dialog-confirm"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer ${
              variant === 'danger'
                ? 'bg-[#DC2626] hover:bg-red-700'
                : 'bg-[#007AFF] hover:bg-[#0066D6]'
            }`}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};
