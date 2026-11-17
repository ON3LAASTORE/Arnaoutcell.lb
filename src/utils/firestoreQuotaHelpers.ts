/**
 * Pure utilities for classifying Firestore errors (quota exhaustion vs permission vs network)
 * and managing short-term quota cooldowns so the storefront gracefully falls back to
 * local/cached data without throwing uncaught exceptions or spamming exhausted projects.
 */

export const FIRESTORE_QUOTA_COOLDOWN_KEY = 'arnaout_firestore_quota_cooldown_until';
export const DEFAULT_FIRESTORE_QUOTA_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export type FirestoreErrorCategory = 'quota' | 'permission' | 'network' | 'unknown';

let memoryQuotaCooldownUntil = 0;

function extractErrorDetails(error: unknown): { code: string; message: string } {
  if (!error) {
    return { code: '', message: '' };
  }
  if (typeof error === 'string') {
    return { code: '', message: error.toLowerCase() };
  }
  if (typeof error === 'object') {
    const maybeErr = error as { code?: unknown; message?: unknown; name?: unknown };
    const code = typeof maybeErr.code === 'string' ? maybeErr.code.toLowerCase() : '';
    const message =
      typeof maybeErr.message === 'string'
        ? maybeErr.message.toLowerCase()
        : String(error).toLowerCase();
    return { code, message };
  }
  return { code: '', message: String(error).toLowerCase() };
}

export function isFirestoreQuotaExceededError(error: unknown): boolean {
  const { code, message } = extractErrorDetails(error);
  if (code === 'resource-exhausted' || code === 'firestore/resource-exhausted') {
    return true;
  }
  return (
    message.includes('quota limit exceeded') ||
    message.includes('quota exceeded') ||
    message.includes('free daily read units') ||
    message.includes('resource-exhausted') ||
    message.includes('resource_exhausted')
  );
}

export function isFirestorePermissionError(error: unknown): boolean {
  const { code, message } = extractErrorDetails(error);
  if (code === 'permission-denied' || code === 'firestore/permission-denied') {
    return true;
  }
  return (
    message.includes('missing or insufficient permissions') ||
    message.includes('permission-denied') ||
    message.includes('permission denied')
  );
}

export function isFirestoreNetworkError(error: unknown): boolean {
  const { code, message } = extractErrorDetails(error);
  if (
    code === 'unavailable' ||
    code === 'firestore/unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'aborted'
  ) {
    return true;
  }
  return (
    message.includes('the client is offline') ||
    message.includes('offline') ||
    message.includes('unavailable') ||
    message.includes('transport') ||
    message.includes('network-request-failed') ||
    message.includes('failed to fetch') ||
    message.includes('deadline-exceeded')
  );
}

export function classifyFirestoreError(error: unknown): FirestoreErrorCategory {
  if (isFirestoreQuotaExceededError(error)) return 'quota';
  if (isFirestorePermissionError(error)) return 'permission';
  if (isFirestoreNetworkError(error)) return 'network';
  return 'unknown';
}

function getDefaultStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Restricted storage environment
  }
  return null;
}

export function markFirestoreQuotaExceeded(options?: {
  nowMs?: number;
  cooldownMs?: number;
  storage?: Storage | null;
}): number {
  const nowMs = options?.nowMs ?? Date.now();
  const cooldownMs = Math.max(0, options?.cooldownMs ?? DEFAULT_FIRESTORE_QUOTA_COOLDOWN_MS);
  const until = nowMs + cooldownMs;
  memoryQuotaCooldownUntil = Math.max(memoryQuotaCooldownUntil, until);

  const storage = options && 'storage' in options ? options.storage : getDefaultStorage();
  if (storage) {
    try {
      storage.setItem(FIRESTORE_QUOTA_COOLDOWN_KEY, String(memoryQuotaCooldownUntil));
    } catch {
      // Ignore restricted storage write
    }
  }
  return memoryQuotaCooldownUntil;
}

export function getFirestoreQuotaCooldownUntil(storage?: Storage | null): number {
  let until = memoryQuotaCooldownUntil;
  const resolvedStorage = storage !== undefined ? storage : getDefaultStorage();
  if (resolvedStorage) {
    try {
      const raw = resolvedStorage.getItem(FIRESTORE_QUOTA_COOLDOWN_KEY);
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > until) {
          until = parsed;
          memoryQuotaCooldownUntil = parsed;
        }
      }
    } catch {
      // Ignore storage read failure
    }
  }
  return until;
}

export function isFirestoreInQuotaCooldown(options?: {
  nowMs?: number;
  storage?: Storage | null;
}): boolean {
  const nowMs = options?.nowMs ?? Date.now();
  const until = getFirestoreQuotaCooldownUntil(options?.storage);
  return until > nowMs;
}

export function getFirestoreQuotaCooldownRemainingMs(options?: {
  nowMs?: number;
  storage?: Storage | null;
}): number {
  const nowMs = options?.nowMs ?? Date.now();
  const until = getFirestoreQuotaCooldownUntil(options?.storage);
  return Math.max(0, until - nowMs);
}

export function clearFirestoreQuotaCooldown(storage?: Storage | null): void {
  memoryQuotaCooldownUntil = 0;
  const resolvedStorage = storage !== undefined ? storage : getDefaultStorage();
  if (resolvedStorage) {
    try {
      resolvedStorage.removeItem(FIRESTORE_QUOTA_COOLDOWN_KEY);
    } catch {
      // Ignore storage remove failure
    }
  }
}
