/**
 * Tests for POST /api/ai/draft-reasoning
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../api/_lib/validate', () => ({ validateBody: vi.fn() }));
vi.mock('../../../../api/_lib/claude-client', () => ({ callClaude: vi.fn() }));

import handler from '../../../../api/ai/draft-reasoning';
import { requireAuth } from '../../../../api/_lib/auth';
import { validateBody } from '../../../../api/_lib/validate';
import { callClaude } from '../../../../api/_lib/claude-client';
import { createMockRequest, createMockResponse } from '../../../fixtures/mock-supabase';

const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);
const mockCallClaude = vi.mocked(callClaude);

const validBody = {
  round: 1,
  managerStyle: 'balanced',
  managerName: 'Johnny McCoy',
  teamName: 'Sluggers',
  pickedPlayerName: 'Ken Griffey Jr.',
  pickedPlayerPosition: 'CF',
  pickedPlayerValue: 92,
  alternativePlayers: [],
  teamNeeds: ['CF', 'SP'],
};

describe('POST /api/ai/draft-reasoning', () => {
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
    mockCallClaude.mockResolvedValueOnce({ text: 'I picked Griffey because of his elite tools.' });
    const req = createMockRequest({ method: 'POST', body: validBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.reasoning).toBe('I picked Griffey because of his elite tools.');
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
    expect(body.data.reasoning.length).toBeGreaterThan(0);
  });
});
