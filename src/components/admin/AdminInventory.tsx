import React, { useState, useEffect, useCallback } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { saveProduct, deleteProduct, getOrders } from '../../services/storageService';
import {
  fetchStockNotificationsOverview,
  maybeTriggerRestockNotifications,
  RestockDispatchLogEntry,
  StockNotificationRecord,
} from '../../services/stockNotificationService';
import { downloadInventoryCsvReport } from '../../services/csvReportService';
import { Product } from '../../types';
import { Warehouse, AlertTriangle, AlertCircle, Search, BellRing, MailCheck, Download, Send, RefreshCw, X, Trash2 } from 'lucide-react';
import { LazyImage } from '../LazyImage';
import { ConfirmDialog } from '../ConfirmDialog';
import { DEFAULT_FULL_RES_FALLBACK_IMAGE } from '../../utils/imageResolutionHelpers';

export const AdminInventory: React.FC = () => {
  const { lang, products, brands, refreshData } = useShop();
  const { selectableBrands, hasPermission, requirePermission } = useAdmin();
  const hasFullStock = hasPermission('full_stock');
  const allBrandNames = Array.from(
    new Set([
      ...selectableBrands,
      ...(brands || []).map((b) => b?.name).filter((n): n is string => Boolean(n)),
    ])
  );
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; nameAr?: string } | null>(null);

  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [feedback, setFeedback] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [subscriptions, setSubscriptions] = useState<StockNotificationRecord[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<RestockDispatchLogEntry[]>([]);

  const loadNotificationsOverview = useCallback(async () => {
    try {
      setInventoryError('');
      const overview = await fetchStockNotificationsOverview();
      setSubscriptions(overview.subscriptions);
      setDispatchLogs(overview.logs);
    } catch (err) {
      setInventoryError(
        err instanceof Error
          ? err.message
          : 'Failed to load restock notification queue.'
      );
    }
  }, []);

  useEffect(() => {
    loadNotificationsOverview();
  }, [loadNotificationsOverview]);

  const handleAdjustStock = async (product: Product, delta: number) => {
    if (
      !requirePermission(['full_stock', 'manage_inventory'], {
        actionEn: `Adjust stock for "${product.name}"`,
        actionAr: `تعديل مخزون "${product.nameAr || product.name}"`,
      })
    ) {
      return;
    }
    try {
      setInventoryError('');
      const previousStock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
      const newStock = Math.max(0, previousStock + delta);
      const updated: Product = {
        ...product,
        stock: newStock,
      };
      saveProduct(updated);
      refreshData();

      const dispatchResult = await maybeTriggerRestockNotifications(previousStock, updated);
      await loadNotificationsOverview();

      if (dispatchResult && dispatchResult.dispatchedCount > 0) {
        setFeedback(
          lang === 'ar'
            ? `تم تحديث مخزون ${product.name} إلى ${newStock} قطعة — تم إرسال تنبيه التوفر تلقائياً إلى ${dispatchResult.dispatchedCount} عملاء.`
            : `Updated stock for ${product.name} to ${newStock} units — Automated restock update sent to ${dispatchResult.dispatchedCount} waiting subscriber(s)!`
        );
      } else {
        setFeedback(`Updated stock for ${product.name} to ${newStock} units`);
      }
      setTimeout(() => setFeedback(''), 5000);
    } catch (err) {
      setInventoryError(
        err instanceof Error
          ? err.message
          : `Failed to adjust stock for ${product.name}.`
      );
    }
  };

  const handleRequestDeleteInventory = (product: Product) => {
    if (
      !requirePermission('full_stock', {
        actionEn: `Delete inventory item "${product.name}"`,
        actionAr: `حذف صنف المخزون "${product.nameAr || product.name}"`,
        requiredRoles: ['super_admin'],
      })
    ) {
      return;
    }
    setPendingDelete({ id: product.id, name: product.name, nameAr: product.nameAr });
  };

  const confirmDeleteInventoryItem = () => {
    if (!pendingDelete) return;
    if (
      !requirePermission('full_stock', {
        actionEn: `Delete inventory item "${pendingDelete.name}"`,
        actionAr: `حذف صنف المخزون "${pendingDelete.nameAr || pendingDelete.name}"`,
        requiredRoles: ['super_admin'],
      })
    ) {
      setPendingDelete(null);
      return;
    }
    deleteProduct(pendingDelete.id);
    refreshData();
    setFeedback(
      lang === 'ar'
        ? `تم حذف الصنف "${pendingDelete.nameAr || pendingDelete.name}" من المخزون وقاعدة البيانات.`
        : `Deleted inventory item "${pendingDelete.name}" from stock & catalog.`
    );
    setPendingDelete(null);
    setTimeout(() => setFeedback(''), 5000);
  };

  const safeProducts = products || [];
  const filtered = safeProducts.filter((p) => {
    const pBrand = (p.brand || '').toLowerCase();
    const pName = (p.name || '').toLowerCase();
    const pSku = (p.sku || '').toLowerCase();
    const q = search.toLowerCase();
    const matchBrand = selectedBrand === 'all' || pBrand === selectedBrand.toLowerCase();
    const matchSearch = pName.includes(q) || pSku.includes(q) || pBrand.includes(q);
    return matchBrand && matchSearch;
  });

  const lowStockCount = safeProducts.filter((p) => {
    const stockVal = Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0;
    return stockVal <= (p.lowStockThreshold || 3);
  }).length;
  const pendingCountByProduct = subscriptions.reduce<Record<string, number>>((acc, item) => {
    if (item.status === 'pending') {
      acc[item.productId] = (acc[item.productId] || 0) + 1;
    }
    return acc;
  }, {});
  const totalPendingAlerts = subscriptions.filter((s) => s.status === 'pending').length;

  const handleExportInventoryCsv = () => {
    const scope =
      selectedBrand === 'all' && !search.trim() ? 'Full Catalog' : 'Filtered View';
    const filename = downloadInventoryCsvReport(filtered, getOrders(), scope);
    setFeedback(
      lang === 'ar'
        ? `تم تصدير تقرير المخزون (${filtered.length} منتج) إلى ${filename}.`
        : `Exported inventory CSV (${filtered.length} SKU row(s)) to ${filename}.`
    );
    setTimeout(() => setFeedback(''), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5F0]">
        <div>
          <h1 className="text-2xl font-black text-[#172033] flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-[#007AFF]" />
            <span>{lang === 'ar' ? 'المستودع (الشوف) ومراقبة المخزون' : 'Chouf Hub Warehouse & Stock Management'}</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? 'مراقبة كميات الأجهزة الحقيقية، تنبيهات النقص، وإرسال إشعارات إعادة التوفر التلقائية.'
              : 'Monitor real stock levels, low-quantity triggers, and automated customer restock email alerts.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasFullStock && (
            <div
              data-testid="inventory-full-stock-badge"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-bold"
            >
              <span>{lang === 'ar' ? 'صلاحية المخزون الكاملة' : 'Full Stock Access'}</span>
            </div>
          )}

          {totalPendingAlerts > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-[#007AFF] text-xs font-bold">
              <BellRing className="w-4 h-4" />
              <span>
                {totalPendingAlerts}{' '}
                {lang === 'ar' ? 'طلبات تنبيه بانتظار التوفر' : 'Waiting Restock Alerts'}
              </span>
            </div>
          )}

          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{lowStockCount} {lang === 'ar' ? 'منتجات تحتاج لإعادة تزويد' : 'Products need Restock'}</span>
            </div>
          )}

          <button
            type="button"
            data-testid="inventory-export-csv"
            onClick={handleExportInventoryCsv}
            className="px-3.5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-[#007AFF]/20 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تصدير المخزون CSV' : 'Export Inventory CSV'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold flex items-center gap-2"
        >
          <MailCheck className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {inventoryError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{inventoryError}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={loadNotificationsOverview}
              className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-[#DC2626] hover:bg-red-100 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
            <button
              type="button"
              onClick={() => setInventoryError('')}
              aria-label="Dismiss inventory error"
              className="p-1 text-red-400 hover:text-red-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search & Brand Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث بالاسم، SKU أو الماركة...' : 'Filter inventory by name, SKU, or brand...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono shadow-xs"
          />
        </div>

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="bg-white border border-[#DCE5F0] text-[#172033] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#007AFF] cursor-pointer shadow-xs font-medium"
        >
          <option value="all">{lang === 'ar' ? 'كافة الماركات' : 'All Brands'}</option>
          {allBrandNames.map((bName) => (
            <option key={bName} value={bName}>
              {bName}
            </option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl border border-[#DCE5F0] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-[#F5F8FC] text-[#64748B] uppercase tracking-wider text-[10px] border-b border-[#DCE5F0]">
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Restock Queue</th>
                <th className="py-3 px-4">Threshold</th>
                <th className="py-3 px-4 text-right rtl:text-left">Quick Stock Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5F0] text-[#172033]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-xs text-[#64748B]">
                    {lang === 'ar'
                      ? 'لا توجد أصناف مخزون مطابقة للبحث أو التصفية.'
                      : 'No inventory items match the current filter.'}
                  </td>
                </tr>
              ) : filtered.map((p) => {
                const stockVal = Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0;
                const isLow = stockVal <= (p.lowStockThreshold || 3);
                const isOut = stockVal <= 0;
                const waitingCount = pendingCountByProduct[p.id] || 0;

                return (
                  <tr key={p.id} className="hover:bg-[#F5F8FC] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <LazyImage
                          src={p.images?.[0] || DEFAULT_FULL_RES_FALLBACK_IMAGE}
                          alt={p.name || 'Product'}
                          width={40}
                          height={40}
                          priority={false}
                          wrapperClassName="w-10 h-10 rounded-lg overflow-hidden bg-[#F5F8FC] border border-[#DCE5F0] flex-shrink-0"
                          className="w-full h-full object-cover"
                        />
                        <div>
                          <div className="font-bold text-[#172033] line-clamp-1">{p.name || 'Unnamed Product'}</div>
                          <div className="text-[10px] text-[#007AFF] font-medium">{p.brand || '—'} • {p.category || '—'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#64748B]">{p.sku || p.id}</td>

                    <td className="py-3 px-4 font-mono font-bold">
                      {isOut ? (
                        <span className="text-[#DC2626]">0 (Out of Stock)</span>
                      ) : isLow ? (
                        <span className="text-amber-600 font-black">{stockVal} (Low Stock)</span>
                      ) : (
                        <span className="text-[#16A34A]">{stockVal} units</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {waitingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#007AFF] text-[10px] font-bold">
                          <BellRing className="w-3 h-3" />
                          {waitingCount} waiting
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8]">0 waiting</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#64748B] font-mono">
                      ≤ {p.lowStockThreshold || 3}
                    </td>

                    <td className="py-3 px-4 text-right rtl:text-left">
                      <div className="flex items-center justify-end gap-1.5 font-mono">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p, -1)}
                          aria-label={`Deduct 1 unit from ${p.name}`}
                          className="px-2.5 py-1 rounded-lg bg-[#F5F8FC] hover:bg-slate-200 border border-[#DCE5F0] text-[#172033] font-bold cursor-pointer"
                          title="Deduct 1"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p, 5)}
                          aria-label={`Restock 5 units for ${p.name}`}
                          className="px-2.5 py-1 rounded-lg bg-[#EAF3FF] hover:bg-[#007AFF] hover:text-white border border-[#BAE6FD] text-[#007AFF] font-bold transition-colors cursor-pointer"
                          title="Restock 5"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p, 10)}
                          aria-label={`Restock 10 units for ${p.name}`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-[#16A34A] hover:text-white border border-emerald-200 text-[#16A34A] font-bold transition-colors cursor-pointer"
                          title="Restock 10"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          data-testid={`inventory-delete-${p.id}`}
                          onClick={() => handleRequestDeleteInventory(p)}
                          aria-label={`Delete inventory item ${p.name}`}
                          className="p-1.5 rounded-lg bg-red-50/80 hover:bg-[#DC2626] hover:text-white border border-red-200 text-[#DC2626] transition-colors cursor-pointer"
                          title={
                            hasFullStock
                              ? lang === 'ar'
                                ? 'حذف من المخزون'
                                : 'Delete Inventory Item'
                              : lang === 'ar'
                              ? 'يتطلب صلاحية Full Stock'
                              : 'Requires Full Stock permission'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Notification Subscriptions & Automated Dispatch Log */}
      {(subscriptions.length > 0 || dispatchLogs.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#DCE5F0] bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#172033] flex items-center gap-2">
                <BellRing className="w-4 h-4 text-[#007AFF]" />
                <span>{lang === 'ar' ? 'قائمة انتظار توفر المنتجات' : 'Restock Email Alert Queue'}</span>
              </h2>
              <span className="text-[11px] font-bold text-[#64748B]">{subscriptions.length} total</span>
            </div>

            <div className="divide-y divide-[#DCE5F0] max-h-60 overflow-y-auto">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-[#172033] truncate">{sub.email}</div>
                    <div className="text-[11px] text-[#64748B] truncate">{sub.productName}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      sub.status === 'notified'
                        ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {sub.status === 'notified' ? 'Notified' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCE5F0] bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#172033] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'سجل الإشعارات التلقائية المرسلة' : 'Automated Restock Dispatch Log'}</span>
              </h2>
              <span className="text-[11px] font-bold text-[#64748B]">{dispatchLogs.length} sent</span>
            </div>

            {dispatchLogs.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4">
                {lang === 'ar'
                  ? 'سيتم إرسال البريد الإلكتروني تلقائياً بمجرد إعادة تزويد المخزون لأي منتج غير متوفر.'
                  : 'Automated updates will appear here whenever an out-of-stock item is restocked.'}
              </p>
            ) : (
              <div className="divide-y divide-[#DCE5F0] max-h-60 overflow-y-auto">
                {dispatchLogs.map((log) => (
                  <div key={log.id} className="py-2.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#172033] truncate">{log.productName}</span>
                      <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {log.recipientCount} notified
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] truncate">
                      {(log.emails || []).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        lang={lang}
        title={lang === 'ar' ? 'حذف صنف من المخزون' : 'Delete Inventory Item'}
        message={
          pendingDelete
            ? lang === 'ar'
              ? `هل أنت متأكد من حذف "${pendingDelete.nameAr || pendingDelete.name}" نهائياً من المخزون والكتالوج؟`
              : `Permanently delete "${pendingDelete.name}" from inventory and live catalog?`
            : ''
        }
        confirmLabel={lang === 'ar' ? 'حذف نهائي' : 'Delete Item'}
        onConfirm={confirmDeleteInventoryItem}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
