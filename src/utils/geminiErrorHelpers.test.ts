import test from 'node:test';
import assert from 'node:assert/strict';
import {
  executeWithGeminiRetryAndFallback,
  parseGeminiSdkError,
} from './geminiErrorHelpers';

test('parseGeminiSdkError extracts readable 503 UNAVAILABLE message from nested Gemini JSON blob', () => {
  const raw =
    '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}';
  const parsed = parseGeminiSdkError(new Error(raw));

  assert.equal(parsed.httpStatus, 503);
  assert.equal(parsed.code, 503);
  assert.equal(parsed.statusText, 'UNAVAILABLE');
  assert.equal(parsed.retryable, true);
  assert.ok(!parsed.userMessage.startsWith('{'));
  assert.match(parsed.userMessage, /high demand/i);
});

test('parseGeminiSdkError classifies 400 invalid API key and 429 quota exhaustion accurately', () => {
  const invalidKey = parseGeminiSdkError(
    new Error('{"error":{"code":400,"message":"API key not valid.","status":"INVALID_ARGUMENT"}}')
  );
  assert.equal(invalidKey.httpStatus, 400);
  assert.equal(invalidKey.retryable, false);
  assert.match(invalidKey.userMessage, /GEMINI_API_KEY/);

  const quota = parseGeminiSdkError(new Error('429 RESOURCE_EXHAUSTED: Quota exceeded'));
  assert.equal(quota.httpStatus, 429);
  assert.equal(quota.retryable, true);
});

test('executeWithGeminiRetryAndFallback retries transient 503 errors and falls back to secondary model', async () => {
  const calledModels: string[] = [];
  const sleepDurations: number[] = [];

  const outcome = await executeWithGeminiRetryAndFallback({
    primaryModel: 'gemini-4-hydrogen',
    fallbackModel: 'gemini-3.1-flash-lite',
    baseDelayMs: 100,
    maxPrimaryAttempts: 2,
    maxFallbackAttempts: 2,
    sleep: async (ms) => {
      sleepDurations.push(ms);
    },
    invoke: async (model) => {
      calledModels.push(model);
      if (model === 'gemini-4-hydrogen') {
        throw new Error(
          '{"error":{"code":503,"message":"High demand","status":"UNAVAILABLE"}}'
        );
      }
      return 'Verified 5200mAh battery and IP68/IP69 protection.';
    },
  });

  assert.deepEqual(calledModels, [
    'gemini-4-hydrogen',
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
  ]);
  assert.equal(outcome.modelUsed, 'gemini-3.1-flash-lite');
  assert.equal(outcome.attempts, 3);
  assert.equal(sleepDurations.length, 2);
  assert.match(outcome.result, /5200mAh/);
});

test('executeWithGeminiRetryAndFallback aborts immediately on non-retryable 400 key error', async () => {
  const calledModels: string[] = [];

  await assert.rejects(
    () =>
      executeWithGeminiRetryAndFallback({
        primaryModel: 'gemini-4-hydrogen',
        fallbackModel: 'gemini-3.1-flash-lite',
        sleep: async () => {},
        invoke: async (model) => {
          calledModels.push(model);
          throw new Error('400 API_KEY_INVALID');
        },
      }),
    /400 API_KEY_INVALID/
  );

  assert.deepEqual(calledModels, ['gemini-4-hydrogen']);
});
