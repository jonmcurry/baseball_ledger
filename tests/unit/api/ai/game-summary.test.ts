/**
 * Tests for POST /api/ai/game-summary
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../api/_lib/validate', () => ({ validateBody: vi.fn() }));
vi.mock('../../../../api/_lib/claude-client', () => ({ callClaude: vi.fn() }));

import handler from '../../../../api/ai/game-summary';
import { requireAuth } from '../../../../api/_lib/auth';
import { validateBody } from '../../../../api/_lib/validate';
import { callClaude } from '../../../../api/_lib/claude-client';
import { createMockRequest, createMockResponse } from '../../../fixtures/mock-supabase';

const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);
const mockCallClaude = vi.mocked(callClaude);

const validBody = {
  homeTeamName: 'Sluggers',
  awayTeamName: 'Aces',
  homeScore: 5,
  awayScore: 3,
  innings: 9,
  winningPitcherName: 'John Smith',
  losingPitcherName: 'Bob Jones',
  savePitcherName: null,
  keyPlays: [],
  boxScore: { lineScore: { away: [], home: [] }, awayHits: 7, homeHits: 10, awayErrors: 1, homeErrors: 0 },
  playerHighlights: [],
};

describe('POST /api/ai/game-summary', () => {
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
    mockCallClaude.mockResolvedValueOnce({ text: 'Sluggers Top Aces 5-3\nA dominant pitching performance...' });
    const req = createMockRequest({ method: 'POST', body: validBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.headline).toBe('Sluggers Top Aces 5-3');
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
    expect(body.data.headline.length).toBeGreaterThan(0);
    expect(body.data.summary.length).toBeGreaterThan(0);
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
});
