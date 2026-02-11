/**
 * Tests for withApiHandler global error wrapper (REQ-ERR-009)
 *
 * Verifies the defense-in-depth handler wrapper catches unhandled
 * errors and returns structured 500 ApiErrorResponse.
 */

import { withApiHandler } from '../../../../api/_lib/with-api-handler';
import { createMockRequest, createMockResponse } from '../../../fixtures/mock-supabase';

describe('withApiHandler (REQ-ERR-009)', () => {
  it('passes request, response, and requestId to the handler', async () => {
    const inner = vi.fn().mockResolvedValue(undefined);
    const handler = withApiHandler(inner);

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(inner).toHaveBeenCalledTimes(1);
    const [passedReq, passedRes, requestId] = inner.mock.calls[0];
    expect(passedReq).toBe(req);
    expect(passedRes).toBe(res);
    expect(typeof requestId).toBe('string');
    expect(requestId.length).toBeGreaterThan(0);
  });

  it('catches thrown errors and returns 500 with ERR_UNHANDLED code', async () => {
    const inner = vi.fn().mockRejectedValue(new Error('unexpected failure'));
    const handler = withApiHandler(inner);

    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(500);
    expect(res._body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'unexpected failure',
        }),
      }),
    );
  });

  it('catches non-Error throws and returns 500', async () => {
    const inner = vi.fn().mockRejectedValue('string error');
    const handler = withApiHandler(inner);

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(500);
    expect(res._body.error.code).toBe('INTERNAL_ERROR');
  });

  it('sets X-Request-Id header on error responses', async () => {
    const inner = vi.fn().mockRejectedValue(new Error('oops'));
    const handler = withApiHandler(inner);

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._headers['x-request-id']).toBeDefined();
    expect(res._headers['x-request-id'].length).toBeGreaterThan(0);
  });

  it('logs ERROR for unhandled errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const inner = vi.fn().mockRejectedValue(new Error('log me'));
    const handler = withApiHandler(inner);

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(errorSpy).toHaveBeenCalled();
    const logCall = errorSpy.mock.calls[0][0];
    expect(logCall).toContain('ERROR');
    expect(logCall).toContain('Unhandled API error');

    errorSpy.mockRestore();
  });

  it('does not interfere when handler succeeds', async () => {
    const inner = vi.fn().mockImplementation(
      (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
        res.status(200).json({ data: 'ok' });
      },
    );
    const handler = withApiHandler(inner);

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ data: 'ok' });
  });
});
