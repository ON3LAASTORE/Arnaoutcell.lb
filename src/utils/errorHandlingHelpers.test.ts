import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHUNK_RELOAD_STORAGE_KEY,
  CHUNK_RELOAD_COOLDOWN_MS,
  extractErrorMessage,
  isTransientNetworkOrSocketError,
  isChunkLoadError,
  shouldTriggerChunkRecoveryReload,
  __resetChunkReloadGuardForTests,
} from './errorHandlingHelpers';

test('isTransientNetworkOrSocketError detects Vite websocket and extension channel errors', () => {
  assert.equal(
    isTransientNetworkOrSocketError(new Error('WebSocket closed without opened.')),
    true
  );
  assert.equal(
    isTransientNetworkOrSocketError('[vite] failed to connect to websocket'),
    true
  );
  assert.equal(
    isTransientNetworkOrSocketError({
      reason: new Error('A listener indicated an asynchronous response by returning true, but the message channel closed'),
    }),
    true
  );
  assert.equal(
    isTransientNetworkOrSocketError(new Error('TypeError: Cannot read properties of undefined')),
    false
  );
});

test('isChunkLoadError identifies dynamic import and CSS preload failures', () => {
  const chunkErr = new Error('Loading chunk 42 failed');
  chunkErr.name = 'ChunkLoadError';
  assert.equal(isChunkLoadError(chunkErr), true);
  assert.equal(
    isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://example.com/assets/x.js')),
    true
  );
  assert.equal(isChunkLoadError(new Error('Permission denied')), false);
});

test('shouldTriggerChunkRecoveryReload enforces cooldown window and prevents infinite loops', () => {
  __resetChunkReloadGuardForTests();
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, val: string) => {
      mem.set(key, val);
    },
  };

  const t0 = 1_700_000_000_000;
  assert.equal(shouldTriggerChunkRecoveryReload(t0, mockStorage, CHUNK_RELOAD_COOLDOWN_MS), true);
  assert.equal(mem.get(CHUNK_RELOAD_STORAGE_KEY), String(t0));

  // Within cooldown -> blocked
  assert.equal(
    shouldTriggerChunkRecoveryReload(t0 + 5_000, mockStorage, CHUNK_RELOAD_COOLDOWN_MS),
    false
  );

  // After cooldown -> allowed
  assert.equal(
    shouldTriggerChunkRecoveryReload(t0 + CHUNK_RELOAD_COOLDOWN_MS + 1, mockStorage, CHUNK_RELOAD_COOLDOWN_MS),
    true
  );
});

test('extractErrorMessage safely handles strings, Errors, nested objects, and null', () => {
  assert.equal(extractErrorMessage(null), '');
  assert.equal(extractErrorMessage('plain fail'), 'plain fail');
  assert.equal(extractErrorMessage({ error: { message: 'nested fail' } }), 'nested fail');
});
