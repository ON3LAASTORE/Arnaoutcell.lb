import React from 'react';
import { useShop } from '../../context/ShopContext';
import { getOrders } from '../../services/storageService';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Search,
  Activity,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  getSearchAnalyticsSummary,
  clearSearchAnalytics,
  SearchAnalyticsSummary,
} from '../../services/searchAnalyticsService';

export const AdminOverview: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({
  onNavigateTab,
}) => {
  const { lang, products, storeSettings } = useShop();
  const orders = getOrders();

  // Metrics calculation
  const totalRevenue = orders.reduce((sum, o) => {
    if (o.status !== 'cancelled' && o.status !== 'returned') {
      return sum + o.total;
    }
    return sum;
  }, 0);

  const pendingOrders = orders.filter(
    (o) => o.status === 'new' || o.status === 'confirmed' || o.status === 'preparing'
  );
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const lowStockProducts = products.filter(
    (p) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 3)
  );
  const outOfStockProducts = products.filter((p) => p.stock <= 0);
  const offerProducts = products.filter((p) => p.isSpecialOffer);

  // Best selling products based on actual orders
  const salesMap: Record<string, { product: any; count: number; totalRev: number }> = {};
  orders.forEach((ord) => {
    if (ord.status !== 'cancelled' && ord.status !== 'returned') {
      ord.items.forEach((item) => {
        if (!salesMap[item.productId]) {
          salesMap[item.productId] = {
            product: item,
            count: 0,
            totalRev: 0,
          };
        }
        salesMap[item.productId].count += item.quantity;
        salesMap[item.productId].totalRev += item.price * item.quantity;
      });
    }
  });

  const bestSellers = Object.values(salesMap).sort((a, b) => b.count - a.count).slice(0, 4);

  const [searchSummary, setSearchSummary] = React.useState<SearchAnalyticsSummary>(() =>
    getSearchAnalyticsSummary(8)
  );

  const refreshSearchAnalytics = () => {
    setSearchSummary(getSearchAnalyticsSummary(8));
  };

  const handleClearAnalytics = () => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من مسح سجلات البحث؟' : 'Are you sure you want to clear search logs?')) {
      clearSearchAnalytics();
      setSearchSummary(getSearchAnalyticsSummary(8));
    }
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
              ? `مؤشرات أداء المتجر والمبيعات المسجلة لفرع ${storeSettings.storeNameAr || 'أرناؤوط ستور'} صيدا والتوصيل في لبنان.`
              : `Live business KPIs and actual order statistics for ${storeSettings.storeName} Saida.`}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#007AFF] bg-[#EAF3FF] px-3 py-1.5 rounded-xl border border-[#BAE6FD] self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse"></span>
          <span>Saida Live Sync</span>
        </div>
      </div>

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

      {/* Mid Section: Recent Orders & Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders Table */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
            <h3 className="font-bold text-[#172033] text-sm">
              {lang === 'ar' ? 'أحدث الطلبات الواردة' : 'Recent Customer Orders'}
            </h3>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('orders')}
                className="text-xs text-[#007AFF] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <span>{lang === 'ar' ? 'عرض الكل' : 'View All'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F5F8FC] text-[#64748B] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Area</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5F0] text-[#172033]">
                {orders.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#F5F8FC] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#007AFF]">{ord.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#172033]">{ord.customer.fullName}</div>
                      <div className="text-[10px] text-[#64748B]">{ord.customer.phone}</div>
                    </td>
                    <td className="py-3 px-3 text-[#64748B] truncate max-w-[140px]">{ord.customer.cityArea}</td>
                    <td className="py-3 px-3 font-black text-[#172033] font-mono">${ord.total}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD]">
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Best Sellers */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
            <h3 className="font-bold text-[#172033] text-sm">
              {lang === 'ar' ? 'الأكثر مبيعاً' : 'Best Sellers'}
            </h3>
            <TrendingUp className="w-4 h-4 text-[#007AFF]" />
          </div>

          <div className="space-y-3">
            {bestSellers.length > 0 ? (
              bestSellers.map((bs, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0]">
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
              <p className="text-xs text-[#64748B] py-4 text-center">No sales records yet</p>
            )}
          </div>
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
    </div>
  );
};
