import { Order, OrderStatus, Product, WarrantyClaimInfo } from '../types';

export type WarrantyCoverageStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'claimed'
  | 'pending_activation'
  | 'cancelled_void'
  | 'coverage_info_only';

export type WarrantyMatchType = 'order_id' | 'serial_barcode' | 'sku' | 'product_id';

export interface WarrantyCalculation {
  warrantyMonths: number;
  startDateIso: string | null;
  expiryDateIso: string | null;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  remainingMonthsApprox: number;
  remainingExtraDays: number;
  percentRemaining: number;
  status: WarrantyCoverageStatus;
  claimInfo?: WarrantyClaimInfo;
}

export interface WarrantyItemBreakdown {
  productId: string;
  productName: string;
  productNameAr?: string;
  brand: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  color?: string;
  variantName?: string;
  image?: string;
  warrantyTerms?: string;
  calculation: WarrantyCalculation;
}

export interface WarrantyLookupResult {
  query: string;
  matchType: WarrantyMatchType;
  dataSource: 'firestore' | 'local_cache';
  orderId?: string;
  orderStatus?: OrderStatus;
  orderDateIso?: string;
  coverageStartSource?: 'delivered' | 'order_date' | 'custom_purchase_date' | 'catalog_policy';
  items: WarrantyItemBreakdown[];
}

export interface SampleWarrantyLookup {
  query: string;
  labelEn: string;
  labelAr: string;
}

export const SAMPLE_WARRANTY_LOOKUPS: SampleWarrantyLookup[] = [
  {
    query: 'OAA-2027-1001',
    labelEn: 'Valid: OAA-2027-1001',
    labelAr: 'سارية: OAA-2027-1001',
  },
  {
    query: 'OAA-2025-0412',
    labelEn: 'Expired: OAA-2025-0412',
    labelAr: 'منتهية: OAA-2025-0412',
  },
  {
    query: 'OAA-2026-0884',
    labelEn: 'Claimed: OAA-2026-0884',
    labelAr: 'مطالب بها: OAA-2026-0884',
  },
  {
    query: '195949038221',
    labelEn: 'Serial / Barcode: 195949038221',
    labelAr: 'سيريال / باركود: 195949038221',
  },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Normalizes customer-entered Order ID or Serial / Barcode strings.
 */
export function normalizeLookupQuery(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ');
}

/**
 * Matches firestore.rules isValidId(id) requirement:
 * 1-128 chars matching ^[a-zA-Z0-9_\-]+$
 */
export function isValidFirestoreDocId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

/**
 * Normalizes legacy store names, city references, or phone numbers in pre-seeded
 * Firestore product warrantyTerms fields so live UI strictly reflects ON AlAA STORE.
 */
export function sanitizeWarrantyTerms(rawTerms?: unknown, fallbackTerms?: string): string | undefined {
  const pick =
    typeof rawTerms === 'string' && rawTerms.trim().length > 0
      ? rawTerms.trim()
      : typeof fallbackTerms === 'string' && fallbackTerms.trim().length > 0
      ? fallbackTerms.trim()
      : undefined;

  if (!pick) return undefined;

  return pick
    .replace(/\bM\.?\s*ARNAOUT\s*(?:CELL|STORE)?\b/gi, 'ON AlAA STORE')
    .replace(/\bARNAOUT\s*STORE\b/gi, 'ON AlAA STORE')
    .replace(/\bON\s*3LAA\s*STORE\b/gi, 'ON AlAA STORE')
    .replace(/\bSaida\b/gi, 'Chouf')
    .replace(/\b03[\s-]?099[\s-]?889\b|\b81[\s-]?900[\s-]?916\b/g, '03 986 718');
}

/**
 * Adds a whole number of calendar months to an ISO date string,
 * clamping the day of month safely (e.g., Jan 31 + 1 month -> Feb 28/29).
 */
export function addWarrantyMonths(startIso: string, warrantyMonths: number): Date {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Invalid start date: ${startIso}`);
  }
  const safeMonths = Math.max(0, Math.round(warrantyMonths));
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  const targetMonthIndex = month + safeMonths;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

  // Days in the target month (day 0 of next month gives last day of target month)
  const maxDayInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, maxDayInTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      clampedDay,
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds()
    )
  );
}

export function calculateWarrantyPeriod(params: {
  startDateIso: string | null;
  warrantyMonths: number;
  nowDate?: Date;
  orderStatus?: OrderStatus;
  claimInfo?: WarrantyClaimInfo;
}): WarrantyCalculation {
  const warrantyMonths = Math.max(0, Number(params.warrantyMonths) || 0);
  const now = params.nowDate ? new Date(params.nowDate.getTime()) : new Date();

  if (params.orderStatus === 'cancelled' || params.orderStatus === 'returned') {
    return {
      warrantyMonths,
      startDateIso: params.startDateIso,
      expiryDateIso: null,
      totalDays: 0,
      elapsedDays: 0,
      remainingDays: 0,
      remainingMonthsApprox: 0,
      remainingExtraDays: 0,
      percentRemaining: 0,
      status: 'cancelled_void',
    };
  }

  if (params.claimInfo) {
    const startValid =
      params.startDateIso && !Number.isNaN(new Date(params.startDateIso).getTime())
        ? new Date(params.startDateIso)
        : null;
    const expiryIso = startValid
      ? addWarrantyMonths(startValid.toISOString(), warrantyMonths).toISOString()
      : null;

    return {
      warrantyMonths,
      startDateIso: startValid ? startValid.toISOString() : null,
      expiryDateIso: expiryIso,
      totalDays: startValid && expiryIso
        ? Math.max(1, Math.round((new Date(expiryIso).getTime() - startValid.getTime()) / MS_PER_DAY))
        : Math.round(warrantyMonths * 30.4375),
      elapsedDays: startValid
        ? Math.max(0, Math.floor((now.getTime() - startValid.getTime()) / MS_PER_DAY))
        : 0,
      remainingDays: 0,
      remainingMonthsApprox: 0,
      remainingExtraDays: 0,
      percentRemaining: 0,
      status: 'claimed',
      claimInfo: params.claimInfo,
    };
  }

  if (
    params.orderStatus &&
    params.orderStatus !== 'delivered'
  ) {
    return {
      warrantyMonths,
      startDateIso: params.startDateIso,
      expiryDateIso: null,
      totalDays: Math.round(warrantyMonths * 30.4375),
      elapsedDays: 0,
      remainingDays: Math.round(warrantyMonths * 30.4375),
      remainingMonthsApprox: warrantyMonths,
      remainingExtraDays: 0,
      percentRemaining: 100,
      status: 'pending_activation',
    };
  }

  if (!params.startDateIso) {
    return {
      warrantyMonths,
      startDateIso: null,
      expiryDateIso: null,
      totalDays: Math.round(warrantyMonths * 30.4375),
      elapsedDays: 0,
      remainingDays: 0,
      remainingMonthsApprox: warrantyMonths,
      remainingExtraDays: 0,
      percentRemaining: 100,
      status: 'coverage_info_only',
    };
  }

  const start = new Date(params.startDateIso);
  if (Number.isNaN(start.getTime())) {
    return {
      warrantyMonths,
      startDateIso: null,
      expiryDateIso: null,
      totalDays: 0,
      elapsedDays: 0,
      remainingDays: 0,
      remainingMonthsApprox: 0,
      remainingExtraDays: 0,
      percentRemaining: 0,
      status: 'coverage_info_only',
    };
  }

  const expiry = addWarrantyMonths(start.toISOString(), warrantyMonths);
  const totalMs = Math.max(MS_PER_DAY, expiry.getTime() - start.getTime());
  const remainingMs = expiry.getTime() - now.getTime();
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());

  const totalDays = Math.max(1, Math.round(totalMs / MS_PER_DAY));
  const remainingDays = Math.max(0, Math.ceil(remainingMs / MS_PER_DAY));
  const elapsedDays = Math.min(totalDays, Math.floor(elapsedMs / MS_PER_DAY));

  const percentRemaining =
    remainingDays <= 0
      ? 0
      : Math.min(100, Math.max(1, Math.round((remainingDays / totalDays) * 100)));

  const remainingMonthsApprox = Math.floor(remainingDays / 30);
  const remainingExtraDays = remainingDays % 30;

  let status: WarrantyCoverageStatus;
  if (remainingDays <= 0) {
    status = 'expired';
  } else if (remainingDays <= 30) {
    status = 'expiring_soon';
  } else {
    status = 'active';
  }

  return {
    warrantyMonths,
    startDateIso: start.toISOString(),
    expiryDateIso: expiry.toISOString(),
    totalDays,
    elapsedDays,
    remainingDays,
    remainingMonthsApprox,
    remainingExtraDays,
    percentRemaining,
    status,
  };
}

export function resolveOrderWarrantyStartDate(order: Order): {
  dateIso: string;
  source: 'delivered' | 'order_date';
} {
  const deliveredEntry = Array.isArray(order.statusHistory)
    ? order.statusHistory.find((entry) => entry.status === 'delivered' && entry.timestamp)
    : undefined;

  if (deliveredEntry?.timestamp) {
    return { dateIso: deliveredEntry.timestamp, source: 'delivered' };
  }
  return { dateIso: order.orderDate, source: 'order_date' };
}

export function evaluateOrderWarranty(
  order: Order,
  productsCatalog: Product[],
  dataSource: 'firestore' | 'local_cache',
  nowDate?: Date
): WarrantyLookupResult {
  const { dateIso, source } = resolveOrderWarrantyStartDate(order);

  const items: WarrantyItemBreakdown[] = order.items.map((item) => {
    const matchedProduct = productsCatalog.find(
      (p) => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase()
    );

    const warrantyMonths = matchedProduct?.warrantyMonths ?? 12;

    const itemClaim =
      order.warrantyClaim &&
      (!order.warrantyClaim.claimedProductIds ||
        order.warrantyClaim.claimedProductIds.length === 0 ||
        order.warrantyClaim.claimedProductIds.includes(item.productId))
        ? order.warrantyClaim
        : undefined;

    return {
      productId: item.productId,
      productName: matchedProduct?.name || item.productName,
      productNameAr: matchedProduct?.nameAr,
      brand: matchedProduct?.brand || item.brand,
      sku: matchedProduct?.sku,
      barcode: matchedProduct?.barcode,
      quantity: item.quantity,
      color: item.color,
      variantName: item.variantName,
      image: item.image || matchedProduct?.images?.[0],
      warrantyTerms: sanitizeWarrantyTerms(matchedProduct?.warrantyTerms),
      calculation: calculateWarrantyPeriod({
        startDateIso: dateIso,
        warrantyMonths,
        nowDate,
        orderStatus: order.status,
        claimInfo: itemClaim,
      }),
    };
  });

  return {
    query: order.id,
    matchType: 'order_id',
    dataSource,
    orderId: order.id,
    orderStatus: order.status,
    orderDateIso: order.orderDate,
    coverageStartSource: source,
    items,
  };
}

export function evaluateSerialWarranty(params: {
  query: string;
  product: Product;
  matchType: Exclude<WarrantyMatchType, 'order_id'>;
  dataSource: 'firestore' | 'local_cache';
  customPurchaseDateIso?: string;
  nowDate?: Date;
}): WarrantyLookupResult {
  const { query, product, matchType, dataSource, customPurchaseDateIso, nowDate } = params;
  const normalizedDateIso =
    customPurchaseDateIso && !Number.isNaN(new Date(customPurchaseDateIso).getTime())
      ? new Date(customPurchaseDateIso).toISOString()
      : null;

  return {
    query,
    matchType,
    dataSource,
    coverageStartSource: normalizedDateIso ? 'custom_purchase_date' : 'catalog_policy',
    items: [
      {
        productId: product.id,
        productName: product.name,
        productNameAr: product.nameAr,
        brand: product.brand,
        sku: product.sku,
        barcode: product.barcode,
        quantity: 1,
        image: product.images?.[0],
        warrantyTerms: sanitizeWarrantyTerms(product.warrantyTerms),
        calculation: calculateWarrantyPeriod({
          startDateIso: normalizedDateIso,
          warrantyMonths: product.warrantyMonths || 12,
          nowDate,
        }),
      },
    ],
  };
}

export function formatWarrantyDate(iso: string | null, lang: 'en' | 'ar'): string {
  if (!iso) return lang === 'ar' ? 'عند التسليم' : 'Upon Delivery';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
