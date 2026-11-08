import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSyncStatus,
  getConnectivityBadgeMeta,
  formatLastSyncedTime,
} from './connectivityHelpers.ts';

test('computeSyncStatus: returns offline when navigator is offline regardless of cache state', () => {
  const status = computeSyncStatus({
    isNavigatorOnline: false,
    fromCache: false,
    hasPendingWrites: false,
  });
  assert.equal(status, 'offline');

  const statusWithCache = computeSyncStatus({
    isNavigatorOnline: false,
    fromCache: true,
    hasPendingWrites: true,
  });
  assert.equal(statusWithCache, 'offline');
});

test('computeSyncStatus: returns connecting when isConnecting is true and online', () => {
  const status = computeSyncStatus({
    isNavigatorOnline: true,
    fromCache: false,
    hasPendingWrites: false,
    isConnecting: true,
  });
  assert.equal(status, 'connecting');
});

test('computeSyncStatus: returns syncing when hasPendingWrites is true and online', () => {
  const status = computeSyncStatus({
    isNavigatorOnline: true,
    fromCache: false,
    hasPendingWrites: true,
    isConnecting: false,
  });
  assert.equal(status, 'syncing');
});

test('computeSyncStatus: returns cached when fromCache is true without pending writes', () => {
  const status = computeSyncStatus({
    isNavigatorOnline: true,
    fromCache: true,
    hasPendingWrites: false,
    isConnecting: false,
  });
  assert.equal(status, 'cached');
});

test('computeSyncStatus: returns synced when online and live from server', () => {
  const status = computeSyncStatus({
    isNavigatorOnline: true,
    fromCache: false,
    hasPendingWrites: false,
    isConnecting: false,
  });
  assert.equal(status, 'synced');
});

test('computeSyncStatus: returns offline when server error is present and not connecting', () => {
  const status = computeSyncStatus({
    isNavigatorOnline: true,
    fromCache: false,
    hasPendingWrites: false,
    hasServerError: true,
  });
  assert.equal(status, 'offline');
});

test('getConnectivityBadgeMeta: returns valid metadata for all statuses in EN and AR', () => {
  const statuses = ['synced', 'syncing', 'cached', 'connecting', 'offline'] as const;

  for (const s of statuses) {
    const metaEn = getConnectivityBadgeMeta(s, 'en');
    assert.equal(metaEn.status, s);
    assert.ok(metaEn.label.length > 0);
    assert.ok(metaEn.shortLabel.length > 0);
    assert.ok(metaEn.tooltip.length > 0);
    assert.ok(metaEn.dotColor.length > 0);
    assert.ok(metaEn.badgeClasses.length > 0);

    const metaAr = getConnectivityBadgeMeta(s, 'ar');
    assert.equal(metaAr.status, s);
    assert.ok(metaAr.label.length > 0);
    assert.ok(metaAr.shortLabel.length > 0);
    assert.ok(metaAr.tooltip.length > 0);
  }
});

test('formatLastSyncedTime: formats relative times correctly in English and Arabic', () => {
  assert.equal(formatLastSyncedTime(null, 'en'), 'Not yet synced');
  assert.equal(formatLastSyncedTime(null, 'ar'), 'لم يتم التزامن بعد');

  const now = new Date();
  assert.equal(formatLastSyncedTime(now, 'en'), 'Just now');
  assert.equal(formatLastSyncedTime(now, 'ar'), 'الآن');

  const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
  assert.equal(formatLastSyncedTime(thirtySecsAgo, 'en'), '30s ago');
  assert.equal(formatLastSyncedTime(thirtySecsAgo, 'ar'), 'منذ 30 ثانية');

  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  assert.equal(formatLastSyncedTime(fiveMinsAgo, 'en'), '5m ago');
  assert.equal(formatLastSyncedTime(fiveMinsAgo, 'ar'), 'منذ 5 دقيقة');
});
