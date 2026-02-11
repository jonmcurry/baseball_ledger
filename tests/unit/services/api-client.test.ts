/**
 * Tests for src/services/api-client.ts
 *
 * Verifies HTTP method dispatch, auth header injection from Supabase session,
 * response unwrapping, and error mapping to AppError categories.
 */

import type { AppError } from '@lib/types/errors';
import { getSupabaseClient } from '@lib/supabase/client';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);

// ---------------------------------------------------------------------------
// Import SUT (after mocks are registered)
// ---------------------------------------------------------------------------

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  apiGetPaginated,
} from '../../../src/services/api-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default mock Supabase client that returns a valid session with a token. */
function mockSupabaseWithToken(token = 'test-token-123') {
  mockGetSupabaseClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: token } },
      }),
    },
  } as never);
}

/** Mock Supabase client where session is null (unauthenticated). */
function mockSupabaseWithoutToken() {
  mockGetSupabaseClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
      }),
    },
  } as never);
}

/** Build a successful fetch Response mock. */
function mockOkResponse(body: unknown, status = 200) {
  mockFetch.mockResolvedValue({
    ok: true,
    status,
    json: vi.fn().mockResolvedValue(body),
  });
}

/** Build a 204 No Content Response mock (no JSON body). */
function mock204Response() {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 204,
    json: vi.fn().mockRejectedValue(new Error('No body on 204')),
  });
}

/** Build a failing fetch Response mock. */
function mockErrorResponse(
  status: number,
  statusText: string,
  errorBody: { code: string; message: string; details?: unknown },
) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: vi.fn().mockResolvedValue({ error: errorBody }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabaseWithToken();
});

describe('apiGet', () => {
  it('includes Authorization header from session', async () => {
    mockOkResponse({
      data: { id: '1' },
      meta: { requestId: 'r-1', timestamp: '2024-01-01T00:00:00Z' },
    });

    await apiGet('/api/leagues/1');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer test-token-123');
  });

  it('includes Content-Type: application/json header', async () => {
    mockOkResponse({
      data: { id: '1' },
      meta: { requestId: 'r-1', timestamp: '2024-01-01T00:00:00Z' },
    });

    await apiGet('/api/leagues/1');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('returns parsed ApiResponse on success', async () => {
    const payload = {
      data: { id: '123', name: 'Test League' },
      meta: { requestId: 'req-1', timestamp: '2024-01-01T00:00:00Z' },
    };
    mockOkResponse(payload);

    const result = await apiGet<{ id: string; name: string }>('/api/leagues/123');

    expect(result).toEqual(payload);
    expect(result.data.id).toBe('123');
    expect(result.meta.requestId).toBe('req-1');
  });

  it('works without auth token when session is null', async () => {
    mockSupabaseWithoutToken();
    mockOkResponse({
      data: { id: '1' },
      meta: { requestId: 'r-1', timestamp: '2024-01-01T00:00:00Z' },
    });

    await apiGet('/api/public/stats');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Authorization']).toBeUndefined();
    expect(init.headers['Content-Type']).toBe('application/json');
  });
});

describe('apiGetPaginated', () => {
  it('returns PaginatedResponse with pagination metadata', async () => {
    const payload = {
      data: [{ id: '1' }, { id: '2' }],
      meta: { requestId: 'req-2', timestamp: '2024-01-01T00:00:00Z' },
      pagination: { page: 1, pageSize: 50, totalRows: 2, totalPages: 1 },
    };
    mockOkResponse(payload);

    const result = await apiGetPaginated<{ id: string }>('/api/leagues');

    expect(result.pagination.totalRows).toBe(2);
    expect(result.data).toHaveLength(2);
  });
});

describe('apiPost', () => {
  it('sends JSON body', async () => {
    mockOkResponse({
      data: { id: 'new-1' },
      meta: { requestId: 'req-3', timestamp: '2024-01-01T00:00:00Z' },
    });
    const body = { name: 'My League', maxTeams: 8 };

    await apiPost('/api/leagues', body);

    const [, init] = mockFetch.mock.calls[0];
    expect(init.body).toBe(JSON.stringify(body));
  });

  it('sends POST method', async () => {
    mockOkResponse({
      data: { id: 'new-1' },
      meta: { requestId: 'req-3', timestamp: '2024-01-01T00:00:00Z' },
    });

    await apiPost('/api/leagues', { name: 'League' });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
  });
});

describe('apiPatch', () => {
  it('sends PATCH method with JSON body', async () => {
    mockOkResponse({
      data: { id: '1', name: 'Updated' },
      meta: { requestId: 'req-4', timestamp: '2024-01-01T00:00:00Z' },
    });
    const body = { name: 'Updated' };

    await apiPatch('/api/leagues/1', body);

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify(body));
  });
});

describe('apiDelete', () => {
  it('handles 204 No Content response', async () => {
    mock204Response();

    await expect(apiDelete('/api/leagues/1')).resolves.toBeUndefined();

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('DELETE');
  });
});

describe('handleResponse error mapping', () => {
  it('throws AppError with VALIDATION category for 400', async () => {
    mockErrorResponse(400, 'Bad Request', {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
    });

    try {
      await apiGet('/api/leagues');
      expect.fail('Expected apiGet to throw');
    } catch (err) {
      const appError = err as AppError;
      expect(appError.category).toBe('VALIDATION');
      expect(appError.code).toBe('VALIDATION_ERROR');
      expect(appError.message).toBe('Invalid input');
      expect(appError.statusCode).toBe(400);
    }
  });

  it('throws AppError with NOT_FOUND for 404', async () => {
    mockErrorResponse(404, 'Not Found', {
      code: 'NOT_FOUND',
      message: 'League not found',
    });

    try {
      await apiGet('/api/leagues/999');
      expect.fail('Expected apiGet to throw');
    } catch (err) {
      const appError = err as AppError;
      expect(appError.category).toBe('NOT_FOUND');
      expect(appError.statusCode).toBe(404);
    }
  });

  it.each([
    [401, 'Unauthorized', 'AUTHENTICATION'],
    [403, 'Forbidden', 'AUTHORIZATION'],
    [409, 'Conflict', 'CONFLICT'],
  ] as const)(
    'maps %i (%s) to %s category',
    async (status, statusText, expectedCategory) => {
      mockErrorResponse(status, statusText, {
        code: 'ERROR',
        message: `${statusText} error`,
      });

      try {
        await apiGet('/api/test');
        expect.fail('Expected apiGet to throw');
      } catch (err) {
        const appError = err as AppError;
        expect(appError.category).toBe(expectedCategory);
        expect(appError.statusCode).toBe(status);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Retry logic (REQ-ERR-015, REQ-ERR-016)
// ---------------------------------------------------------------------------

describe('fetchWithRetry (REQ-ERR-015)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries on 500 server error and succeeds on retry', async () => {
    const okPayload = {
      data: { id: '1' },
      meta: { requestId: 'r-1', timestamp: '2024-01-01T00:00:00Z' },
    };

    // First call: 500, second call: 200
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ error: { code: 'SERVER_ERROR', message: 'fail' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(okPayload),
      });

    const promise = apiGet('/api/test');
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(okPayload);
  });

  it('retries up to 2 times on persistent 500 then returns error', async () => {
    const errorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: vi.fn().mockResolvedValue({ error: { code: 'SERVER_ERROR', message: 'fail' } }),
    };

    mockFetch.mockResolvedValue(errorResponse);

    const promise = apiGet('/api/test');
    // Prevent Node unhandled-rejection warning during timer flush
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(1000); // retry 1
    await vi.advanceTimersByTimeAsync(3000); // retry 2

    try {
      await promise;
      expect.fail('Should throw');
    } catch (err) {
      const appError = err as AppError;
      expect(appError.statusCode).toBe(500);
    }

    // Initial + 2 retries = 3 total calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 400 client error', async () => {
    mockErrorResponse(400, 'Bad Request', {
      code: 'VALIDATION_ERROR',
      message: 'Bad request',
    });

    try {
      await apiGet('/api/test');
      expect.fail('Should throw');
    } catch (err) {
      const appError = err as AppError;
      expect(appError.category).toBe('VALIDATION');
    }

    // Only 1 call -- no retries for 4xx
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 404', async () => {
    mockErrorResponse(404, 'Not Found', {
      code: 'NOT_FOUND',
      message: 'Not found',
    });

    try {
      await apiGet('/api/test');
      expect.fail('Should throw');
    } catch (err) {
      const appError = err as AppError;
      expect(appError.category).toBe('NOT_FOUND');
    }

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on network error (TypeError) and succeeds', async () => {
    const okPayload = {
      data: { id: '1' },
      meta: { requestId: 'r-1', timestamp: '2024-01-01T00:00:00Z' },
    };

    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(okPayload),
      });

    const promise = apiGet('/api/test');
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(okPayload);
  });

  it('throws network error after all retries exhausted', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = apiGet('/api/test');
    // Prevent Node unhandled-rejection warning during timer flush
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(1000); // retry 1
    await vi.advanceTimersByTimeAsync(3000); // retry 2

    await expect(promise).rejects.toThrow('Failed to fetch');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('retries on 429 rate limit', async () => {
    const okPayload = {
      data: { id: '1' },
      meta: { requestId: 'r-1', timestamp: '2024-01-01T00:00:00Z' },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: vi.fn().mockResolvedValue({ error: { code: 'RATE_LIMIT', message: 'slow down' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(okPayload),
      });

    const promise = apiGet('/api/test');
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(okPayload);
  });

  it('logs WARN on each retry attempt (REQ-ERR-016)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: vi.fn().mockResolvedValue({ error: { code: 'ERR', message: 'fail' } }),
    });

    const promise = apiGet('/api/test');
    // Prevent Node unhandled-rejection warning during timer flush
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(3000);

    try { await promise; } catch { /* expected */ }

    // 2 WARN calls (one per retry attempt)
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0][0]).toContain('Network retry 1/2');
    expect(warnSpy.mock.calls[1][0]).toContain('Network retry 2/2');

    // 1 ERROR call (final exhaustion)
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('All 2 network retries exhausted');

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('succeeds on first try with no retries needed', async () => {
    const okPayload = {
      data: { id: '1' },
      meta: { requestId: 'r-1', timestamp: '2024-01-01T00:00:00Z' },
    };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(okPayload),
    });

    const result = await apiGet('/api/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(okPayload);
  });
});
