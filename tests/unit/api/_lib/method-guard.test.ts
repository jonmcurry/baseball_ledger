import { createMockRequest, createMockResponse } from '../../../fixtures/mock-supabase';
import { checkMethod } from '../../../../api/_lib/method-guard';
import type { VercelRequest, VercelResponse } from '@vercel/node';

describe('api/_lib/method-guard', () => {
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    res = createMockResponse();
  });

  it('returns true for matching single method', () => {
    const req = createMockRequest({ method: 'GET' });
    const result = checkMethod(
      req as unknown as VercelRequest,
      res as unknown as VercelResponse,
      'GET',
    );
    expect(result).toBe(true);
  });

  it('returns true for matching method in array', () => {
    const req = createMockRequest({ method: 'DELETE' });
    const result = checkMethod(
      req as unknown as VercelRequest,
      res as unknown as VercelResponse,
      ['GET', 'DELETE'],
    );
    expect(result).toBe(true);
  });

  it('returns false and sends 405 for non-matching method', () => {
    const req = createMockRequest({ method: 'POST' });
    const result = checkMethod(
      req as unknown as VercelRequest,
      res as unknown as VercelResponse,
      'GET',
    );

    expect(result).toBe(false);
    expect(res._status).toBe(405);
    const body = res._body as { error: { code: string } };
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('sets Allow header with permitted methods', () => {
    const req = createMockRequest({ method: 'PATCH' });
    checkMethod(
      req as unknown as VercelRequest,
      res as unknown as VercelResponse,
      ['GET', 'POST'],
    );

    expect(res._headers['allow']).toBe('GET, POST');
  });

  it('handles case-insensitive method matching', () => {
    const req = createMockRequest({ method: 'get' });
    const result = checkMethod(
      req as unknown as VercelRequest,
      res as unknown as VercelResponse,
      'GET',
    );
    expect(result).toBe(true);
  });
});
