import { createMockResponse } from '../../../fixtures/mock-supabase';
import { handleApiError } from '../../../../api/_lib/errors';
import type { VercelResponse } from '@vercel/node';

describe('api/_lib/errors', () => {
  let res: ReturnType<typeof createMockResponse>;
  const requestId = 'err-test-123';

  beforeEach(() => {
    res = createMockResponse();
  });

  it('maps VALIDATION to 400', () => {
    const error = {
      category: 'VALIDATION' as const,
      code: 'INVALID_INPUT',
      message: 'Bad input',
      details: [{ field: 'name', message: 'required' }],
    };

    handleApiError(res as unknown as VercelResponse, error, requestId);

    expect(res._status).toBe(400);
    const body = res._body as { error: { code: string; details: unknown[] } };
    expect(body.error.code).toBe('INVALID_INPUT');
    expect(body.error.details).toHaveLength(1);
  });

  it('maps AUTHENTICATION to 401', () => {
    const error = { category: 'AUTHENTICATION' as const, code: 'INVALID_TOKEN', message: 'Bad token' };
    handleApiError(res as unknown as VercelResponse, error, requestId);
    expect(res._status).toBe(401);
  });

  it('maps AUTHORIZATION to 403', () => {
    const error = { category: 'AUTHORIZATION' as const, code: 'FORBIDDEN', message: 'Not allowed' };
    handleApiError(res as unknown as VercelResponse, error, requestId);
    expect(res._status).toBe(403);
  });

  it('maps NOT_FOUND to 404', () => {
    const error = { category: 'NOT_FOUND' as const, code: 'NOT_FOUND', message: 'Not found' };
    handleApiError(res as unknown as VercelResponse, error, requestId);
    expect(res._status).toBe(404);
  });

  it('maps CONFLICT to 409', () => {
    const error = { category: 'CONFLICT' as const, code: 'DUPLICATE', message: 'Exists' };
    handleApiError(res as unknown as VercelResponse, error, requestId);
    expect(res._status).toBe(409);
  });

  it('maps RATE_LIMIT to 429', () => {
    const error = { category: 'RATE_LIMIT' as const, code: 'THROTTLED', message: 'Too fast' };
    handleApiError(res as unknown as VercelResponse, error, requestId);
    expect(res._status).toBe(429);
  });

  it('maps SIMULATION to 500', () => {
    const error = { category: 'SIMULATION' as const, code: 'SIM_ERROR', message: 'Sim failed' };
    handleApiError(res as unknown as VercelResponse, error, requestId);
    expect(res._status).toBe(500);
  });

  it('maps EXTERNAL to 502', () => {
    const error = { category: 'EXTERNAL' as const, code: 'UPSTREAM', message: 'External failure' };
    handleApiError(res as unknown as VercelResponse, error, requestId);
    expect(res._status).toBe(502);
  });

  it('returns 500 for generic Error objects', () => {
    handleApiError(res as unknown as VercelResponse, new Error('Unexpected'), requestId);

    expect(res._status).toBe(500);
    const body = res._body as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Unexpected');
  });

  it('returns 500 for non-error values', () => {
    handleApiError(res as unknown as VercelResponse, 'string error', requestId);

    expect(res._status).toBe(500);
    const body = res._body as { error: { code: string } };
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('includes requestId in error response body', () => {
    handleApiError(res as unknown as VercelResponse, new Error('test'), requestId);

    const body = res._body as { error: { requestId: string } };
    expect(body.error.requestId).toBe(requestId);
  });

  it('sets X-Request-Id header', () => {
    handleApiError(res as unknown as VercelResponse, new Error('test'), requestId);
    expect(res._headers['x-request-id']).toBe(requestId);
  });
});
