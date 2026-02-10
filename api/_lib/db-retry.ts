/**
 * Database Retry Wrapper (REQ-ERR-015, REQ-ERR-016)
 *
 * Retries Supabase operations that fail with transient PostgreSQL errors.
 * Uses exponential backoff (200ms, 400ms, 800ms) and logs each attempt.
 *
 * Transient error codes (retryable):
 *   40001 - serialization_failure
 *   57014 - statement_timeout
 *   08xxx - connection errors
 *
 * Non-transient errors (not retried) are returned immediately.
 *
 * Layer 2: API infrastructure.
 */

import { logger } from './logger';

const DEFAULT_MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 200;

/** PG error codes that are safe to retry. */
const TRANSIENT_CODES = new Set(['40001', '57014']);

interface SupabaseResult<T> {
  data: T;
  error: { code?: string; message: string } | null;
}

export interface RetryOptions {
  operation: string;
  requestId?: string;
  maxRetries?: number;
}

function isTransient(errorCode: string | undefined): boolean {
  if (!errorCode) return false;
  if (TRANSIENT_CODES.has(errorCode)) return true;
  // Class 08: Connection Exception
  if (errorCode.startsWith('08')) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a Supabase operation with retry for transient errors.
 *
 * Returns the Supabase result as-is. On transient failure after all retries,
 * returns the last error result.
 */
export async function withDbRetry<T>(
  operation: () => Promise<SupabaseResult<T>>,
  options: RetryOptions,
): Promise<SupabaseResult<T>> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  let result = await operation();

  if (!result.error) return result;
  if (!isTransient(result.error.code)) return result;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);

    logger.warn(`Retry ${attempt}/${maxRetries} after ${backoff}ms`, {
      operation: options.operation,
      requestId: options.requestId,
      code: result.error.code,
    });

    await sleep(backoff);
    result = await operation();

    if (!result.error || !isTransient(result.error.code)) {
      return result;
    }
  }

  logger.error(`All ${maxRetries} retries exhausted`, {
    operation: options.operation,
    requestId: options.requestId,
    code: result.error?.code,
  });

  return result;
}
