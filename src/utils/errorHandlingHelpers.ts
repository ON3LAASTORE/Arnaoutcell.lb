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

function extractErrorStack(err: unknown): string {
  if (err instanceof Error && typeof err.stack === 'string') {
    return err.stack;
  }
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    if (typeof record.stack === 'string') return record.stack;
    if (record.reason !== undefined) return extractErrorStack(record.reason);
    if (record.error !== undefined) return extractErrorStack(record.error);
  }
  return '';
}

function isProtectedApplicationError(lowerCombined: string): boolean {
  const protectedMarkers = [
    'firebaseerror',
    'auth/',
    'firestore',
    'permission-denied',
    'missing or insufficient permissions',
    'rendered more hooks',
    'minified react error',
    'cannot read properties of',
    'is not a function',
  ];
  return protectedMarkers.some((marker) => lowerCombined.includes(marker));
}

/**
 * Specifically identifies transient Vite HMR / @vite/client WebSocket connection
 * rejections or events so they never pollute the console as Unhandled Rejection.
 */
export function isViteHmrWebSocketError(err: unknown, sourceFilename?: string): boolean {
  const msg = extractErrorMessage(err).toLowerCase();
  const stack = extractErrorStack(err).toLowerCase();
  const source = (sourceFilename || '').toLowerCase();
  const combined = `${msg}\n${stack}\n${source}`;

  // Never swallow genuine Firebase, Firestore, Auth, or React runtime errors
  if (isProtectedApplicationError(msg) && !combined.includes('@vite/client')) {
    return false;
  }

  if (
    msg.includes('websocket closed without opened') ||
    msg.includes('[vite] failed to connect to websocket') ||
    msg.includes('failed to connect to websocket')
  ) {
    return true;
  }

  const fromViteClient =
    combined.includes('@vite/client') ||
    combined.includes('vite/dist/client') ||
    combined.includes('vite-hmr') ||
    combined.includes('vite-ping');

  if (
    fromViteClient &&
    (msg.includes('websocket') ||
      msg.includes('sendbeforeconnecterror') ||
      msg.includes('connection'))
  ) {
    return true;
  }

  // Handle DOM Event / CloseEvent emitted directly by a Vite HMR WebSocket
  if (typeof err === 'object' && err !== null && 'target' in err) {
    const target = (err as { target?: unknown }).target as
      | { url?: unknown; protocol?: unknown }
      | undefined;
    const targetUrl = typeof target?.url === 'string' ? target.url.toLowerCase() : '';
    const targetProtocol =
      typeof target?.protocol === 'string' ? target.protocol.toLowerCase() : '';
    if (
      targetProtocol === 'vite-hmr' ||
      targetProtocol === 'vite-ping' ||
      targetUrl.includes('token=')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Returns true when an error or rejection is a known transient Vite HMR WebSocket
 * or browser-extension channel issue that should fail softly without crashing the app,
 * while never swallowing real React, Firebase Auth, Firestore, or application errors.
 */
export function isTransientNetworkOrSocketError(
  err: unknown,
  sourceFilename?: string
): boolean {
  if (isViteHmrWebSocketError(err, sourceFilename)) {
    return true;
  }

  const msg = extractErrorMessage(err).toLowerCase();
  if (!msg || isProtectedApplicationError(msg)) return false;

  const patterns = [
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
