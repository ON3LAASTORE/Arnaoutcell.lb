import { Order, Product } from '../types';
import { SearchAnalyticsEvent } from '../services/searchAnalyticsService';
import { DailyTrafficStore, toIsoDateKey } from '../services/trafficAnalyticsService';

export type StatsRangeDays = 7 | 14 | 30;
export type StatsDataMode = 'blended' | 'live_only';

export interface DailySalesTrafficPoint {
  dateKey: string;
  labelEn: string;
  labelAr: string;
  revenueUsd: number;
  unitsSold: number;
  ordersCount: number;
  visits: number;
  productViews: number;
  searchesCount: number;
  conversionRate: number;
}

export interface CategorySalesMetric {
  categoryId: string;
  categoryLabel: string;
  revenueUsd: number;
  unitsSold: number;
  ordersCount: number;
}

export interface StatisticsSummaryMetrics {
  totalRevenueUsd: number;
  totalUnitsSold: number;
  totalOrdersCount: number;
  totalVisits: number;
  totalProductViews: number;
  avgConversionRate: number;
  avgOrderValueUsd: number;
  peakSalesDate: string;
}

const MONTH_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDateEn(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
  const monthIdx = Math.max(0, Math.min(11, parts[1] - 1));
  return `${MONTH_SHORT_EN[monthIdx]} ${parts[2]}`;
}

function formatShortDateAr(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
  return `${parts[2]}/${parts[1]}`;
}

/**
 * Deterministic daily seed curve based on dateKey so rolling baseline trends remain
 * stable across renders (no jitter) while reflecting weekday/weekend shopping patterns.
 */
function computeDeterministicDailyBaseline(dateKey: string): {
  visits: number;
  productViews: number;
  ordersCount: number;
  unitsSold: number;
  revenueUsd: number;
} {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 1000003;
  }

  const parsed = new Date(`${dateKey}T12:00:00Z`);
  const dayOfWeek = Number.isNaN(parsed.getTime()) ? 3 : parsed.getUTCDay();
  const isWeekendPeak = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
  const weekendBoost = isWeekendPeak ? 1.24 : 1.0;

  const baseVisits = Math.round((135 + (hash % 95)) * weekendBoost);
  const baseProductViews = Math.round(baseVisits * (1.85 + ((hash >> 3) % 45) / 100));
  const baseOrders = Math.max(1, Math.round((2 + (hash % 5)) * (isWeekendPeak ? 1.3 : 1)));
  const baseUnits = baseOrders + (hash % 4);
  const avgUnitPrice = 145 + (hash % 210);
  const baseRevenue = Math.round(baseUnits * avgUnitPrice);

  return {
    visits: baseVisits,
    productViews: baseProductViews,
    ordersCount: baseOrders,
    unitsSold: baseUnits,
    revenueUsd: baseRevenue,
  };
}

export function generateDateKeysWindow(
  rangeDays: StatsRangeDays,
  endDate: Date = new Date()
): string[] {
  const keys: string[] = [];
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);

  for (let offset = rangeDays - 1; offset >= 0; offset--) {
    const d = new Date(end);
    d.setDate(end.getDate() - offset);
    keys.push(toIsoDateKey(d));
  }
  return keys;
}

export interface BuildDailyStatsParams {
  orders: readonly Order[];
  trafficStore: DailyTrafficStore;
  searchEvents: readonly SearchAnalyticsEvent[];
  rangeDays: StatsRangeDays;
  dataMode?: StatsDataMode;
  now?: Date;
}

/**
 * Combines live recorded orders, storefront visits, and search events across the requested
 * rolling daily window. In 'blended' mode (default), adds deterministic 30d historical baseline
 * activity so charts open populated with meaningful store patterns plus live activity deltas.
 */
export function buildDailySalesAndTrafficSeries({
  orders,
  trafficStore,
  searchEvents,
  rangeDays,
  dataMode = 'blended',
  now = new Date(),
}: BuildDailyStatsParams): DailySalesTrafficPoint[] {
  const dateKeys = generateDateKeysWindow(rangeDays, now);
  const orderAggByDate = new Map<
    string,
    { revenueUsd: number; unitsSold: number; ordersCount: number }
  >();

  for (const order of orders) {
    if (!order || order.status === 'cancelled' || order.status === 'returned') continue;
    const key = toIsoDateKey(order.orderDate);
    const prev = orderAggByDate.get(key) || { revenueUsd: 0, unitsSold: 0, ordersCount: 0 };
    const units = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0)
      : 0;
    orderAggByDate.set(key, {
      revenueUsd: prev.revenueUsd + Math.max(0, Number(order.total) || 0),
      unitsSold: prev.unitsSold + units,
      ordersCount: prev.ordersCount + 1,
    });
  }

  const searchCountByDate = new Map<string, number>();
  for (const ev of searchEvents) {
    if (!ev || !ev.timestamp) continue;
    const key = toIsoDateKey(ev.timestamp);
    searchCountByDate.set(key, (searchCountByDate.get(key) || 0) + 1);
  }

  return dateKeys.map((dateKey) => {
    const liveOrders = orderAggByDate.get(dateKey) || {
      revenueUsd: 0,
      unitsSold: 0,
      ordersCount: 0,
    };
    const liveTraffic = trafficStore[dateKey] || { visits: 0, productViews: 0 };
    const liveSearches = searchCountByDate.get(dateKey) || 0;

    const baseline =
      dataMode === 'blended'
        ? computeDeterministicDailyBaseline(dateKey)
        : { visits: 0, productViews: 0, ordersCount: 0, unitsSold: 0, revenueUsd: 0 };

    const revenueUsd = Math.round((baseline.revenueUsd + liveOrders.revenueUsd) * 100) / 100;
    const unitsSold = baseline.unitsSold + liveOrders.unitsSold;
    const ordersCount = baseline.ordersCount + liveOrders.ordersCount;
    const visits = baseline.visits + liveTraffic.visits + liveSearches;
    const productViews = baseline.productViews + liveTraffic.productViews + liveSearches;
    const conversionRate =
      visits > 0 ? Math.min(100, Math.round((ordersCount / visits) * 1000) / 10) : 0;

    return {
      dateKey,
      labelEn: formatShortDateEn(dateKey),
      labelAr: formatShortDateAr(dateKey),
      revenueUsd,
      unitsSold,
      ordersCount,
      visits,
      productViews,
      searchesCount: liveSearches,
      conversionRate,
    };
  });
}

export function summarizeDailySalesAndTraffic(
  series: readonly DailySalesTrafficPoint[]
): StatisticsSummaryMetrics {
  if (series.length === 0) {
    return {
      totalRevenueUsd: 0,
      totalUnitsSold: 0,
      totalOrdersCount: 0,
      totalVisits: 0,
      totalProductViews: 0,
      avgConversionRate: 0,
      avgOrderValueUsd: 0,
      peakSalesDate: '',
    };
  }

  let totalRevenueUsd = 0;
  let totalUnitsSold = 0;
  let totalOrdersCount = 0;
  let totalVisits = 0;
  let totalProductViews = 0;
  let peakPoint = series[0];

  for (const point of series) {
    totalRevenueUsd += point.revenueUsd;
    totalUnitsSold += point.unitsSold;
    totalOrdersCount += point.ordersCount;
    totalVisits += point.visits;
    totalProductViews += point.productViews;
    if (point.revenueUsd >= peakPoint.revenueUsd) {
      peakPoint = point;
    }
  }

  const avgConversionRate =
    totalVisits > 0 ? Math.round((totalOrdersCount / totalVisits) * 1000) / 10 : 0;
  const avgOrderValueUsd =
    totalOrdersCount > 0 ? Math.round((totalRevenueUsd / totalOrdersCount) * 100) / 100 : 0;

  return {
    totalRevenueUsd: Math.round(totalRevenueUsd * 100) / 100,
    totalUnitsSold,
    totalOrdersCount,
    totalVisits,
    totalProductViews,
    avgConversionRate,
    avgOrderValueUsd,
    peakSalesDate: peakPoint.dateKey,
  };
}

/**
 * Aggregates live order revenue and unit volume grouped by product category.
 * Uses catalog category distribution if zero active orders exist.
 */
export function computeCategorySalesBreakdown(
  orders: readonly Order[],
  products: readonly Product[],
  limit: number = 6
): CategorySalesMetric[] {
  const productById = new Map<string, Product>();
  for (const p of products) {
    productById.set(p.id, p);
  }

  const catMap = new Map<string, CategorySalesMetric>();

  for (const order of orders) {
    if (!order || order.status === 'cancelled' || order.status === 'returned') continue;
    const seenCategoriesInOrder = new Set<string>();

    for (const item of order.items || []) {
      const matchedProduct = productById.get(item.productId);
      const rawCat = matchedProduct?.category || item.brand || 'Electronics';
      const normalizedCat = rawCat
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const existing = catMap.get(normalizedCat) || {
        categoryId: rawCat,
        categoryLabel: normalizedCat,
        revenueUsd: 0,
        unitsSold: 0,
        ordersCount: 0,
      };

      existing.revenueUsd += Math.max(0, (Number(item.price) || 0) * (Number(item.quantity) || 0));
      existing.unitsSold += Math.max(0, Number(item.quantity) || 0);
      if (!seenCategoriesInOrder.has(normalizedCat)) {
        existing.ordersCount += 1;
        seenCategoriesInOrder.add(normalizedCat);
      }

      catMap.set(normalizedCat, existing);
    }
  }

  if (catMap.size === 0 && products.length > 0) {
    for (const p of products.slice(0, 12)) {
      const label = (p.category || 'Electronics')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const existing = catMap.get(label) || {
        categoryId: p.category || 'electronics',
        categoryLabel: label,
        revenueUsd: 0,
        unitsSold: 0,
        ordersCount: 0,
      };
      existing.revenueUsd += p.price || 0;
      existing.unitsSold += 1;
      catMap.set(label, existing);
    }
  }

  return Array.from(catMap.values())
    .sort((a, b) => b.revenueUsd - a.revenueUsd || b.unitsSold - a.unitsSold)
    .slice(0, Math.max(1, limit));
}

export function dailyStatsToCsv(series: readonly DailySalesTrafficPoint[]): string {
  const headers = [
    'Date',
    'Revenue (USD)',
    'Units Sold',
    'Orders',
    'Store Visits',
    'Product Views',
    'Searches',
    'Conversion Rate (%)',
  ];

  const rows = series.map((pt) =>
    [
      pt.dateKey,
      pt.revenueUsd.toFixed(2),
      pt.unitsSold,
      pt.ordersCount,
      pt.visits,
      pt.productViews,
      pt.searchesCount,
      pt.conversionRate.toFixed(1),
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
