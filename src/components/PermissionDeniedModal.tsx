import React, { useEffect, useState } from 'react';
import { ShieldAlert, Lock, UserCheck, X, AlertOctagon, Database } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAdmin } from '../context/AdminContext';
import { formatAdminPermissionLabel } from '../utils/adminPermissionHelpers';
import {
  clearPermissionDenied,
  formatAdminRoleLabel,
  PermissionDeniedDetail,
  subscribePermissionDenied,
} from '../utils/permissionDeniedHelpers';

export const PermissionDeniedModal: React.FC = () => {
  const { lang } = useShop();
  const { user } = useAdmin();
  const [detail, setDetail] = useState<PermissionDeniedDetail | null>(null);
  const isAr = lang === 'ar';

  useEffect(() => {
    return subscribePermissionDenied((nextDetail) => {
      setDetail(nextDetail);
    });
  }, []);

  useEffect(() => {
    if (!detail) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearPermissionDenied();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detail]);

  if (!detail) return null;

  const activeAccount = detail.currentUser || (user
    ? {
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
      }
    : null);

  const accountDisplay = activeAccount
    ? activeAccount.username || activeAccount.name || activeAccount.email || 'Staff User'
    : isAr
    ? 'غير مسجل الدخول'
    : 'Not signed in';

  const roleLabel = formatAdminRoleLabel(activeAccount?.role, isAr ? 'ar' : 'en');
  const titleText = isAr ? 'تم رفض الصلاحية' : 'Permission Denied';
  const actionText = isAr ? detail.actionAr : detail.actionEn;
  const reasonText = isAr ? detail.reasonAr : detail.reasonEn;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      data-testid="permission-denied-modal"
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-[3px] animate-in fade-in duration-150"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="permission-denied-title"
      aria-describedby="permission-denied-description"
      onClick={() => clearPermissionDenied()}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#111827] border border-red-200 dark:border-red-900/60 shadow-[0_24px_64px_rgba(220,38,38,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-50 via-rose-50/70 to-white dark:from-red-950/50 dark:via-red-950/20 dark:to-[#111827] border-b border-red-100 dark:border-red-900/40 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center shadow-sm shadow-red-600/25 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="permission-denied-title"
                  className="text-base font-black text-[#172033] dark:text-white tracking-tight"
                >
                  {titleText}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/50 text-[#DC2626] dark:text-red-300 border border-red-200 dark:border-red-800/70">
                  {detail.source === 'firestore' ? (
                    <>
                      <Database className="w-3 h-3" />
                      <span>{isAr ? 'قواعد الأمان' : 'Firestore Rules'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>{isAr ? 'تقييد الصلاحيات' : 'RBAC Guard'}</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-[#DC2626] dark:text-red-400 mt-0.5 truncate">
                {actionText}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => clearPermissionDenied()}
            aria-label={isAr ? 'إغلاق تنبيه رفض الصلاحية' : 'Close permission denied notice'}
            data-testid="permission-denied-close-x"
            className="p-1.5 rounded-xl text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <p
            id="permission-denied-description"
            className="text-xs sm:text-[13px] text-[#334155] dark:text-slate-300 leading-relaxed"
          >
            {reasonText}
          </p>

          {/* Required Clearance Box */}
          <div className="p-3.5 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/50 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B91C1C] dark:text-red-300">
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'الصلاحية المطلوبة للتنفيذ' : 'Required Permission'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" data-testid="permission-denied-required-badges">
              {detail.requiredPermissions.map((perm) => (
                <span
                  key={perm}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/60 text-xs font-bold text-[#991B1B] dark:text-red-200 shadow-xs"
                >
                  <span>{formatAdminPermissionLabel(perm, isAr ? 'ar' : 'en')}</span>
                  <code className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/60 text-[10px] font-mono text-[#DC2626] dark:text-red-300">
                    {perm}
                  </code>
                </span>
              ))}
              {detail.requiredRoles?.includes('super_admin') && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#EAF3FF] dark:bg-blue-950/40 border border-[#BAE6FD] dark:border-blue-800/60 text-[11px] font-bold text-[#007AFF] dark:text-blue-300">
                  {isAr ? 'Super Admin فقط' : 'Super Admin Only'}
                </span>
              )}
            </div>
            {detail.resourcePath && (
              <div className="pt-1 text-[11px] text-[#64748B] dark:text-slate-400 font-mono truncate">
                {detail.operationType ? `${detail.operationType.toUpperCase()} ` : ''}
                {detail.resourcePath}
              </div>
            )}
          </div>

          {/* Current Account Context */}
          <div className="p-3.5 rounded-2xl bg-[#F5F8FC] dark:bg-slate-900/70 border border-[#DCE5F0] dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-[#DCE5F0] dark:border-slate-700 flex items-center justify-center text-[#007AFF] shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                  {isAr ? 'الحساب النشط حالياً' : 'Active Account'}
                </p>
                <p
                  data-testid="permission-denied-current-user"
                  className="text-xs font-bold text-[#172033] dark:text-white truncate"
                >
                  {accountDisplay}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-[#DCE5F0] dark:border-slate-700 text-[11px] font-bold text-[#475569] dark:text-slate-300 shrink-0">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F5F8FC] dark:bg-slate-900/60 border-t border-[#DCE5F0] dark:border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#64748B] dark:text-slate-400">
            {isAr
              ? 'تواصل مع Alaa (Super Admin) لطلب الترقية.'
              : 'Contact Super Admin (Alaa) for elevated access.'}
          </span>
          <button
            type="button"
            onClick={() => clearPermissionDenied()}
            data-testid="permission-denied-dismiss-btn"
            className="px-5 py-2.5 rounded-xl bg-[#172033] hover:bg-[#0F172A] dark:bg-[#007AFF] dark:hover:bg-[#0066D6] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            {isAr ? 'حسناً، إغلاق' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
};
