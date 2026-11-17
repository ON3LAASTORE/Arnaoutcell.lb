import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyFirestoreError,
  clearFirestoreQuotaCooldown,
  getFirestoreQuotaCooldownRemainingMs,
  isFirestoreInQuotaCooldown,
  isFirestoreNetworkError,
  isFirestorePermissionError,
  isFirestoreQuotaExceededError,
  markFirestoreQuotaExceeded,
  FIRESTORE_QUOTA_COOLDOWN_KEY,
} from './firestoreQuotaHelpers';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

test('isFirestoreQuotaExceededError detects Firebase resource-exhausted codes and daily read messages', () => {
  assert.equal(
    isFirestoreQuotaExceededError(
      new Error(
        "Quota limit exceeded. Retry after quota limits are reset or enable billing for this project to avoid quota checks. Cause - Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
      )
    ),
    true
  );
  assert.equal(isFirestoreQuotaExceededError({ code: 'resource-exhausted', message: 'limit hit' }), true);
  assert.equal(isFirestoreQuotaExceededError({ code: 'firestore/resource-exhausted' }), true);
  assert.equal(isFirestoreQuotaExceededError(new Error('Missing or insufficient permissions.')), false);
});

test('isFirestorePermissionError detects permission-denied codes and messages without confusing quota errors', () => {
  assert.equal(isFirestorePermissionError(new Error('Missing or insufficient permissions.')), true);
  assert.equal(isFirestorePermissionError({ code: 'permission-denied', message: 'Denied' }), true);
  assert.equal(isFirestorePermissionError(new Error('Quota limit exceeded.')), false);
});

test('isFirestoreNetworkError detects offline and unavailable transport errors', () => {
  assert.equal(isFirestoreNetworkError(new Error('Failed to get document because the client is offline.')), true);
  assert.equal(isFirestoreNetworkError({ code: 'unavailable', message: 'Network unavailable' }), true);
  assert.equal(isFirestoreNetworkError(new Error('Quota exceeded.')), false);
});

test('classifyFirestoreError prioritizes quota, permission, network, and unknown accurately', () => {
  assert.equal(classifyFirestoreError({ code: 'resource-exhausted', message: 'Quota exceeded' }), 'quota');
  assert.equal(classifyFirestoreError({ code: 'permission-denied', message: 'No access' }), 'permission');
  assert.equal(classifyFirestoreError({ code: 'unavailable', message: 'transport errored' }), 'network');
  assert.equal(classifyFirestoreError(new Error('Unexpected failure')), 'unknown');
});

test('quota cooldown lifecycle tracks active cooldown and clears cleanly', () => {
  const mockStorage = createMemoryStorage();
  clearFirestoreQuotaCooldown(mockStorage);

  const t0 = 1_700_000_000_000;
  assert.equal(isFirestoreInQuotaCooldown({ nowMs: t0, storage: mockStorage }), false);
  assert.equal(getFirestoreQuotaCooldownRemainingMs({ nowMs: t0, storage: mockStorage }), 0);

  const until = markFirestoreQuotaExceeded({
    nowMs: t0,
    cooldownMs: 60_000,
    storage: mockStorage,
  });
  assert.equal(until, t0 + 60_000);
  assert.equal(mockStorage.getItem(FIRESTORE_QUOTA_COOLDOWN_KEY), String(t0 + 60_000));
  assert.equal(isFirestoreInQuotaCooldown({ nowMs: t0 + 10_000, storage: mockStorage }), true);
  assert.equal(getFirestoreQuotaCooldownRemainingMs({ nowMs: t0 + 10_000, storage: mockStorage }), 50_000);
  assert.equal(isFirestoreInQuotaCooldown({ nowMs: t0 + 60_001, storage: mockStorage }), false);

  clearFirestoreQuotaCooldown(mockStorage);
  assert.equal(isFirestoreInQuotaCooldown({ nowMs: t0 + 10_000, storage: mockStorage }), false);
  assert.equal(mockStorage.getItem(FIRESTORE_QUOTA_COOLDOWN_KEY), null);
});
