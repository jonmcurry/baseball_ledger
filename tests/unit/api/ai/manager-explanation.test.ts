/**
 * Tests for POST /api/ai/manager-explanation
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../api/_lib/validate', () => ({ validateBody: vi.fn() }));
vi.mock('../../../../api/_lib/claude-client', () => ({ callClaude: vi.fn() }));

import handler from '../../../../api/ai/manager-explanation';
import { requireAuth } from '../../../../api/_lib/auth';
import { validateBody } from '../../../../api/_lib/validate';
import { callClaude } from '../../../../api/_lib/claude-client';
import { createMockRequest, createMockResponse } from '../../../fixtures/mock-supabase';

const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);
const mockCallClaude = vi.mocked(callClaude);

const validBody = {
  managerName: 'Duke Robinson',
  managerStyle: 'aggressive',
  decision: 'steal',
  inning: 7,
  outs: 1,
  scoreDiff: -1,
  gameContext: 'runner at first with a good basestealer',
};

describe('POST /api/ai/manager-explanation', () => {
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
    mockCallClaude.mockResolvedValueOnce({ text: 'I send the runner because we need to create pressure.' });
    const req = createMockRequest({ method: 'POST', body: validBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.explanation).toContain('pressure');
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
    expect(body.data.explanation.length).toBeGreaterThan(0);
  });
});
