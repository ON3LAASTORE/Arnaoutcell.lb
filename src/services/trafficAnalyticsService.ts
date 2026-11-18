import { safeStorageSetItem } from '../utils/storageQuotaHelpers';

export interface DailyTrafficBucket {
  visits: number;
  productViews: number;
}

export type DailyTrafficStore = Record<string, DailyTrafficBucket>;

const TRAFFIC_STORAGE_KEY = 'arnaout_daily_traffic_v1';
let memoryTrafficStore: DailyTrafficStore = {};

export function toIsoDateKey(dateInput: Date | number | string = new Date()): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(
      fallback.getDate()
    ).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function getStoredDailyTraffic(): DailyTrafficStore {
  if (typeof window === 'undefined') {
    return memoryTrafficStore;
  }
  try {
    const raw = window.localStorage.getItem(TRAFFIC_STORAGE_KEY);
    if (!raw) return memoryTrafficStore;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return memoryTrafficStore;
    }
    return parsed as DailyTrafficStore;
  } catch {
    return memoryTrafficStore;
  }
}

export function recordStorefrontTrafficEvent(
  eventType: 'page_view' | 'product_view',
  now: Date = new Date()
): DailyTrafficStore {
  const key = toIsoDateKey(now);
  const current = { ...getStoredDailyTraffic() };
  const existing = current[key] || { visits: 0, productViews: 0 };

  const updatedBucket: DailyTrafficBucket = {
    visits: existing.visits + (eventType === 'page_view' ? 1 : 0),
    productViews: existing.productViews + (eventType === 'product_view' ? 1 : 0),
  };

  // Prune keys older than 90 days to keep storage compact
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffKey = toIsoDateKey(cutoff);

  const nextStore: DailyTrafficStore = {};
  for (const [k, v] of Object.entries(current)) {
    if (k >= cutoffKey && v && typeof v.visits === 'number') {
      nextStore[k] = v;
    }
  }
  nextStore[key] = updatedBucket;
  memoryTrafficStore = nextStore;

  if (typeof window !== 'undefined') {
    safeStorageSetItem(window.localStorage, TRAFFIC_STORAGE_KEY, JSON.stringify(nextStore));
  }

  return nextStore;
}
