export const ADMIN_SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
export const ADMIN_SESSION_WARNING_MS = 2 * 60 * 1000; // Warn during final 2 minutes
export const ADMIN_ACTIVITY_THROTTLE_MS = 1000;
export const ADMIN_LAST_ACTIVITY_STORAGE_KEY = 'arnaout_admin_last_activity';

export type AdminLogoutReason = 'manual' | 'inactivity';

export interface AdminSessionTimerInput {
  lastActivityAt: number;
  now: number;
  timeoutMs?: number;
  warningWindowMs?: number;
}

export interface AdminSessionTimerState {
  elapsedMs: number;
  remainingMs: number;
  remainingSeconds: number;
  isExpired: boolean;
  showWarning: boolean;
}

/**
 * Parses a serialized epoch millisecond timestamp from localStorage safely.
 * Returns null if the value is missing, malformed, non-finite, or non-positive.
 */
export function parseStoredActivityTimestamp(raw: string | null | undefined): number | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

/**
 * Computes pure session inactivity timer state given lastActivityAt and current timestamp.
 */
export function computeSessionTimerState({
  lastActivityAt,
  now,
  timeoutMs = ADMIN_SESSION_TIMEOUT_MS,
  warningWindowMs = ADMIN_SESSION_WARNING_MS,
}: AdminSessionTimerInput): AdminSessionTimerState {
  const safeTimeout = Math.max(1000, timeoutMs);
  const safeWarning = Math.max(0, Math.min(warningWindowMs, safeTimeout));
  const safeLast = Number.isFinite(lastActivityAt) && lastActivityAt > 0 ? lastActivityAt : now;
  const elapsedMs = Math.max(0, now - safeLast);
  const remainingMs = Math.max(0, Math.min(safeTimeout, safeTimeout - elapsedMs));
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const isExpired = remainingMs <= 0;
  const showWarning = !isExpired && remainingMs <= safeWarning;

  return {
    elapsedMs,
    remainingMs,
    remainingSeconds,
    isExpired,
    showWarning,
  };
}

/**
 * Passive pointer/keyboard events should only reset the timer BEFORE the final warning
 * dialog appears. Once the warning modal is displayed, explicit confirmation ("Stay Signed In")
 * is required so accidental mouse movement does not dismiss the security prompt.
 */
export function shouldPausePassiveActivityReset(
  state: Pick<AdminSessionTimerState, 'isExpired' | 'showWarning'>
): boolean {
  return state.showWarning || state.isExpired;
}

/**
 * Throttles frequent DOM activity callbacks before writing timestamps to state/storage.
 */
export function shouldRecordActivityUpdate(
  lastRecordedAt: number,
  now: number,
  throttleMs: number = ADMIN_ACTIVITY_THROTTLE_MS
): boolean {
  if (!Number.isFinite(lastRecordedAt) || lastRecordedAt <= 0) return true;
  if (!Number.isFinite(now)) return false;
  return now - lastRecordedAt >= Math.max(0, throttleMs);
}

/**
 * Formats remaining milliseconds into a fixed-width MM:SS countdown string.
 */
export function formatCountdownMmSs(remainingMs: number): string {
  const clampedMs = Math.max(0, Number.isFinite(remainingMs) ? remainingMs : 0);
  const totalSeconds = Math.ceil(clampedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Computes normalized warning countdown bar percentage (0..100) within the warning window.
 */
export function computeWarningProgressPercent(
  remainingMs: number,
  warningWindowMs: number = ADMIN_SESSION_WARNING_MS
): number {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  if (!Number.isFinite(warningWindowMs) || warningWindowMs <= 0) return 0;
  const pct = (remainingMs / warningWindowMs) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
