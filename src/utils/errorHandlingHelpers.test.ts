import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHUNK_RELOAD_STORAGE_KEY,
  CHUNK_RELOAD_COOLDOWN_MS,
  extractErrorMessage,
  isTransientNetworkOrSocketError,
  isViteHmrWebSocketError,
  isChunkLoadError,
  shouldTriggerChunkRecoveryReload,
  __resetChunkReloadGuardForTests,
} from './errorHandlingHelpers';

test('isViteHmrWebSocketError detects @vite/client WS failures without swallowing React, Auth, or Firestore errors', () => {
  assert.equal(
    isViteHmrWebSocketError(new Error('WebSocket closed without opened.')),
    true
  );
  assert.equal(
    isViteHmrWebSocketError('[vite] failed to connect to websocket (Error: WebSocket closed without opened.).'),
    true
  );

  const viteStackErr = new Error('Connection failed');
  viteStackErr.stack = 'Error: Connection failed\n    at https://ais-dev.run.app/@vite/client:976:11';
  assert.equal(isViteHmrWebSocketError(new Error('WebSocket handshake failed'), 'https://ais-dev.run.app/@vite/client'), true);

  assert.equal(
    isViteHmrWebSocketError({
      target: { protocol: 'vite-hmr', url: 'wss://ais-dev.run.app/?token=abc' },
    }),
    true
  );

  // Genuine React, Auth, Firestore, and application errors MUST NOT be swallowed
  assert.equal(isViteHmrWebSocketError(new Error('FirebaseError: Missing or insufficient permissions (firestore)')), false);
  assert.equal(isViteHmrWebSocketError(new Error('Firebase: Error (auth/wrong-password).')), false);
  assert.equal(isViteHmrWebSocketError(new Error('Rendered more hooks than during the previous render.')), false);
});

test('isTransientNetworkOrSocketError detects Vite websocket and extension channel errors without hiding app errors', () => {
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
  assert.equal(
    isTransientNetworkOrSocketError(new Error('FirebaseError: permission-denied on firestore/inventory')),
    false
  );
  assert.equal(
    isTransientNetworkOrSocketError(new Error('Firebase: Error (auth/invalid-credential).')),
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
