import React, { ComponentType } from 'react';

export interface SafeLazyOptions<TProps = Record<string, unknown>> {
  /** Number of retry attempts after initial dynamic import failure (default: 2) */
  retries?: number;
  /** Base backoff delay in ms; doubles each attempt (default: 250ms) */
  retryDelayMs?: number;
  /** Optional fallback component used if all retries fail (prevents decorative widgets from crashing the app) */
  fallbackComponent?: ComponentType<TProps>;
  /** Custom delay function (injectable for deterministic unit testing) */
  delayFn?: (ms: number) => Promise<void>;
  /** Optional hook called when a chunk error occurs before retrying */
  onRetry?: (attempt: number, error: unknown) => void;
}

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'loading chunk',
  'chunkloaderror',
  'loading css chunk',
  'unable to preload css',
];

/**
 * Determines whether an error originated from a failed ES/Vite/Webpack dynamic chunk fetch.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name?: unknown }).name ?? '').toLowerCase()
      : '';
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
      ? error.toLowerCase()
      : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '').toLowerCase()
      : String(error).toLowerCase();

  if (name === 'chunkloaderror') return true;
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads a dynamic module export cleanly with bounded exponential backoff retries
 * for transient Vite dev-server / proxy / network chunk fetch failures.
 */
export async function loadModuleWithRetry<
  TModule extends object,
  TKey extends keyof TModule,
>(
  importer: () => Promise<TModule>,
  exportName: TKey,
  options: SafeLazyOptions = {}
): Promise<{
  default: TModule[TKey] extends ComponentType<any> ? TModule[TKey] : ComponentType<any>;
}> {
  const {
    retries = 2,
    retryDelayMs = 250,
    fallbackComponent,
    delayFn = defaultDelay,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const mod = await importer();
      const modRecord = mod as Record<string, unknown>;
      const exported = modRecord?.[String(exportName)] ?? modRecord?.default;
      if (!exported || (typeof exported !== 'function' && typeof exported !== 'object')) {
        throw new Error(`Module export "${String(exportName)}" was empty or invalid.`);
      }
      return { default: exported as any };
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < retries && isChunkLoadError(error);
      if (!shouldRetry) {
        break;
      }
      onRetry?.(attempt + 1, error);
      const waitMs = retryDelayMs * Math.pow(2, attempt);
      await delayFn(waitMs);
    }
  }

  if (fallbackComponent) {
    return { default: fallbackComponent as any };
  }

  throw lastError;
}

/**
 * Drop-in resilient wrapper around React.lazy for named exports.
 * Automatically retries transient dynamic-import fetch errors (e.g. during dev server restarts
 * or unstable mobile networks) and optionally degrades gracefully to a fallback component.
 */
export function safeLazy<
  TModule extends object,
  TKey extends keyof TModule,
>(
  importer: () => Promise<TModule>,
  exportName: TKey,
  options: SafeLazyOptions = {}
) {
  return React.lazy(() => loadModuleWithRetry(importer, exportName, options));
}
