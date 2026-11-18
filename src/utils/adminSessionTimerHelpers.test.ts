import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_ACTIVITY_THROTTLE_MS,
  ADMIN_SESSION_TIMEOUT_MS,
  ADMIN_SESSION_WARNING_MS,
  computeSessionTimerState,
  computeWarningProgressPercent,
  formatCountdownMmSs,
  parseStoredActivityTimestamp,
  shouldPausePassiveActivityReset,
  shouldRecordActivityUpdate,
} from './adminSessionTimerHelpers.ts';

test('default session timeout constants are strictly 15 minutes and 2 minute warning window', () => {
  assert.equal(ADMIN_SESSION_TIMEOUT_MS, 900_000);
  assert.equal(ADMIN_SESSION_WARNING_MS, 120_000);
  assert.equal(ADMIN_ACTIVITY_THROTTLE_MS, 1000);
});

test('parseStoredActivityTimestamp validates numeric strings and rejects corrupt inputs', () => {
  assert.equal(parseStoredActivityTimestamp('1700000000000'), 1700000000000);
  assert.equal(parseStoredActivityTimestamp(' 1700000000500.9 '), 1700000000500);
  assert.equal(parseStoredActivityTimestamp(null), null);
  assert.equal(parseStoredActivityTimestamp(undefined), null);
  assert.equal(parseStoredActivityTimestamp(''), null);
  assert.equal(parseStoredActivityTimestamp('not-a-timestamp'), null);
  assert.equal(parseStoredActivityTimestamp('0'), null);
  assert.equal(parseStoredActivityTimestamp('-5000'), null);
  assert.equal(parseStoredActivityTimestamp('Infinity'), null);
});

test('computeSessionTimerState handles fresh session, warning window, and exact 15m expiration', () => {
  const start = 1_750_000_000_000;

  // Fresh activity -> full 15:00 remaining, no warning, not expired
  const fresh = computeSessionTimerState({ lastActivityAt: start, now: start });
  assert.equal(fresh.elapsedMs, 0);
  assert.equal(fresh.remainingMs, 900_000);
  assert.equal(fresh.remainingSeconds, 900);
  assert.equal(fresh.showWarning, false);
  assert.equal(fresh.isExpired, false);

  // Just before warning threshold (12m 59s elapsed -> 2m 01s remaining)
  const beforeWarn = computeSessionTimerState({
    lastActivityAt: start,
    now: start + 13 * 60 * 1000 - 1000,
  });
  assert.equal(beforeWarn.remainingMs, 121_000);
  assert.equal(beforeWarn.showWarning, false);
  assert.equal(beforeWarn.isExpired, false);

  // At warning threshold (13m elapsed -> 2m 00s remaining)
  const atWarn = computeSessionTimerState({
    lastActivityAt: start,
    now: start + 13 * 60 * 1000,
  });
  assert.equal(atWarn.remainingMs, 120_000);
  assert.equal(atWarn.remainingSeconds, 120);
  assert.equal(atWarn.showWarning, true);
  assert.equal(atWarn.isExpired, false);

  // 1 second left (14m 59s elapsed)
  const lastSecond = computeSessionTimerState({
    lastActivityAt: start,
    now: start + 15 * 60 * 1000 - 1000,
  });
  assert.equal(lastSecond.remainingMs, 1000);
  assert.equal(lastSecond.remainingSeconds, 1);
  assert.equal(lastSecond.showWarning, true);
  assert.equal(lastSecond.isExpired, false);

  // Exact 15m elapsed -> expired, warning closed
  const expiredExact = computeSessionTimerState({
    lastActivityAt: start,
    now: start + 15 * 60 * 1000,
  });
  assert.equal(expiredExact.remainingMs, 0);
  assert.equal(expiredExact.remainingSeconds, 0);
  assert.equal(expiredExact.showWarning, false);
  assert.equal(expiredExact.isExpired, true);

  // Past 15m (e.g., laptop woke up after 2 hours)
  const expiredLong = computeSessionTimerState({
    lastActivityAt: start,
    now: start + 2 * 60 * 60 * 1000,
  });
  assert.equal(expiredLong.remainingMs, 0);
  assert.equal(expiredLong.isExpired, true);
  assert.equal(expiredLong.showWarning, false);
});

test('shouldPausePassiveActivityReset blocks passive mouse/key resets once warning modal is visible', () => {
  assert.equal(shouldPausePassiveActivityReset({ showWarning: false, isExpired: false }), false);
  assert.equal(shouldPausePassiveActivityReset({ showWarning: true, isExpired: false }), true);
  assert.equal(shouldPausePassiveActivityReset({ showWarning: false, isExpired: true }), true);
});

test('shouldRecordActivityUpdate throttles updates cleanly', () => {
  assert.equal(shouldRecordActivityUpdate(0, 5000, 1000), true);
  assert.equal(shouldRecordActivityUpdate(5000, 5500, 1000), false);
  assert.equal(shouldRecordActivityUpdate(5000, 5999, 1000), false);
  assert.equal(shouldRecordActivityUpdate(5000, 6000, 1000), true);
});

test('formatCountdownMmSs formats remaining milliseconds cleanly into MM:SS', () => {
  assert.equal(formatCountdownMmSs(900_000), '15:00');
  assert.equal(formatCountdownMmSs(899_000), '14:59');
  assert.equal(formatCountdownMmSs(120_000), '02:00');
  assert.equal(formatCountdownMmSs(61_000), '01:01');
  assert.equal(formatCountdownMmSs(5_200), '00:06');
  assert.equal(formatCountdownMmSs(1), '00:01');
  assert.equal(formatCountdownMmSs(0), '00:00');
  assert.equal(formatCountdownMmSs(-2500), '00:00');
});

test('computeWarningProgressPercent clamps warning progress between 0 and 100', () => {
  assert.equal(computeWarningProgressPercent(120_000), 100);
  assert.equal(computeWarningProgressPercent(900_000), 100);
  assert.equal(computeWarningProgressPercent(60_000), 50);
  assert.equal(computeWarningProgressPercent(30_000), 25);
  assert.equal(computeWarningProgressPercent(0), 0);
  assert.equal(computeWarningProgressPercent(-1000), 0);
});
