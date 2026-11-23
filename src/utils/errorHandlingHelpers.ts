export const CHUNK_RELOAD_STORAGE_KEY = 'oaa_chunk_reload_at';
export const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

let inMemoryLastReloadAt = 0;

/**
 * Extracts a normalized human-readable message from any thrown value or rejection reason.
 */
export function extractErrorMessage(err: unknown): string {
  if (err == null) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || err.name || '';
  if (typeof err === 'object') {
    const record = err as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.reason === 'string') return record.reason;
    if (record.reason !== undefined) {
      return extractErrorMessage(record.reason);
    }
    if (record.error !== undefined) {
      return extractErrorMessage(record.error);
    }
  }
  try {
    return String(err);
  } catch {
    return '';
  }
}

/**
 * Returns true when an error or rejection is a known transient browser/dev-proxy
 * WebSocket or message-channel issue that should fail softly without crashing the app.
 */
export function isTransientNetworkOrSocketError(err: unknown): boolean {
  const msg = extractErrorMessage(err).toLowerCase();
  if (!msg) return false;

  const patterns = [
    'websocket closed without opened',
    'failed to connect to websocket',
    '@vite/client',
    'a listener indicated an asynchronous response by returning true, but the message channel closed',
    'the message port closed before a response was received',
    'resizeobserver loop limit exceeded',
    'resizeobserver loop completed with undelivered notifications',
    'err_network_changed',
  ];

  return patterns.some((pattern) => msg.includes(pattern));
}

/**
 * Detects stale lazy-chunk / dynamic module import errors triggered after a new deployment.
 */
export function isChunkLoadError(err: unknown): boolean {
  const msg = extractErrorMessage(err).toLowerCase();
  if (!msg) return false;

  const name =
    err instanceof Error
      ? err.name.toLowerCase()
      : typeof err === 'object' && err !== null && typeof (err as Record<string, unknown>).name === 'string'
        ? String((err as Record<string, unknown>).name).toLowerCase()
        : '';

  if (name === 'chunkloaderror') return true;

  return (
    msg.includes('chunkloaderror') ||
    msg.includes('loading chunk') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('unable to preload css')
  );
}

/**
 * Guarded single-shot reload check so chunk recovery cannot loop infinitely.
 */
export function shouldTriggerChunkRecoveryReload(
  nowMs: number = Date.now(),
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
  cooldownMs: number = CHUNK_RELOAD_COOLDOWN_MS
): boolean {
  let lastAttemptAt = inMemoryLastReloadAt;

  if (storage) {
    try {
      const raw = storage.getItem(CHUNK_RELOAD_STORAGE_KEY);
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > lastAttemptAt) {
          lastAttemptAt = parsed;
        }
      }
    } catch {
      // Restricted storage environment — rely on inMemoryLastReloadAt fallback
    }
  }

  if (lastAttemptAt > 0 && nowMs - lastAttemptAt < cooldownMs) {
    return false;
  }

  inMemoryLastReloadAt = nowMs;

  if (storage) {
    try {
      storage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(nowMs));
    } catch {
      // Ignore storage write restriction; in-memory guard remains active
    }
  }

  return true;
}

/**
 * Test helper to reset module-level cooldown state between unit tests.
 */
export function __resetChunkReloadGuardForTests(): void {
  inMemoryLastReloadAt = 0;
}
