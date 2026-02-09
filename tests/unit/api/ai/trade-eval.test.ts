/**
 * Tests for POST /api/ai/trade-eval
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../api/_lib/validate', () => ({ validateBody: vi.fn() }));
vi.mock('../../../../api/_lib/claude-client', () => ({ callClaude: vi.fn() }));

import handler from '../../../../api/ai/trade-eval';
import { requireAuth } from '../../../../api/_lib/auth';
import { validateBody } from '../../../../api/_lib/validate';
import { callClaude } from '../../../../api/_lib/claude-client';
import { createMockRequest, createMockResponse } from '../../../fixtures/mock-supabase';

const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);
const mockCallClaude = vi.mocked(callClaude);

const validBody = {
  managerStyle: 'balanced',
  managerName: 'Johnny McCoy',
  teamName: 'Sluggers',
  playersOffered: [{ name: 'Player A', position: 'LF', value: 50 }],
  playersRequested: [{ name: 'Player B', position: 'RF', value: 55 }],
  teamNeeds: ['RF', 'SP'],
};

describe('POST /api/ai/trade-eval', () => {
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
    mockCallClaude.mockResolvedValueOnce({ text: 'ACCEPT\nGreat value trade.\n0.15' });
    const req = createMockRequest({ method: 'POST', body: validBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.recommendation).toBe('accept');
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
    expect(['accept', 'reject', 'counter']).toContain(body.data.recommendation);
  });

  it('parses REJECT from Claude response', async () => {
    mockCallClaude.mockResolvedValueOnce({ text: 'REJECT\nNot enough value.\n-0.20' });
    const req = createMockRequest({ method: 'POST', body: validBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    const body = res._body as any;
    expect(body.data.recommendation).toBe('reject');
  });
});
