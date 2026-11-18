import { Order, Product } from '../types';
import {
  combinedInventoryAndSalesToCsv,
  inventoryToCsv,
  salesOrdersToCsv,
} from '../utils/adminCsvReportHelpers';
import { recordAdminActivity } from './activityLogService';

/**
 * Triggers a client-side UTF-8 CSV download (prefixed with BOM for Excel Arabic support).
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const utf8Bom = '\uFEFF';
  const blob = new Blob([utf8Bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getDateSlug(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function downloadInventoryCsvReport(
  products: readonly Product[],
  orders: readonly Order[],
  scopeLabel: string = 'Full Catalog'
): string {
  const filename = `on-alaa-store-inventory-${getDateSlug()}.csv`;
  const csv = inventoryToCsv(products, orders);
  triggerCsvDownload(csv, filename);

  recordAdminActivity({
    action: 'report_exported_inventory',
    titleEn: 'Inventory CSV report downloaded',
    titleAr: 'تم تنزيل تقرير المخزون بصيغة CSV',
    category: 'catalog',
    severity: 'info',
    target: `${products.length} products (${scopeLabel})`,
    details: `Exported ${filename} for manual reporting.`,
    source: 'client',
  }).catch(() => {});

  return filename;
}

export function downloadSalesOrdersCsvReport(
  orders: readonly Order[],
  scopeLabel: string = 'All Orders'
): string {
  const filename = `on-alaa-store-sales-${getDateSlug()}.csv`;
  const csv = salesOrdersToCsv(orders);
  triggerCsvDownload(csv, filename);

  recordAdminActivity({
    action: 'report_exported_sales',
    titleEn: 'Sales & orders CSV report downloaded',
    titleAr: 'تم تنزيل تقرير المبيعات والطلبات بصيغة CSV',
    category: 'orders',
    severity: 'info',
    target: `${orders.length} orders (${scopeLabel})`,
    details: `Exported ${filename} for manual reporting.`,
    source: 'client',
  }).catch(() => {});

  return filename;
}

export function downloadCombinedInventoryAndSalesCsv(
  products: readonly Product[],
  orders: readonly Order[]
): string {
  const filename = `on-alaa-store-inventory-and-sales-${getDateSlug()}.csv`;
  const csv = combinedInventoryAndSalesToCsv(products, orders);
  triggerCsvDownload(csv, filename);

  recordAdminActivity({
    action: 'report_exported_combined',
    titleEn: 'Combined inventory & sales CSV report downloaded',
    titleAr: 'تم تنزيل التقرير الشامل للمخزون والمبيعات بصيغة CSV',
    category: 'settings',
    severity: 'info',
    target: `${products.length} SKUs / ${orders.length} orders`,
    details: `Exported ${filename} containing executive summary, current stock, and sales ledger.`,
    source: 'client',
  }).catch(() => {});

  return filename;
}
