export interface ParsedGeminiError {
  httpStatus: number;
  code?: number;
  statusText?: string;
  rawMessage: string;
  userMessage: string;
  retryable: boolean;
}

function tryExtractNestedGeminiJson(raw: string): {
  code?: number;
  message?: string;
  status?: string;
} | null {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart < 0) return null;

  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart)) as {
      error?: { code?: unknown; message?: unknown; status?: unknown };
      code?: unknown;
      message?: unknown;
      status?: unknown;
    };
    const inner = parsed.error ?? parsed;
    const code = typeof inner.code === 'number' ? inner.code : undefined;
    const message = typeof inner.message === 'string' ? inner.message : undefined;
    const status = typeof inner.status === 'string' ? inner.status : undefined;
    if (code !== undefined || message !== undefined || status !== undefined) {
      return { code, message, status };
    }
  } catch {
    // Not valid JSON payload
  }
  return null;
}

export function parseGeminiSdkError(error: unknown): ParsedGeminiError {
  const errObj = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof errObj?.message === 'string'
      ? errObj.message
      : typeof error === 'string'
      ? error
      : 'Unable to reach Sidekick AI service.';

  const nested = tryExtractNestedGeminiJson(rawMessage);
  const cleanMessage = nested?.message || rawMessage;
  const statusText =
    nested?.status || (typeof errObj?.status === 'string' ? errObj.status : undefined);
  const numericCode =
    nested?.code ??
    (typeof errObj?.status === 'number'
      ? errObj.status
      : typeof errObj?.code === 'number'
      ? errObj.code
      : undefined);

  const combined = `${numericCode ?? ''} ${statusText ?? ''} ${cleanMessage}`.toLowerCase();

  if (
    numericCode === 400 ||
    combined.includes('api_key_invalid') ||
    combined.includes('api key not valid') ||
    combined.includes('invalid_argument')
  ) {
    return {
      httpStatus: 400,
      code: numericCode ?? 400,
      statusText: statusText || 'INVALID_ARGUMENT',
      rawMessage: cleanMessage,
      userMessage:
        'Sidekick AI is unavailable due to an invalid Gemini API key configuration. Please update GEMINI_API_KEY in Settings > Secrets.',
      retryable: false,
    };
  }

  if (numericCode === 403 || combined.includes('permission_denied')) {
    return {
      httpStatus: 403,
      code: numericCode ?? 403,
      statusText: statusText || 'PERMISSION_DENIED',
      rawMessage: cleanMessage,
      userMessage:
        'Sidekick AI request was denied by Gemini API permissions. Please verify your GEMINI_API_KEY access.',
      retryable: false,
    };
  }

  if (numericCode === 404 || combined.includes('not_found') || combined.includes('is not found')) {
    return {
      httpStatus: 404,
      code: numericCode ?? 404,
      statusText: statusText || 'NOT_FOUND',
      rawMessage: cleanMessage,
      userMessage:
        'The requested Sidekick AI model is currently unavailable. Please try again shortly.',
      retryable: true,
    };
  }

  if (
    numericCode === 429 ||
    combined.includes('resource_exhausted') ||
    combined.includes('quota') ||
    combined.includes('rate limit')
  ) {
    return {
      httpStatus: 429,
      code: numericCode ?? 429,
      statusText: statusText || 'RESOURCE_EXHAUSTED',
      rawMessage: cleanMessage,
      userMessage:
        'Sidekick AI is temporarily rate-limited due to high request volume. Please try again in a few moments.',
      retryable: true,
    };
  }

  if (
    numericCode === 503 ||
    numericCode === 502 ||
    numericCode === 504 ||
    combined.includes('unavailable') ||
    combined.includes('high demand') ||
    combined.includes('overloaded') ||
    combined.includes('fetch failed') ||
    combined.includes('econnreset') ||
    combined.includes('etimedout') ||
    combined.includes('timeout')
  ) {
    return {
      httpStatus: 503,
      code: numericCode ?? 503,
      statusText: statusText || 'UNAVAILABLE',
      rawMessage: cleanMessage,
      userMessage:
        'Sidekick AI is experiencing temporary high demand on upstream Gemini servers. Please retry in a moment.',
      retryable: true,
    };
  }

  return {
    httpStatus: numericCode && numericCode >= 400 && numericCode < 600 ? numericCode : 502,
    code: numericCode,
    statusText,
    rawMessage: cleanMessage,
    userMessage: cleanMessage || 'Sidekick AI encountered an unexpected upstream error.',
    retryable: false,
  };
}

export interface RetryFallbackOptions<T> {
  primaryModel: string;
  fallbackModel?: string;
  invoke: (model: string) => Promise<T>;
  sleep?: (ms: number) => Promise<void>;
  maxPrimaryAttempts?: number;
  maxFallbackAttempts?: number;
  baseDelayMs?: number;
}

export interface RetryFallbackResult<T> {
  result: T;
  modelUsed: string;
  attempts: number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function executeWithGeminiRetryAndFallback<T>({
  primaryModel,
  fallbackModel,
  invoke,
  sleep = defaultSleep,
  maxPrimaryAttempts = 2,
  maxFallbackAttempts = 2,
  baseDelayMs = 450,
}: RetryFallbackOptions<T>): Promise<RetryFallbackResult<T>> {
  let totalAttempts = 0;
  let lastError: unknown;

  const modelsToTry: Array<{ model: string; maxAttempts: number }> = [
    { model: primaryModel, maxAttempts: Math.max(1, maxPrimaryAttempts) },
  ];
  if (fallbackModel && fallbackModel !== primaryModel) {
    modelsToTry.push({ model: fallbackModel, maxAttempts: Math.max(1, maxFallbackAttempts) });
  }

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const { model, maxAttempts } = modelsToTry[mIdx];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      totalAttempts++;
      try {
        const result = await invoke(model);
        return {
          result,
          modelUsed: model,
          attempts: totalAttempts,
        };
      } catch (err) {
        lastError = err;
        const parsed = parseGeminiSdkError(err);

        // Non-retryable client config/auth errors (400 invalid key, 403 denied) fail immediately
        if (!parsed.retryable) {
          throw err;
        }

        const hasMoreAttemptsOnCurrentModel = attempt < maxAttempts;
        const hasNextModel = mIdx < modelsToTry.length - 1;

        if (hasMoreAttemptsOnCurrentModel) {
          await sleep(baseDelayMs * attempt);
        } else if (hasNextModel) {
          await sleep(Math.min(300, baseDelayMs));
        }
      }
    }
  }

  throw lastError;
}
