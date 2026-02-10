/**
 * Tests for DB Retry Wrapper (REQ-ERR-015, REQ-ERR-016)
 *
 * Validates:
 * - Successful operations return immediately
 * - Transient errors (40001, 57014) are retried
 * - Non-transient errors are not retried
 * - Exponential backoff between retries
 * - Max retries honored
 * - Each attempt is logged
 * - Final failure returns mapped error
 */

import { withDbRetry } from '../../../../api/_lib/db-retry';
import { logger } from '../../../../api/_lib/logger';

vi.mock('../../../../api/_lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('withDbRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first successful attempt', async () => {
    const operation = vi.fn().mockResolvedValue({ data: [1, 2, 3], error: null });

    const result = await withDbRetry(operation, { operation: 'fetchStandings' });

    expect(result).toEqual({ data: [1, 2, 3], error: null });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('does not retry when error is non-transient', async () => {
    const pgError = { code: '23505', message: 'unique violation' };
    const operation = vi.fn().mockResolvedValue({ data: null, error: pgError });

    const result = await withDbRetry(operation, { operation: 'insertRoster' });

    expect(result).toEqual({ data: null, error: pgError });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on serialization_failure (40001)', async () => {
    const transientError = { code: '40001', message: 'serialization failure' };
    const operation = vi.fn()
      .mockResolvedValueOnce({ data: null, error: transientError })
      .mockResolvedValueOnce({ data: 'ok', error: null });

    const promise = withDbRetry(operation, { operation: 'simulate' });
    await vi.advanceTimersByTimeAsync(250);
    const result = await promise;

    expect(result).toEqual({ data: 'ok', error: null });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('retries on statement_timeout (57014)', async () => {
    const timeoutError = { code: '57014', message: 'statement timeout' };
    const operation = vi.fn()
      .mockResolvedValueOnce({ data: null, error: timeoutError })
      .mockResolvedValueOnce({ data: 'ok', error: null });

    const promise = withDbRetry(operation, { operation: 'longQuery' });
    await vi.advanceTimersByTimeAsync(250);
    const result = await promise;

    expect(result).toEqual({ data: 'ok', error: null });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('retries on connection errors (08xxx)', async () => {
    const connError = { code: '08006', message: 'connection failure' };
    const operation = vi.fn()
      .mockResolvedValueOnce({ data: null, error: connError })
      .mockResolvedValueOnce({ data: 'recovered', error: null });

    const promise = withDbRetry(operation, { operation: 'query' });
    await vi.advanceTimersByTimeAsync(250);
    const result = await promise;

    expect(result).toEqual({ data: 'recovered', error: null });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('respects max retries (default 3)', async () => {
    const transientError = { code: '40001', message: 'serialization failure' };
    const operation = vi.fn().mockResolvedValue({ data: null, error: transientError });

    const promise = withDbRetry(operation, { operation: 'simulate' });

    // Advance through all retries
    await vi.advanceTimersByTimeAsync(200);  // retry 1 after 200ms
    await vi.advanceTimersByTimeAsync(400);  // retry 2 after 400ms
    await vi.advanceTimersByTimeAsync(800);  // retry 3 after 800ms

    const result = await promise;

    expect(result).toEqual({ data: null, error: transientError });
    // 1 initial + 3 retries = 4
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it('logs warn on each retry attempt', async () => {
    const transientError = { code: '40001', message: 'serialization failure' };
    const operation = vi.fn()
      .mockResolvedValueOnce({ data: null, error: transientError })
      .mockResolvedValueOnce({ data: 'ok', error: null });

    const promise = withDbRetry(operation, { operation: 'simulate', requestId: 'req-1' });
    await vi.advanceTimersByTimeAsync(250);
    await promise;

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Retry'),
      expect.objectContaining({ operation: 'simulate' }),
    );
  });

  it('logs error when all retries exhausted', async () => {
    const transientError = { code: '40001', message: 'serialization failure' };
    const operation = vi.fn().mockResolvedValue({ data: null, error: transientError });

    const promise = withDbRetry(operation, { operation: 'simulate' });
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('exhausted'),
      expect.objectContaining({ operation: 'simulate' }),
    );
  });

  it('allows custom max retries', async () => {
    const transientError = { code: '40001', message: 'serialization failure' };
    const operation = vi.fn().mockResolvedValue({ data: null, error: transientError });

    const promise = withDbRetry(operation, { operation: 'test', maxRetries: 1 });
    await vi.advanceTimersByTimeAsync(250);
    await promise;

    // 1 initial + 1 retry = 2
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('returns immediately on null error (success)', async () => {
    const operation = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });

    const result = await withDbRetry(operation, { operation: 'fetch' });

    expect(result).toEqual({ data: { id: 1 }, error: null });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
