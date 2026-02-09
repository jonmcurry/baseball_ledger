/**
 * Tests for POST /api/ai/commentary
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../api/_lib/validate', () => ({ validateBody: vi.fn() }));
vi.mock('../../../../api/_lib/claude-client', () => ({ callClaude: vi.fn() }));

import handler from '../../../../api/ai/commentary';
import { requireAuth } from '../../../../api/_lib/auth';
import { validateBody } from '../../../../api/_lib/validate';
import { callClaude } from '../../../../api/_lib/claude-client';
import { createMockRequest, createMockResponse } from '../../../fixtures/mock-supabase';

const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);
const mockCallClaude = vi.mocked(callClaude);

const validBody = {
  batterId: 'p1',
  batterName: 'Mike Trout',
  pitcherId: 'p2',
  pitcherName: 'Greg Maddux',
  outcome: 19,
  inning: 5,
  halfInning: 'bottom',
  outs: 1,
  scoreDiff: 2,
  runnersOn: 1,
  style: 'newspaper',
};

describe('POST /api/ai/commentary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-1', email: 'test@test.com' });
    mockValidateBody.mockImplementation((req) => req.body as any);
  });

  it('returns 405 for GET', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();
    await handler(req as any, res as any);
    expect(res._status).toBe(405);
  });

  it('returns 200 with Claude source when Claude succeeds', async () => {
    mockCallClaude.mockResolvedValueOnce({ text: 'Trout crushes one!' });
    const req = createMockRequest({ method: 'POST', body: validBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.text).toBe('Trout crushes one!');
    expect(body.data.source).toBe('claude');
  });

  it('returns 200 with template source when Claude returns null', async () => {
    mockCallClaude.mockResolvedValueOnce(null);
    const req = createMockRequest({ method: 'POST', body: validBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.source).toBe('template');
    expect(body.data.text.length).toBeGreaterThan(0);
  });

  it('returns 401 when auth fails', async () => {
    mockRequireAuth.mockRejectedValueOnce({
      category: 'AUTHENTICATION',
      code: 'MISSING_TOKEN',
      message: 'Authorization required',
    });
    const req = createMockRequest({ method: 'POST', body: validBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(401);
  });

  it('response includes requestId in meta', async () => {
    mockCallClaude.mockResolvedValueOnce(null);
    const req = createMockRequest({ method: 'POST', body: validBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    const body = res._body as any;
    expect(body.meta.requestId).toBeDefined();
    expect(typeof body.meta.requestId).toBe('string');
  });
});
