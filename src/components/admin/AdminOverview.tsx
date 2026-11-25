import React from 'react';
import { useShop } from '../../context/ShopContext';
import { getOrders } from '../../services/storageService';
import { OrderItem } from '../../types';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  TrendingUp,
  Search,
  Trash2,
  RefreshCw,
  Download,
  CheckCircle2,
} from 'lucide-react';
import {
  getSearchAnalyticsSummary,
  clearSearchAnalytics,
  SearchAnalyticsSummary,
} from '../../services/searchAnalyticsService';
import { downloadCombinedInventoryAndSalesCsv } from '../../services/csvReportService';
import { ConfirmDialog } from '../ConfirmDialog';

export const AdminOverview: React.FC = () => {
  const { lang, products, storeSettings } = useShop();
  const orders = getOrders();

  const safeOrders = orders || [];
  const safeProducts = products || [];

  // Metrics calculation
  const totalRevenue = safeOrders.reduce((sum, o) => {
    if (o.status !== 'cancelled' && o.status !== 'returned') {
      return sum + (Number(o.total) || 0);
    }
    return sum;
  }, 0);

  const pendingOrders = safeOrders.filter(
    (o) => o.status === 'new' || o.status === 'confirmed' || o.status === 'preparing'
  );
  const lowStockProducts = safeProducts.filter((p) => {
    const stock = Number(p.stock);
    return Number.isFinite(stock) && stock > 0 && stock <= (p.lowStockThreshold || 3);
  });
  const outOfStockProducts = safeProducts.filter((p) => {
    const stock = Number(p.stock);
    return !Number.isFinite(stock) || stock <= 0;
  });
  const offerProducts = safeProducts.filter((p) => p.isSpecialOffer);

  // Best selling products based on actual orders
  const salesMap: Record<string, { product: OrderItem; count: number; totalRev: number }> = {};
  safeOrders.forEach((ord) => {
    if (ord.status !== 'cancelled' && ord.status !== 'returned') {
      (ord.items || []).forEach((item) => {
        if (!item || !item.productId) return;
        if (!salesMap[item.productId]) {
          salesMap[item.productId] = {
            product: item,
            count: 0,
            totalRev: 0,
          };
        }
        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.price) || 0;
        salesMap[item.productId].count += qty;
        salesMap[item.productId].totalRev += unitPrice * qty;
      });
    }
  });

  const bestSellers = Object.values(salesMap).sort((a, b) => b.count - a.count).slice(0, 4);

  const [searchSummary, setSearchSummary] = React.useState<SearchAnalyticsSummary>(() =>
    getSearchAnalyticsSummary(8)
  );
  const [exportNotice, setExportNotice] = React.useState<string>('');
  const [confirmClearLogsOpen, setConfirmClearLogsOpen] = React.useState(false);

  const refreshSearchAnalytics = () => {
    setSearchSummary(getSearchAnalyticsSummary(8));
  };

  const handleClearAnalytics = () => {
    setConfirmClearLogsOpen(true);
  };

  const confirmClearAnalytics = () => {
    clearSearchAnalytics();
    setSearchSummary(getSearchAnalyticsSummary(8));
    setConfirmClearLogsOpen(false);
  };

  const handleDownloadCombinedReport = () => {
    const filename = downloadCombinedInventoryAndSalesCsv(products, orders);
    setExportNotice(
      lang === 'ar'
        ? `تم تنزيل تقرير المخزون والمبيعات الشامل (${filename}) بنجاح.`
        : `Downloaded combined inventory & sales CSV report (${filename}).`
    );
    window.setTimeout(() => setExportNotice(''), 5000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#172033]">
            {lang === 'ar' ? 'لوحة القيادة المركزية' : 'Executive Overview'}
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? `مؤشرات أداء المتجر والمبيعات المسجلة لـ ${storeSettings.storeNameAr || 'ON ALAA STORE'} — متجر إلكتروني بالشوف والتوصيل لجميع لبنان.`
              : `Live business KPIs and actual order statistics for ${storeSettings.storeName || 'ON ALAA STORE'} (Chouf Online Store • All Lebanon).`}
          </p>
        </div>

        <button
          type="button"
          data-testid="overview-export-combined-csv"
          onClick={handleDownloadCombinedReport}
          className="px-4 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm shadow-[#007AFF]/20 transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>
            {lang === 'ar' ? 'تنزيل تقرير المخزون والمبيعات (CSV)' : 'Download Inventory & Sales CSV'}
          </span>
        </button>
      </div>

      {exportNotice && (
        <div
          role="status"
          data-testid="overview-export-notice"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCE5F0] flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-[#64748B] font-semibold block mb-1">
              {lang === 'ar' ? 'إجمالي المبيعات' : 'Total Revenue'}
            </span>
            <span className="text-2xl font-black text-[#007AFF] font-mono">
              ${totalRevenue.toLocaleString()} <span className="text-xs text-[#64748B] font-sans">USD</span>
            </span>
            <span className="text-[10px] text-[#16A34A] block mt-1 font-semibold">
              ✓ Based on verified orders
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#EAF3FF] text-[#007AFF] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCE5F0] flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-[#64748B] font-semibold block mb-1">
              {lang === 'ar' ? 'إجمالي الطلبات' : 'Recorded Orders'}
            </span>
            <span className="text-2xl font-black text-[#172033] font-mono">{orders.length}</span>
            <span className="text-[10px] text-amber-600 block mt-1 font-semibold">
              {pendingOrders.length} {lang === 'ar' ? 'قيد المتابعة' : 'pending action'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Active Catalog */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCE5F0] flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-[#64748B] font-semibold block mb-1">
              {lang === 'ar' ? 'المنتجات المعروضة' : 'Active Products'}
            </span>
            <span className="text-2xl font-black text-[#172033] font-mono">{products.length}</span>
            <span className="text-[10px] text-[#007AFF] block mt-1 font-semibold">
              {offerProducts.length} {lang === 'ar' ? 'منتجات في العروض' : 'in active offers'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#007AFF] flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCE5F0] flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-[#64748B] font-semibold block mb-1">
              {lang === 'ar' ? 'تنبيهات المخزون' : 'Stock Alerts'}
            </span>
            <span className="text-2xl font-black text-amber-600 font-mono">
              {lowStockProducts.length + outOfStockProducts.length}
            </span>
            <span className="text-[10px] text-[#DC2626] block mt-1 font-semibold">
              {outOfStockProducts.length} {lang === 'ar' ? 'نفذت بالكامل' : 'out of stock'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Custom Section Anchor Container — insert a new section or component here */}
      <section
        id="admin-overview-custom-slot"
        data-slot="custom-overview-section"
        aria-label={lang === 'ar' ? 'قسم لوحة التحكم المخصص' : 'Custom Overview Section'}
        className="w-full empty:hidden"
      >
        {/* Ready-to-use section wrapper:
        <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-sm space-y-4">
          // New section content
        </div>
        */}
      </section>

      {/* Best Sellers */}
      <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
          <h3 className="font-bold text-[#172033] text-sm">
            {lang === 'ar' ? 'الأكثر مبيعاً' : 'Best Sellers'}
          </h3>
          <TrendingUp className="w-4 h-4 text-[#007AFF]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {bestSellers.length > 0 ? (
            bestSellers.map((bs, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 text-xs p-3 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0]"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[#172033] truncate">{bs.product.productName}</p>
                  <span className="text-[10px] text-[#64748B]">
                    {bs.count} {lang === 'ar' ? 'قطع مباعة' : 'units sold'}
                  </span>
                </div>
                <span className="font-black text-[#007AFF] font-mono flex-shrink-0">
                  ${bs.totalRev}
                </span>
              </div>
            ))
          ) : (
            <p className="col-span-full text-xs text-[#64748B] py-4 text-center">
              No sales records yet
            </p>
          )}
        </div>
      </div>

      {/* Search Analytics & User Intent Patterns */}
      <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE5F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3FF] flex items-center justify-center text-[#007AFF]">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#172033] text-sm flex items-center gap-2">
                <span>{lang === 'ar' ? 'سجل وتحليلات نوايا البحث' : 'Popular Search Terms & User Intent Analytics'}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[10px] font-bold">
                  {lang === 'ar' ? 'مباشر (Console Logged)' : 'Console & Local Logged'}
                </span>
              </h3>
              <p className="text-xs text-[#64748B]">
                {lang === 'ar'
                  ? 'رصد استفسارات الزبائن ونوايا الشراء لتحسين المخزون وتوريد الأجهزة الأكثر طلباً.'
                  : 'Logs queries in real-time to analyze shopper intent patterns and demand trends in Lebanon.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshSearchAnalytics}
              className="px-3 py-1.5 rounded-xl bg-[#F5F8FC] hover:bg-[#EAF3FF] text-[#172033] hover:text-[#007AFF] border border-[#DCE5F0] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
            </button>
            {searchSummary.totalSearches > 0 && (
              <button
                onClick={handleClearAnalytics}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#DC2626] border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'مسح' : 'Clear'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Analytics Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0]">
            <span className="text-[11px] text-[#64748B] font-medium block">
              {lang === 'ar' ? 'إجمالي عمليات البحث' : 'Total Searches Tracked'}
            </span>
            <span className="text-2xl font-black text-[#007AFF] font-mono mt-1 block">
              {searchSummary.totalSearches}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0]">
            <span className="text-[11px] text-[#64748B] font-medium block">
              {lang === 'ar' ? 'كلمات فريدة' : 'Unique Keywords'}
            </span>
            <span className="text-2xl font-black text-[#172033] font-mono mt-1 block">
              {searchSummary.uniqueTermsCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0]">
            <span className="text-[11px] text-[#64748B] font-medium block">
              {lang === 'ar' ? 'النمط السائد' : 'Top Intent Pattern'}
            </span>
            <span className="text-sm font-bold text-[#16A34A] mt-1 block truncate">
              {searchSummary.intentDistribution[0]
                ? searchSummary.intentDistribution[0].intent.replace(/_/g, ' ').toUpperCase()
                : 'NO DATA'}
            </span>
          </div>
        </div>

        {/* Detailed Breakdown: Top Terms & Intent Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Search Terms */}
          <div className="lg:col-span-7 space-y-3">
            <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
              {lang === 'ar' ? 'أكثر الكلمات بحثاً' : 'Most Popular Search Queries'}
            </h4>

            {searchSummary.topTerms.length > 0 ? (
              <div className="space-y-2">
                {searchSummary.topTerms.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-white border border-[#DCE5F0] text-[10px] font-bold text-[#64748B] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-[#172033] block truncate">
                          "{item.term}"
                        </span>
                        <span className="text-[10px] text-[#64748B]">
                          Intent: {item.primaryIntent.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-[#EAF3FF] text-[#007AFF] font-bold text-[11px]">
                        {item.count} {item.count === 1 ? 'search' : 'searches'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] py-6 text-center border border-dashed border-[#DCE5F0] rounded-2xl">
                {lang === 'ar'
                  ? 'لم يتم تسجيل عمليات بحث بعد. جرب البحث في الموقع لرؤية البيانات مباشرة.'
                  : 'No search queries recorded yet. Use the search bar to log live intent data.'}
              </p>
            )}
          </div>

          {/* User Intent Distribution */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
              {lang === 'ar' ? 'توزيع نوايا الشراء والاهتمامات' : 'Shopper Intent Distribution'}
            </h4>

            {searchSummary.intentDistribution.length > 0 ? (
              <div className="space-y-3">
                {searchSummary.intentDistribution.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[#172033]">
                      <span className="capitalize">{item.intent.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-[#007AFF]">{item.percentage}% ({item.count})</span>
                    </div>
                    <div className="w-full bg-[#F5F8FC] rounded-full h-2 overflow-hidden border border-[#DCE5F0]">
                      <div
                        className="bg-[#007AFF] h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] py-6 text-center border border-dashed border-[#DCE5F0] rounded-2xl">
                {lang === 'ar' ? 'لا توجد أنماط نوايا حتى الآن' : 'No intent patterns detected yet'}
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmClearLogsOpen}
        lang={lang}
        title={lang === 'ar' ? 'مسح سجلات البحث' : 'Clear Search Analytics'}
        message={
          lang === 'ar'
            ? 'هل أنت متأكد من مسح كافة سجلات البحث المسجلة؟ لا يمكن التراجع عن هذا الإجراء.'
            : 'Are you sure you want to clear all recorded search analytics logs? This cannot be undone.'
        }
        confirmLabel={lang === 'ar' ? 'مسح السجلات' : 'Clear Logs'}
        onConfirm={confirmClearAnalytics}
        onCancel={() => setConfirmClearLogsOpen(false)}
      />
    </div>
  );
};
