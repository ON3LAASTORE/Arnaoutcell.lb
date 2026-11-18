import { Order, Product } from '../types';

export interface CombinedReportSummary {
  generatedAt: string;
  totalProducts: number;
  totalStockUnits: number;
  totalInventoryValueUsd: number;
  lowStockCount: number;
  outOfStockCount: number;
  activeOrdersCount: number;
  cancelledOrReturnedOrdersCount: number;
  totalUnitsSold: number;
  totalSalesRevenueUsd: number;
}

/**
 * Escapes any cell value per RFC 4180 and neutralizes spreadsheet formula injection.
 */
export function escapeCsvCell(value: unknown): string {
  let str = String(value ?? '');
  if (/^[=+\t\r@]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(cells: readonly unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

function formatMoney(amount: unknown): string {
  const num = Number(amount);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

export function getEffectiveProductPrice(product: Product): number {
  return Math.max(0, Number(product.price) || 0);
}

export function getInventoryStockStatus(product: Product): 'Out of Stock' | 'Low Stock' | 'In Stock' {
  if ((product.stock || 0) <= 0) return 'Out of Stock';
  const threshold = typeof product.lowStockThreshold === 'number' ? product.lowStockThreshold : 3;
  if (product.stock <= threshold) return 'Low Stock';
  return 'In Stock';
}

export function computeUnitsSoldByProduct(orders: readonly Order[]): Map<string, number> {
  const soldMap = new Map<string, number>();
  for (const order of orders) {
    if (!order || order.status === 'cancelled' || order.status === 'returned') continue;
    for (const item of order.items || []) {
      const qty = Math.max(0, Number(item.quantity) || 0);
      soldMap.set(item.productId, (soldMap.get(item.productId) || 0) + qty);
    }
  }
  return soldMap;
}

export function computeCombinedReportSummary(
  products: readonly Product[],
  orders: readonly Order[],
  now: Date = new Date()
): CombinedReportSummary {
  let totalStockUnits = 0;
  let totalInventoryValueUsd = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    const stock = Math.max(0, Number(p.stock) || 0);
    const effectivePrice = getEffectiveProductPrice(p);
    totalStockUnits += stock;
    totalInventoryValueUsd += stock * effectivePrice;
    const status = getInventoryStockStatus(p);
    if (status === 'Out of Stock') outOfStockCount++;
    else if (status === 'Low Stock') lowStockCount++;
  }

  let activeOrdersCount = 0;
  let cancelledOrReturnedOrdersCount = 0;
  let totalUnitsSold = 0;
  let totalSalesRevenueUsd = 0;

  for (const o of orders) {
    if (!o) continue;
    if (o.status === 'cancelled' || o.status === 'returned') {
      cancelledOrReturnedOrdersCount++;
      continue;
    }
    activeOrdersCount++;
    totalSalesRevenueUsd += Number(o.total) || 0;
    for (const item of o.items || []) {
      totalUnitsSold += Math.max(0, Number(item.quantity) || 0);
    }
  }

  return {
    generatedAt: now.toISOString(),
    totalProducts: products.length,
    totalStockUnits,
    totalInventoryValueUsd: Math.round(totalInventoryValueUsd * 100) / 100,
    lowStockCount,
    outOfStockCount,
    activeOrdersCount,
    cancelledOrReturnedOrdersCount,
    totalUnitsSold,
    totalSalesRevenueUsd: Math.round(totalSalesRevenueUsd * 100) / 100,
  };
}

export const INVENTORY_CSV_HEADERS = [
  'Product ID',
  'SKU',
  'Product Name',
  'Brand',
  'Category',
  'Original Price (USD)',
  'Selling Price (USD)',
  'Discount (%)',
  'Current Stock',
  'Low Stock Threshold',
  'Stock Status',
  'Inventory Value (USD)',
  'Recorded Units Sold',
  'Special Offer',
] as const;

export function buildInventoryCsvRows(
  products: readonly Product[],
  orders: readonly Order[] = []
): string[] {
  const soldMap = computeUnitsSoldByProduct(orders);
  const rows: string[] = [toCsvRow(INVENTORY_CSV_HEADERS)];

  for (const p of products) {
    const stock = Math.max(0, Number(p.stock) || 0);
    const sellingPrice = getEffectiveProductPrice(p);
    const originalPrice = Math.max(sellingPrice, Number(p.originalPrice) || sellingPrice);
    const computedDiscount =
      typeof p.discountPercentage === 'number'
        ? p.discountPercentage
        : originalPrice > sellingPrice && originalPrice > 0
          ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
          : 0;
    const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 3;
    const status = getInventoryStockStatus(p);
    const inventoryVal = stock * sellingPrice;
    const unitsSold = soldMap.get(p.id) || 0;

    rows.push(
      toCsvRow([
        p.id,
        p.sku || '',
        p.name,
        p.brand,
        p.category,
        formatMoney(originalPrice),
        formatMoney(sellingPrice),
        computedDiscount > 0 ? `${computedDiscount}%` : '0%',
        stock,
        threshold,
        status,
        formatMoney(inventoryVal),
        unitsSold,
        p.isSpecialOffer ? 'Yes' : 'No',
      ])
    );
  }

  return rows;
}

export function inventoryToCsv(
  products: readonly Product[],
  orders: readonly Order[] = []
): string {
  return buildInventoryCsvRows(products, orders).join('\n');
}

export const SALES_CSV_HEADERS = [
  'Order ID',
  'Order Date',
  'Customer Name',
  'Customer Phone',
  'City / Area',
  'Delivery Address',
  'Order Status',
  'Payment Method',
  'Payment Status',
  'Items Breakdown',
  'Total Units',
  'Subtotal (USD)',
  'Discount (USD)',
  'Delivery Fee (USD)',
  'Grand Total (USD)',
] as const;

export function buildSalesOrdersCsvRows(orders: readonly Order[]): string[] {
  const sorted = [...orders].sort(
    (a, b) => (Date.parse(b.orderDate) || 0) - (Date.parse(a.orderDate) || 0)
  );
  const rows: string[] = [toCsvRow(SALES_CSV_HEADERS)];

  for (const ord of sorted) {
    const itemsSummary = (ord.items || [])
      .map((item) => `${item.quantity}x ${item.productName} ($${formatMoney(item.price)})`)
      .join(' | ');
    const totalUnits = (ord.items || []).reduce(
      (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
      0
    );

    rows.push(
      toCsvRow([
        ord.id,
        ord.orderDate,
        ord.customer?.fullName || '',
        ord.customer?.phone || '',
        ord.customer?.cityArea || '',
        ord.customer?.addressLine || '',
        ord.status,
        ord.paymentMethod,
        ord.paymentStatus,
        itemsSummary,
        totalUnits,
        formatMoney(ord.subtotal),
        formatMoney(ord.discount),
        formatMoney(ord.deliveryFee),
        formatMoney(ord.total),
      ])
    );
  }

  return rows;
}

export function salesOrdersToCsv(orders: readonly Order[]): string {
  return buildSalesOrdersCsvRows(orders).join('\n');
}

/**
 * Generates a unified manual-reporting CSV containing executive summary metrics,
 * full current inventory breakdown, and full recorded sales orders.
 */
export function combinedInventoryAndSalesToCsv(
  products: readonly Product[],
  orders: readonly Order[],
  now: Date = new Date()
): string {
  const summary = computeCombinedReportSummary(products, orders, now);

  const lines: string[] = [
    toCsvRow(['REPORT SECTION', 'EXECUTIVE SUMMARY']),
    toCsvRow(['Generated At (UTC)', summary.generatedAt]),
    toCsvRow(['Total Catalog SKUs', summary.totalProducts]),
    toCsvRow(['Total Units In Stock', summary.totalStockUnits]),
    toCsvRow(['Total Inventory Valuation (USD)', formatMoney(summary.totalInventoryValueUsd)]),
    toCsvRow(['Low Stock SKUs', summary.lowStockCount]),
    toCsvRow(['Out of Stock SKUs', summary.outOfStockCount]),
    toCsvRow(['Active Sales Orders', summary.activeOrdersCount]),
    toCsvRow(['Cancelled / Returned Orders', summary.cancelledOrReturnedOrdersCount]),
    toCsvRow(['Total Units Sold (Active Orders)', summary.totalUnitsSold]),
    toCsvRow(['Total Verified Sales Revenue (USD)', formatMoney(summary.totalSalesRevenueUsd)]),
    '',
    toCsvRow(['REPORT SECTION', 'CURRENT INVENTORY']),
    ...buildInventoryCsvRows(products, orders),
    '',
    toCsvRow(['REPORT SECTION', 'SALES & ORDERS']),
    ...buildSalesOrdersCsvRows(orders),
  ];

  return lines.join('\n');
}
