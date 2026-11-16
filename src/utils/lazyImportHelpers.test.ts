import test from 'node:test';
import assert from 'node:assert/strict';
import { isChunkLoadError, loadModuleWithRetry } from './lazyImportHelpers';

test('isChunkLoadError identifies Vite and browser dynamic import failures', () => {
  assert.equal(
    isChunkLoadError(
      new TypeError(
        'Failed to fetch dynamically imported module: https://example.com/src/components/animations/GsapScrollLines.tsx'
      )
    ),
    true
  );
  assert.equal(isChunkLoadError(new Error('Importing a module script failed.')), true);
  assert.equal(isChunkLoadError(new Error('Loading chunk 14 failed.')), true);
  const chunkErr = new Error('Chunk failed');
  chunkErr.name = 'ChunkLoadError';
  assert.equal(isChunkLoadError(chunkErr), true);

  assert.equal(isChunkLoadError(new ReferenceError('foo is not defined')), false);
  assert.equal(isChunkLoadError(null), false);
});

test('loadModuleWithRetry resolves immediately on clean first import', async () => {
  const Dummy = () => null;
  let calls = 0;

  const result = await loadModuleWithRetry(
    async () => {
      calls += 1;
      return { Dummy };
    },
    'Dummy',
    { delayFn: async () => {} }
  );

  assert.equal(calls, 1);
  assert.equal(result.default, Dummy);
});

test('loadModuleWithRetry recovers after transient chunk fetch failures', async () => {
  const GsapScrollLines = () => null;
  let calls = 0;
  const delays: number[] = [];

  const result = await loadModuleWithRetry(
    async () => {
      calls += 1;
      if (calls < 3) {
        throw new TypeError('Failed to fetch dynamically imported module: GsapScrollLines.tsx');
      }
      return { GsapScrollLines };
    },
    'GsapScrollLines',
    {
      retries: 2,
      retryDelayMs: 100,
      delayFn: async (ms) => {
        delays.push(ms);
      },
    }
  );

  assert.equal(calls, 3);
  assert.deepEqual(delays, [100, 200]);
  assert.equal(result.default, GsapScrollLines);
});

test('loadModuleWithRetry degrades gracefully when fallbackComponent is provided', async () => {
  const Fallback = () => null;
  let calls = 0;

  const result = await loadModuleWithRetry(
    async () => {
      calls += 1;
      throw new TypeError('Failed to fetch dynamically imported module: GsapScrollLines.tsx');
    },
    'GsapScrollLines',
    {
      retries: 2,
      delayFn: async () => {},
      fallbackComponent: Fallback,
    }
  );

  assert.equal(calls, 3);
  assert.equal(result.default, Fallback);
});

test('loadModuleWithRetry rethrows fatal non-chunk errors immediately without wasting retries', async () => {
  let calls = 0;

  await assert.rejects(
    async () => {
      await loadModuleWithRetry(
        async () => {
          calls += 1;
          throw new SyntaxError('Unexpected token in module');
        },
        'BrokenPage',
        {
          retries: 3,
          delayFn: async () => {},
        }
      );
    },
    /Unexpected token in module/
  );

  assert.equal(calls, 1);
});

test('loadModuleWithRetry rethrows after exhausting retries when no fallbackComponent exists', async () => {
  let calls = 0;

  await assert.rejects(
    async () => {
      await loadModuleWithRetry(
        async () => {
          calls += 1;
          throw new TypeError('Failed to fetch dynamically imported module: ProductsPage.tsx');
        },
        'ProductsPage',
        {
          retries: 2,
          delayFn: async () => {},
        }
      );
    },
    /Failed to fetch dynamically imported module/
  );

  assert.equal(calls, 3);
});
