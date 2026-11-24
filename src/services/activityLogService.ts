import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  ActivityLogActor,
  ActivityLogEntry,
  CreateActivityLogInput,
  activityLogsToCsv,
  mergeActivityLogs,
  sanitizeActivityLogEntry,
} from '../utils/activityLogHelpers';
import {
  isFirestoreInQuotaCooldown,
  isFirestoreQuotaExceededError,
  markFirestoreQuotaExceeded,
} from '../utils/firestoreQuotaHelpers';
import { safeStorageSetItem } from '../utils/storageQuotaHelpers';
import { getAdminApiHeaders } from './authService';

const ACTIVITY_LOG_STORAGE_KEY = 'onalaa_admin_activity_logs_v1';
const ADMIN_ACTIVITY_COLLECTION = 'admin_activity_logs';
const MAX_LOCAL_LOGS = 500;

let memoryLogCache: ActivityLogEntry[] = [];
const logListeners = new Set<(logs: ActivityLogEntry[]) => void>();

function notifyListeners(logs: ActivityLogEntry[]): void {
  logListeners.forEach((listener) => {
    try {
      listener(logs);
    } catch {
      // Ignore individual listener errors
    }
  });
}

export function resolveCurrentAdminActor(): ActivityLogActor {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('arnaout_admin_user');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ActivityLogActor>;
        return {
          name: parsed.name || '3Laa Hassan',
          username: parsed.username || 'admin',
          role: parsed.role || 'super_admin',
          ...(parsed.email ? { email: parsed.email } : {}),
        };
      }
    } catch {
      // Fallback to default admin actor
    }
  }
  return {
    name: '3Laa Hassan',
    username: 'admin',
    role: 'super_admin',
    email: 'admin@arnaoutcell.com',
  };
}

export function getCachedActivityLogs(): ActivityLogEntry[] {
  if (typeof window === 'undefined') {
    return memoryLogCache;
  }

  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_STORAGE_KEY);
    if (!raw) return memoryLogCache;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return memoryLogCache;
    const sanitized = parsed.map((item) => sanitizeActivityLogEntry(item));
    const merged = mergeActivityLogs(memoryLogCache, sanitized, MAX_LOCAL_LOGS);
    memoryLogCache = merged;
    return merged;
  } catch {
    return memoryLogCache;
  }
}

function persistLocalLogs(logs: ActivityLogEntry[]): ActivityLogEntry[] {
  const merged = mergeActivityLogs(logs, [], MAX_LOCAL_LOGS);
  memoryLogCache = merged;
  if (typeof window !== 'undefined') {
    safeStorageSetItem(window.localStorage, ACTIVITY_LOG_STORAGE_KEY, JSON.stringify(merged));
  }
  notifyListeners(merged);
  return merged;
}

export function subscribeActivityLogs(
  listener: (logs: ActivityLogEntry[]) => void
): () => void {
  logListeners.add(listener);
  listener(getCachedActivityLogs());
  return () => {
    logListeners.delete(listener);
  };
}

function canSyncToAdminFirestore(): boolean {
  if (typeof window === 'undefined') return false;
  if (isFirestoreInQuotaCooldown()) return false;
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  const emailLower = (currentUser.email || '').toLowerCase();
  return (
    emailLower === 'alaa@onalaastore.com' ||
    (emailLower === 'optimatech.lb@gmail.com' && currentUser.emailVerified)
  );
}

function buildFirestoreActivityDoc(entry: ActivityLogEntry): Record<string, unknown> {
  return {
    id: entry.id,
    action: entry.action,
    titleEn: entry.titleEn,
    titleAr: entry.titleAr,
    category: entry.category,
    severity: entry.severity,
    target: entry.target,
    details: entry.details,
    actor: {
      name: entry.actor.name,
      username: entry.actor.username,
      role: entry.actor.role,
      ...(entry.actor.email ? { email: entry.actor.email } : {}),
    },
    source: entry.source,
    timestamp: entry.timestamp,
  };
}

/**
 * Records a sensitive admin or security event across local cache, backend audit store,
 * and Firestore (when authenticated as verified Super Admin). Never blocks caller workflows.
 */
export async function recordAdminActivity(
  input: CreateActivityLogInput
): Promise<ActivityLogEntry> {
  const currentActor = resolveCurrentAdminActor();
  const entry = sanitizeActivityLogEntry({
    ...input,
    actor: {
      ...currentActor,
      ...(input.actor || {}),
    },
    source: input.source || 'client',
  });

  // 1. Optimistically persist to local cache & notify live UI listeners
  const updatedLocal = mergeActivityLogs([entry], getCachedActivityLogs(), MAX_LOCAL_LOGS);
  persistLocalLogs(updatedLocal);

  // 2. Persist to server-side audit log store
  if (typeof fetch !== 'undefined') {
    try {
      const response = await fetch('/api/admin/activity-logs', {
        method: 'POST',
        headers: getAdminApiHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        body: JSON.stringify(entry),
      });
      if (response.ok) {
        const data = (await response.json()) as { entry?: ActivityLogEntry };
        if (data?.entry) {
          const normalized = sanitizeActivityLogEntry(data.entry);
          persistLocalLogs(
            mergeActivityLogs([normalized], getCachedActivityLogs(), MAX_LOCAL_LOGS)
          );
        }
      }
    } catch {
      // Non-fatal: local cache and Firestore remain available
    }
  }

  // 3. Mirror immutable record to Firestore /admin_activity_logs when Firebase Admin SSO is active
  if (canSyncToAdminFirestore()) {
    try {
      await setDoc(
        doc(db, ADMIN_ACTIVITY_COLLECTION, entry.id),
        buildFirestoreActivityDoc(entry)
      );
    } catch (err) {
      if (isFirestoreQuotaExceededError(err)) {
        markFirestoreQuotaExceeded();
      } else {
        console.warn('Background activity log Firestore sync notice:', err);
      }
    }
  }

  return entry;
}

/**
 * Fetches and reconciles audit logs from backend persistent store, Firestore (if authorized),
 * and local browser cache.
 */
export async function fetchAdminActivityLogs(): Promise<ActivityLogEntry[]> {
  let serverLogs: ActivityLogEntry[] = [];
  let firestoreLogs: ActivityLogEntry[] = [];
  const cachedLogs = getCachedActivityLogs();

  if (typeof fetch !== 'undefined') {
    try {
      const response = await fetch('/api/admin/activity-logs?limit=500', {
        method: 'GET',
        headers: getAdminApiHeaders(),
        credentials: 'same-origin',
      });
      if (response.ok) {
        const data = (await response.json()) as { logs?: CreateActivityLogInput[] };
        if (Array.isArray(data.logs)) {
          serverLogs = data.logs.map((item) => sanitizeActivityLogEntry(item));
        }
      }
    } catch {
      // Fallback gracefully to cached + Firestore logs
    }
  }

  if (canSyncToAdminFirestore()) {
    try {
      const snap = await getDocs(
        query(
          collection(db, ADMIN_ACTIVITY_COLLECTION),
          orderBy('timestamp', 'desc'),
          limit(250)
        )
      );
      firestoreLogs = snap.docs.map((d) =>
        sanitizeActivityLogEntry({
          ...(d.data() as CreateActivityLogInput),
          id: d.id,
          source: 'firestore',
        })
      );
    } catch (err) {
      if (isFirestoreQuotaExceededError(err)) {
        markFirestoreQuotaExceeded();
      } else {
        console.warn('Background activity log Firestore fetch notice:', err);
      }
    }
  }

  const combined = mergeActivityLogs(
    serverLogs,
    mergeActivityLogs(firestoreLogs, cachedLogs, MAX_LOCAL_LOGS),
    MAX_LOCAL_LOGS
  );
  persistLocalLogs(combined);
  return combined;
}

export function downloadActivityLogsCsv(logs: readonly ActivityLogEntry[]): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const csv = activityLogsToCsv(logs);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const dateTag = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.setAttribute('download', `on-alaa-store-activity-log-${dateTag}.csv`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
