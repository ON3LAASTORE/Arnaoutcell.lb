import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  History,
  KeyRound,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import {
  ActivityLogCategory,
  ActivityLogEntry,
  ActivityLogSeverity,
  filterActivityLogs,
  formatAuditTimestamp,
  summarizeActivityLogs,
} from '../../utils/activityLogHelpers';
import {
  downloadActivityLogsCsv,
  fetchAdminActivityLogs,
  getCachedActivityLogs,
  subscribeActivityLogs,
} from '../../services/activityLogService';

const CATEGORY_OPTIONS: Array<{
  id: 'all' | ActivityLogCategory;
  labelEn: string;
  labelAr: string;
}> = [
  { id: 'all', labelEn: 'All Events', labelAr: 'الكل' },
  { id: 'security', labelEn: 'Security & Auth', labelAr: 'الأمان والدخول' },
  { id: 'settings', labelEn: 'Settings', labelAr: 'الإعدادات' },
  { id: 'catalog', labelEn: 'Catalog', labelAr: 'الكتالوج' },
  { id: 'orders', labelEn: 'Orders', labelAr: 'الطلبات' },
  { id: 'content', labelEn: 'Content', labelAr: 'المحتوى' },
];

export const AdminActivityLog: React.FC = () => {
  const { lang } = useShop();
  const isAr = lang === 'ar';

  const [logs, setLogs] = useState<ActivityLogEntry[]>(() => getCachedActivityLogs());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ActivityLogCategory>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | ActivityLogSeverity>('all');

  const mountedRef = useRef(true);

  const handleRefresh = async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const updated = await fetchAdminActivityLogs();
      if (mountedRef.current) {
        setLogs(updated);
      }
    } catch {
      if (mountedRef.current) {
        setLoadError(
          isAr
            ? 'تعذر تحميل سجل النشاط الأمني من الخادم.'
            : 'Unable to load activity log records from server.'
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = subscribeActivityLogs((nextLogs) => {
      if (mountedRef.current) {
        setLogs(nextLogs);
      }
    });
    handleRefresh();
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => summarizeActivityLogs(logs), [logs]);

  const filteredLogs = useMemo(
    () =>
      filterActivityLogs(logs, {
        search: searchQuery,
        category: selectedCategory,
        severity: selectedSeverity,
      }),
    [logs, searchQuery, selectedCategory, selectedSeverity]
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategory !== 'all' || selectedSeverity !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSeverity('all');
  };

  const getCategoryLabel = (cat: ActivityLogCategory) => {
    const match = CATEGORY_OPTIONS.find((item) => item.id === cat);
    return match ? (isAr ? match.labelAr : match.labelEn) : cat;
  };

  const getSeverityBadge = (severity: ActivityLogSeverity) => {
    if (severity === 'critical') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-50 text-[#DC2626] border border-red-200">
          {isAr ? 'حرج' : 'Critical'}
        </span>
      );
    }
    if (severity === 'warning') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-[#B45309] border border-amber-200">
          {isAr ? 'تحذير' : 'Warning'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD]">
        {isAr ? 'معلومات' : 'Info'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="pb-5 border-b border-[#DCE5F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#172033] flex items-center gap-2.5 tracking-tight">
            <History className="w-6 h-6 text-[#007AFF] shrink-0" />
            <span>{isAr ? 'سجل النشاط والتدقيق الأمني' : 'Security & Activity Log'}</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {isAr
              ? 'متابعة جميع التعديلات الحساسة بما فيها تحديثات كلمة مرور المدير، تسجيل الدخول، وتغييرات الإعدادات والكتالوج.'
              : 'Immutable audit trail tracking sensitive administrative mutations, password rotations, login attempts, and store configuration updates.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-[#F5F8FC] text-[#172033] border border-[#DCE5F0] text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#007AFF] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => downloadActivityLogsCsv(filteredLogs)}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* 4-Column Tabular KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE5F0] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>{isAr ? 'إجمالي الأحداث المسجلة' : 'Total Audited Events'}</span>
            <History className="w-4 h-4 text-[#007AFF]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#172033] tabular-nums">
            {summary.totalEvents}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B] tabular-nums">
            {isAr ? `آخر 24 ساعة: ${summary.last24HoursCount}` : `Last 24 hours: ${summary.last24HoursCount}`}
          </p>
        </div>

        <div className="bg-white border border-[#DCE5F0] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>{isAr ? 'أحداث الأمان والدخول' : 'Security & Auth Events'}</span>
            <ShieldCheck className="w-4 h-4 text-[#007AFF]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#172033] tabular-nums">
            {summary.securityEvents}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            {isAr ? 'دخول وخروج وصلاحيات' : 'Sign-ins, sessions & checks'}
          </p>
        </div>

        <div className="bg-white border border-[#DCE5F0] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>{isAr ? 'تحديثات كلمة المرور' : 'Password Updates'}</span>
            <KeyRound className="w-4 h-4 text-[#DC2626]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#172033] tabular-nums">
            {summary.passwordChanges}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            {isAr ? 'تشفير bcrypt محفوظ بدون نص واضح' : 'Bcrypt rotated • No plaintext'}
          </p>
        </div>

        <div className="bg-white border border-[#DCE5F0] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>{isAr ? 'تنبيهات حرجة' : 'Critical Alerts'}</span>
            <ShieldAlert className="w-4 h-4 text-[#B45309]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#172033] tabular-nums">
            {summary.criticalAlerts}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            {isAr ? 'تغييرات أمنية عالية الحساسية' : 'High-sensitivity security events'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#DCE5F0] rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isAr
                  ? 'ابحث بالحدث، اسم المدير، العنصر المستهدف، أو التفاصيل...'
                  : 'Search by action, actor, target, or details...'
              }
              aria-label={isAr ? 'بحث في سجل النشاط' : 'Search activity log'}
              className="w-full bg-[#F5F8FC] border border-[#DCE5F0] rounded-lg pl-9 pr-9 rtl:pl-9 rtl:pr-9 py-2 text-xs text-[#172033] placeholder:text-[#64748B] focus:outline-none focus:border-[#007AFF] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-2.5 text-[#64748B] hover:text-[#172033] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="activity-severity-select" className="text-xs font-semibold text-[#64748B]">
              {isAr ? 'الأهمية:' : 'Severity:'}
            </label>
            <select
              id="activity-severity-select"
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as 'all' | ActivityLogSeverity)}
              className="bg-[#F5F8FC] border border-[#DCE5F0] rounded-lg px-3 py-2 text-xs font-semibold text-[#172033] focus:outline-none focus:border-[#007AFF] cursor-pointer"
            >
              <option value="all">{isAr ? 'جميع المستويات' : 'All Severities'}</option>
              <option value="critical">{isAr ? 'حرج فقط' : 'Critical Only'}</option>
              <option value="warning">{isAr ? 'تحذيرات' : 'Warnings'}</option>
              <option value="info">{isAr ? 'معلومات' : 'Informational'}</option>
            </select>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {CATEGORY_OPTIONS.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#007AFF] text-white border-[#007AFF]'
                    : 'bg-[#F5F8FC] text-[#64748B] border-[#DCE5F0] hover:text-[#172033] hover:bg-white'
                }`}
              >
                {isAr ? cat.labelAr : cat.labelEn}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto rtl:ml-0 rtl:mr-auto text-xs font-bold text-[#007AFF] hover:underline cursor-pointer"
            >
              {isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
            </button>
          )}
        </div>
      </div>

      {/* Audit Table / Mobile Cards */}
      <div className="bg-white border border-[#DCE5F0] rounded-xl overflow-hidden">
        {loadError && logs.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-bold text-[#DC2626]">{loadError}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg bg-[#007AFF] text-white text-xs font-bold cursor-pointer"
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : isLoading && logs.length === 0 ? (
          <div className="p-4 space-y-3" aria-busy="true">
            {[0, 1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-12 rounded-lg bg-[#F5F8FC] border border-[#DCE5F0] animate-pulse"
              />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <History className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="text-sm font-bold text-[#172033]">
              {isAr ? 'لا توجد سجلات مطابقة للبحث' : 'No matching audit records found'}
            </p>
            <p className="text-xs text-[#64748B]">
              {hasActiveFilters
                ? isAr
                  ? 'جرب تغيير كلمات البحث أو إزالة الفلاتر لعرض جميع الأحداث.'
                  : 'Try adjusting your search query or clearing active category/severity filters.'
                : isAr
                ? 'سيتم تسجيل التعديلات الحساسة وأحداث الأمان هنا تلقائياً.'
                : 'Sensitive security actions and store updates will appear here automatically.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 px-4 py-1.5 rounded-lg bg-[#EAF3FF] text-[#007AFF] text-xs font-bold cursor-pointer"
              >
                {isAr ? 'عرض كافة السجلات' : 'Show All Logs'}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse">
                <thead>
                  <tr className="bg-[#F5F8FC] border-b border-[#DCE5F0] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    <th className="py-3 px-4">{isAr ? 'الوقت والمصدر' : 'Timestamp'}</th>
                    <th className="py-3 px-4">{isAr ? 'الحدث والتفاصيل' : 'Event & Details'}</th>
                    <th className="py-3 px-4">{isAr ? 'التصنيف' : 'Category'}</th>
                    <th className="py-3 px-4">{isAr ? 'المستوى' : 'Severity'}</th>
                    <th className="py-3 px-4">{isAr ? 'المنفذ' : 'Actor'}</th>
                    <th className="py-3 px-4">{isAr ? 'الهدف' : 'Target'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE5F0] text-xs">
                  {filteredLogs.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-[#F5F8FC]/80 transition-colors align-top"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-[11px] font-semibold text-[#172033] tabular-nums">
                          {formatAuditTimestamp(entry.timestamp, isAr ? 'ar' : 'en')}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-[#64748B] mt-0.5">
                          {entry.source}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="font-bold text-[#172033]">
                          {isAr ? entry.titleAr : entry.titleEn}
                        </div>
                        {entry.details && (
                          <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">
                            {entry.details}
                          </p>
                        )}
                        <span className="inline-block mt-1 font-mono text-[10px] text-[#64748B]">
                          {entry.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-[#172033]">
                        {getCategoryLabel(entry.category)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getSeverityBadge(entry.severity)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#172033]">{entry.actor.name}</div>
                        <div className="text-[11px] text-[#64748B] font-mono">
                          @{entry.actor.username}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-[200px]">
                        <span
                          title={entry.target}
                          className="text-xs font-medium text-[#172033] block truncate"
                        >
                          {entry.target}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-[#DCE5F0]">
              {filteredLogs.map((entry) => (
                <div key={entry.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#172033]">
                        {isAr ? entry.titleAr : entry.titleEn}
                      </p>
                      <p className="font-mono text-[11px] text-[#64748B] tabular-nums mt-0.5">
                        {formatAuditTimestamp(entry.timestamp, isAr ? 'ar' : 'en')}
                      </p>
                    </div>
                    {getSeverityBadge(entry.severity)}
                  </div>

                  {entry.details && (
                    <p className="text-xs text-[#64748B] leading-relaxed">{entry.details}</p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#64748B]">
                    <span>
                      <strong className="text-[#172033]">{entry.actor.name}</strong> (@
                      {entry.actor.username})
                    </span>
                    <span className="font-semibold text-[#172033]">
                      {getCategoryLabel(entry.category)} • {entry.target}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Table Footer */}
        <div className="px-4 py-3 bg-[#F5F8FC] border-t border-[#DCE5F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#64748B]">
          <span className="tabular-nums font-medium">
            {isAr
              ? `عرض ${filteredLogs.length} من أصل ${logs.length} سجل`
              : `Showing ${filteredLogs.length} of ${logs.length} audited events`}
          </span>
          <span>
            {isAr
              ? 'السجلات محفوظة للإطلاع فقط ولا تحتوي على أي كلمات مرور نصية.'
              : 'Append-only audit trail • Plaintext passwords and tokens are redacted automatically.'}
          </span>
        </div>
      </div>
    </div>
  );
};
