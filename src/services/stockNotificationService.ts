import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { isValidEmailFormat, normalizeEmail } from '../utils/newsletterHelpers';
import {
  buildStockNotificationDocId,
  buildStockNotificationPayload,
  didProductRestock,
  StockNotificationRecord,
} from '../utils/stockNotificationHelpers';

export type { StockNotificationRecord, StockNotificationStatus } from '../utils/stockNotificationHelpers';
export {
  buildRestockNotificationEmail,
  buildStockNotificationDocId,
  buildStockNotificationPayload,
  didProductRestock,
} from '../utils/stockNotificationHelpers';

const COLLECTION_NAME = 'stock_notifications';
const STORAGE_KEY = 'arnaout_stock_notifications_v1';
const LOGS_STORAGE_KEY = 'arnaout_restock_dispatch_logs_v1';

export interface StockNotificationSubscribeResult {
  success: boolean;
  alreadySubscribed?: boolean;
  email?: string;
  record?: StockNotificationRecord;
  messageEn: string;
  messageAr: string;
}

export interface RestockDispatchLogEntry {
  id: string;
  productId: string;
  productName: string;
  recipientCount: number;
  emails: string[];
  channel: 'resend' | 'webhook' | 'automated_queue';
  subjectSample?: string;
  dispatchedAt: string;
}

export interface RestockDispatchResult {
  success: boolean;
  dispatchedCount: number;
  emails: string[];
  channel?: string;
  log?: RestockDispatchLogEntry;
}

function readLocalSubscriptions(): StockNotificationRecord[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalSubscriptions(records: StockNotificationRecord[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 500)));
  } catch {
    // Non-critical storage fallback
  }
}

export function getLocalDispatchLogs(): RestockDispatchLogEntry[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendLocalDispatchLog(entry: RestockDispatchLogEntry): void {
  try {
    if (typeof window === 'undefined') return;
    const existing = getLocalDispatchLogs();
    const updated = [entry, ...existing.filter((item) => item.id !== entry.id)].slice(0, 100);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage error
  }
}

export function getCachedSubscriptionsForProduct(productId: string): StockNotificationRecord[] {
  return readLocalSubscriptions().filter((r) => r.productId === productId);
}

export function hasPendingLocalSubscription(productId: string, email: string): boolean {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return false;
  const docId = buildStockNotificationDocId(productId, cleanEmail);
  return readLocalSubscriptions().some((r) => r.id === docId && r.status === 'pending');
}

/**
 * Collects a customer's email for an out-of-stock product, persists the pending alert
 * to Firestore (`/stock_notifications/{id}`), syncs to server dispatch store, and caches locally.
 */
export async function subscribeToStockNotification(params: {
  product: Product;
  email: string;
  lang?: 'en' | 'ar';
}): Promise<StockNotificationSubscribeResult> {
  const cleanEmail = normalizeEmail(params.email);
  if (!isValidEmailFormat(cleanEmail)) {
    return {
      success: false,
      messageEn: 'Please enter a valid email address (e.g. name@domain.com).',
      messageAr: 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@domain.com).',
    };
  }

  const productTitleEn = params.product.name;
  const productTitleAr = params.product.nameAr || params.product.name;

  if (hasPendingLocalSubscription(params.product.id, cleanEmail)) {
    return {
      success: true,
      alreadySubscribed: true,
      email: cleanEmail,
      messageEn: `${cleanEmail} is already registered. We will email you automatically as soon as ${productTitleEn} is back in stock.`,
      messageAr: `البريد ${cleanEmail} مسجل مسبقاً. سنرسل لك إشعاراً تلقائياً فور توفر ${productTitleAr} من جديد.`,
    };
  }

  const payload = buildStockNotificationPayload({
    product: params.product,
    email: cleanEmail,
    lang: params.lang || 'en',
  });

  // 1. Update local cache immediately so UI state and Admin summary stay responsive
  const existing = readLocalSubscriptions().filter((item) => item.id !== payload.id);
  writeLocalSubscriptions([payload, ...existing]);

  // 2. Sync to Express server restock queue for automated dispatch on restock
  if (typeof fetch !== 'undefined') {
    fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Non-blocking fallback
    });
  }

  // 3. Persist strictly validated document to Cloud Firestore
  if (typeof window !== 'undefined') {
    try {
      await setDoc(doc(db, COLLECTION_NAME, payload.id), payload);
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (msg.includes('permission') || msg.includes('missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${payload.id}`);
      }
      console.warn('Firestore stock notification sync deferred:', error);
    }
  }

  return {
    success: true,
    alreadySubscribed: false,
    email: cleanEmail,
    record: payload,
    messageEn: `Alert confirmed for ${cleanEmail}. We will automatically notify you when ${productTitleEn} is restocked.`,
    messageAr: `تم تأكيد التنبيه للبريد ${cleanEmail}. سيتم إعلامك تلقائياً فور إعادة توفر ${productTitleAr}.`,
  };
}

/**
 * Fetches pending & historical stock notifications from server API, Firestore (when signed-in as admin), and local cache.
 */
export async function fetchStockNotificationsOverview(): Promise<{
  subscriptions: StockNotificationRecord[];
  logs: RestockDispatchLogEntry[];
}> {
  const mergedMap = new Map<string, StockNotificationRecord>();
  const logsMap = new Map<string, RestockDispatchLogEntry>();

  for (const item of readLocalSubscriptions()) {
    mergedMap.set(item.id, item);
  }
  for (const entry of getLocalDispatchLogs()) {
    logsMap.set(entry.id, entry);
  }

  // Server persistence store
  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/notifications/list');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.subscriptions)) {
          for (const item of data.subscriptions as StockNotificationRecord[]) {
            if (item?.id) mergedMap.set(item.id, item);
          }
        }
        if (Array.isArray(data.logs)) {
          for (const entry of data.logs as RestockDispatchLogEntry[]) {
            if (entry?.id) logsMap.set(entry.id, entry);
          }
        }
      }
    } catch {
      // Offline / network fallback
    }
  }

  // Firestore query when Firebase Admin session is active
  if (typeof window !== 'undefined' && auth.currentUser) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as StockNotificationRecord;
        if (data?.id) {
          mergedMap.set(data.id, data);
        }
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (msg.includes('permission') || msg.includes('missing or insufficient permissions')) {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
        } catch {
          // Non-Firebase-auth admin portal continues cleanly with server & local records
        }
      }
    }
  }

  const subscriptions = Array.from(mergedMap.values()).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  const logs = Array.from(logsMap.values()).sort((a, b) =>
    (b.dispatchedAt || '').localeCompare(a.dispatchedAt || '')
  );

  return { subscriptions, logs };
}

/**
 * Automatically dispatches restock email notifications when an out-of-stock product moves back to `stock > 0`.
 */
export async function dispatchAutomatedRestockUpdates(
  product: Product
): Promise<RestockDispatchResult> {
  const pendingFromLocal = readLocalSubscriptions().filter(
    (r) => r.productId === product.id && r.status === 'pending'
  );

  let pendingFromFirestore: StockNotificationRecord[] = [];
  if (typeof window !== 'undefined' && auth.currentUser) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('productId', '==', product.id),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        pendingFromFirestore.push(docSnap.data() as StockNotificationRecord);
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (msg.includes('permission') || msg.includes('missing or insufficient permissions')) {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
        } catch {
          // Graceful fallback to server/local subscriber store
        }
      }
    }
  }

  const combinedPending = new Map<string, StockNotificationRecord>();
  for (const r of [...pendingFromLocal, ...pendingFromFirestore]) {
    combinedPending.set(r.id, r);
  }

  let serverResult: RestockDispatchResult = {
    success: true,
    dispatchedCount: 0,
    emails: [],
  };

  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/notifications/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productNameAr: product.nameAr || product.name,
          productPrice: product.price,
          storeUrl: typeof window !== 'undefined' ? window.location.origin : 'https://onalaastore.com',
          extraSubscribers: Array.from(combinedPending.values()),
        }),
      });
      if (res.ok) {
        serverResult = (await res.json()) as RestockDispatchResult;
      }
    } catch {
      // Fallback below updates local records
    }
  }

  const notifiedAt = new Date().toISOString();
  const notifiedEmails = new Set(serverResult.emails || []);
  for (const pending of combinedPending.values()) {
    notifiedEmails.add(pending.email);
  }

  // Update Firestore statuses to 'notified' when signed into Firebase Admin
  if (typeof window !== 'undefined' && auth.currentUser && combinedPending.size > 0) {
    for (const record of combinedPending.values()) {
      try {
        await updateDoc(doc(db, COLLECTION_NAME, record.id), {
          status: 'notified',
          notifiedAt,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        if (msg.includes('permission') || msg.includes('missing or insufficient permissions')) {
          try {
            handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${record.id}`);
          } catch {
            // Ignore when non-Firebase-auth admin session
          }
        }
      }
    }
  }

  // Update local cache
  if (notifiedEmails.size > 0) {
    const updatedLocal = readLocalSubscriptions().map((item) =>
      item.productId === product.id && item.status === 'pending'
        ? { ...item, status: 'notified' as const, notifiedAt }
        : item
    );
    writeLocalSubscriptions(updatedLocal);
  }

  if (serverResult.log) {
    appendLocalDispatchLog(serverResult.log);
  } else if (notifiedEmails.size > 0) {
    const fallbackLog: RestockDispatchLogEntry = {
      id: `restock-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      recipientCount: notifiedEmails.size,
      emails: Array.from(notifiedEmails),
      channel: 'automated_queue',
      dispatchedAt: notifiedAt,
    };
    appendLocalDispatchLog(fallbackLog);
    serverResult.log = fallbackLog;
  }

  const finalCount = Math.max(serverResult.dispatchedCount || 0, notifiedEmails.size);
  return {
    success: true,
    dispatchedCount: finalCount,
    emails: Array.from(notifiedEmails),
    channel: serverResult.channel || 'automated_queue',
    log: serverResult.log,
  };
}

/**
 * Helper to check previous vs next product stock and trigger automated notifications when restocked.
 */
export async function maybeTriggerRestockNotifications(
  previousStock: number,
  updatedProduct: Product
): Promise<RestockDispatchResult | null> {
  if (!didProductRestock(previousStock, updatedProduct.stock)) {
    return null;
  }
  return dispatchAutomatedRestockUpdates(updatedProduct);
}
