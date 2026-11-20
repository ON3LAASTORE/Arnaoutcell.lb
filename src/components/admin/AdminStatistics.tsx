import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  DollarSign,
  Download,
  Package,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { getOrders } from '../../services/storageService';
import { getStoredSearchEvents } from '../../services/searchAnalyticsService';
import { getStoredDailyTraffic } from '../../services/trafficAnalyticsService';
import {
  buildDailySalesAndTrafficSeries,
  computeCategorySalesBreakdown,
  dailyStatsToCsv,
  StatsRangeDays,
  summarizeDailySalesAndTraffic,
} from '../../utils/adminStatisticsHelpers';
import {
  D3DailySalesTrafficChart,
  SalesMetricMode,
} from './D3DailySalesTrafficChart';
import { D3CategorySalesChart } from './D3CategorySalesChart';

export const AdminStatistics: React.FC = () => {
  const { lang, products } = useShop();
  const isAr = lang === 'ar';

  const [rangeDays, setRangeDays] = useState<StatsRangeDays>(14);
  const [salesMetric, setSalesMetric] = useState<SalesMetricMode>('revenue');
  const [showSalesBars, setShowSalesBars] = useState<boolean>(true);
  const [showTrafficLine, setShowTrafficLine] = useState<boolean>(true);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const orders = useMemo(() => getOrders(), [refreshTick]);
  const trafficStore = useMemo(() => getStoredDailyTraffic(), [refreshTick]);
  const searchEvents = useMemo(() => getStoredSearchEvents(), [refreshTick]);

  const dailySeries = useMemo(
    () =>
      buildDailySalesAndTrafficSeries({
        orders,
        trafficStore,
        searchEvents,
        rangeDays,
        dataMode: 'live_only',
      }),
    [orders, trafficStore, searchEvents, rangeDays]
  );

  const summary = useMemo(() => summarizeDailySalesAndTraffic(dailySeries), [dailySeries]);

  const categoryBreakdown = useMemo(
    () => computeCategorySalesBreakdown(orders, products, 6),
    [orders, products]
  );

  const handleExportCsv = () => {
    const csv = dailyStatsToCsv(dailySeries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `store-statistics-${rangeDays}d-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Range Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-[#DCE5F0]">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#007AFF] shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033]">
              {isAr ? 'الإحصائيات وتحليل المبيعات' : 'Sales & Traffic Statistics'}
            </h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            {isAr
              ? 'تصور بياني يومي عبر D3.js لحركة المبيعات والوحدات وزيارات المتجر ومعدلات التحويل.'
              : 'Interactive D3.js analytics tracking daily product sales, unit volume, storefront visits, and category revenue.'}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {/* Date Window Segmented Control */}
          <div
            role="group"
            aria-label={isAr ? 'النطاق الزمني' : 'Time range selector'}
            className="inline-flex items-center p-1 bg-white border border-[#DCE5F0] rounded-xl"
          >
            {([7, 14, 30] as StatsRangeDays[]).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  rangeDays === days
                    ? 'bg-[#007AFF] text-white'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#15803D] text-xs font-bold whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>{isAr ? 'بيانات حية حقيقية' : 'Live Real Data'}</span>
          </span>

          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            aria-label={isAr ? 'تحديث البيانات' : 'Refresh statistics'}
            className="px-2.5 py-2 rounded-xl bg-white border border-[#DCE5F0] hover:bg-[#EAF3FF] text-[#172033] hover:text-[#007AFF] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-[#007AFF]/20 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* 4 Single-Elevation KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#DCE5F0] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#64748B] font-semibold block">
              {isAr ? `إيرادات ${rangeDays} يوم` : `${rangeDays}-Day Sales Revenue`}
            </span>
            <span
              data-testid="stats-total-revenue"
              className="text-2xl font-black text-[#007AFF] font-mono tabular-nums mt-1 block"
            >
              ${summary.totalRevenueUsd.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              {summary.totalOrdersCount} {isAr ? 'طلبات' : 'orders'} ·{' '}
              <span className="font-mono tabular-nums">${summary.avgOrderValueUsd}</span>{' '}
              {isAr ? 'متوسط' : 'AOV'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#EAF3FF] text-[#007AFF] flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DCE5F0] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#64748B] font-semibold block">
              {isAr ? 'المنتجات المباعة' : 'Units Sold'}
            </span>
            <span
              data-testid="stats-total-units"
              className="text-2xl font-black text-[#172033] font-mono tabular-nums mt-1 block"
            >
              {summary.totalUnitsSold.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              {isAr ? 'أعلى يوم:' : 'Peak day:'}{' '}
              <span className="font-mono tabular-nums">{summary.peakSalesDate || '—'}</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DCE5F0] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#64748B] font-semibold block">
              {isAr ? 'زيارات المتجر' : 'Storefront Traffic'}
            </span>
            <span
              data-testid="stats-total-visits"
              className="text-2xl font-black text-[#16A34A] font-mono tabular-nums mt-1 block"
            >
              {summary.totalVisits.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              <span className="font-mono tabular-nums">
                {summary.totalProductViews.toLocaleString()}
              </span>{' '}
              {isAr ? 'مشاهدة منتج' : 'product views'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DCE5F0] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#64748B] font-semibold block">
              {isAr ? 'معدل التحويل' : 'Avg. Conversion Rate'}
            </span>
            <span
              data-testid="stats-conversion-rate"
              className="text-2xl font-black text-[#172033] font-mono tabular-nums mt-1 block"
            >
              {summary.avgConversionRate.toFixed(1)}%
            </span>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              {isAr ? 'الطلبات نسبةً للزيارات' : 'Orders to storefront visits'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Primary D3 Daily Sales & Traffic Visualization */}
      <div className="p-6 rounded-2xl bg-white border border-[#DCE5F0] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#DCE5F0]">
          <div>
            <h2 className="text-base font-bold text-[#172033]">
              {isAr
                ? 'المبيعات اليومية وحركة الزيارات (D3.js)'
                : 'Daily Product Sales & Storefront Traffic'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {isAr
                ? 'مقارنة الإيرادات أو الوحدات المباعة (أعمدة) مع منحنى الزيارات اليومية (خط).'
                : 'Daily order volume & revenue bars overlaid with smooth storefront visit trends.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Toggle: Revenue vs Units Sold */}
            <div
              role="group"
              aria-label={isAr ? 'مقياس المبيعات' : 'Sales bar metric'}
              className="inline-flex items-center p-1 bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl"
            >
              <button
                type="button"
                onClick={() => setSalesMetric('revenue')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  salesMetric === 'revenue'
                    ? 'bg-white text-[#007AFF] shadow-xs'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                {isAr ? 'الإيرادات ($)' : 'Revenue ($)'}
              </button>
              <button
                type="button"
                onClick={() => setSalesMetric('units')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  salesMetric === 'units'
                    ? 'bg-white text-[#4F46E5] shadow-xs'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                {isAr ? 'القطع المباعة' : 'Units Sold'}
              </button>
            </div>

            {/* Interactive Series Toggles */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowSalesBars((prev) => !prev)}
                aria-pressed={showSalesBars}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-opacity cursor-pointer ${
                  showSalesBars
                    ? 'bg-white border-[#DCE5F0] text-[#172033]'
                    : 'bg-[#F5F8FC] border-[#DCE5F0] text-[#94A3B8] opacity-60'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-xs ${
                    salesMetric === 'revenue' ? 'bg-[#007AFF]' : 'bg-[#6366F1]'
                  }`}
                />
                <span>{salesMetric === 'revenue' ? (isAr ? 'المبيعات' : 'Sales') : isAr ? 'الوحدات' : 'Units'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTrafficLine((prev) => !prev)}
                aria-pressed={showTrafficLine}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-opacity cursor-pointer ${
                  showTrafficLine
                    ? 'bg-white border-[#DCE5F0] text-[#172033]'
                    : 'bg-[#F5F8FC] border-[#DCE5F0] text-[#94A3B8] opacity-60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span>{isAr ? 'الزيارات' : 'Traffic'}</span>
              </button>
            </div>
          </div>
        </div>

        <D3DailySalesTrafficChart
          data={dailySeries}
          salesMetric={salesMetric}
          showSalesBars={showSalesBars}
          showTrafficLine={showTrafficLine}
          isAr={isAr}
        />
      </div>

      {/* Lower Analytics Row: Category Breakdown + Compact Daily Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-[#DCE5F0] space-y-4">
          <div className="pb-3 border-b border-[#DCE5F0]">
            <h3 className="text-sm font-bold text-[#172033]">
              {isAr ? 'المبيعات حسب الفئة' : 'Category Sales Distribution'}
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              {isAr
                ? 'أعلى فئات المنتجات حسب إجمالي قيمة الطلبات المسجلة.'
                : 'Top product categories ranked by recorded order revenue.'}
            </p>
          </div>
          <D3CategorySalesChart categories={categoryBreakdown} isAr={isAr} />
        </div>

        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-[#DCE5F0] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
            <div>
              <h3 className="text-sm font-bold text-[#172033]">
                {isAr ? 'السجل اليومي للأداء' : 'Daily Performance Ledger'}
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {isAr
                  ? `عرض بيانات آخر ${rangeDays} يوماً مرتبة من الأحدث.`
                  : `Most recent ${rangeDays} days in chronological reverse order.`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-[#F5F8FC] border-b border-[#DCE5F0] text-[#64748B] text-[11px] uppercase">
                <tr>
                  <th className="text-left rtl:text-right py-2.5 px-3 font-semibold">
                    {isAr ? 'التاريخ' : 'Date'}
                  </th>
                  <th className="text-right rtl:text-left py-2.5 px-3 font-semibold">
                    {isAr ? 'الإيرادات' : 'Revenue'}
                  </th>
                  <th className="text-right rtl:text-left py-2.5 px-3 font-semibold">
                    {isAr ? 'القطع' : 'Units'}
                  </th>
                  <th className="text-right rtl:text-left py-2.5 px-3 font-semibold">
                    {isAr ? 'الزيارات' : 'Visits'}
                  </th>
                  <th className="text-right rtl:text-left py-2.5 px-3 font-semibold">
                    {isAr ? 'مشاهدات' : 'Views'}
                  </th>
                  <th className="text-right rtl:text-left py-2.5 px-3 font-semibold">
                    {isAr ? 'التحويل' : 'Conv.'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5F0]/70">
                {[...dailySeries].reverse().map((row) => (
                  <tr
                    key={row.dateKey}
                    className="hover:bg-[#F5F8FC]/80 transition-colors h-10"
                  >
                    <td className="py-2 px-3 font-medium text-[#172033] whitespace-nowrap">
                      <span>{isAr ? row.labelAr : row.labelEn}</span>
                      <span className="text-[10px] text-[#94A3B8] font-mono ml-2 rtl:ml-0 rtl:mr-2">
                        {row.dateKey}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right rtl:text-left font-mono tabular-nums font-bold text-[#007AFF]">
                      ${row.revenueUsd.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right rtl:text-left font-mono tabular-nums text-[#172033]">
                      {row.unitsSold}
                    </td>
                    <td className="py-2 px-3 text-right rtl:text-left font-mono tabular-nums font-semibold text-[#16A34A]">
                      {row.visits.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right rtl:text-left font-mono tabular-nums text-[#475569]">
                      {row.productViews.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right rtl:text-left font-mono tabular-nums text-[#64748B]">
                      {row.conversionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
