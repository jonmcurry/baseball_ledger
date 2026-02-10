/**
 * Tests for POST /api/ai?feature=commentary|game-summary|trade-eval|draft-reasoning|manager-explanation
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../api/_lib/validate', () => ({ validateBody: vi.fn() }));
vi.mock('../../../../api/_lib/claude-client', () => ({ callClaude: vi.fn() }));

import handler from '../../../../api/ai/index';
import { requireAuth } from '../../../../api/_lib/auth';
import { validateBody } from '../../../../api/_lib/validate';
import { callClaude } from '../../../../api/_lib/claude-client';
import { createMockRequest, createMockResponse } from '../../../fixtures/mock-supabase';

const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);
const mockCallClaude = vi.mocked(callClaude);

// ---------- Shared setup ----------

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'user-1', email: 'test@test.com' });
  mockValidateBody.mockImplementation((req) => req.body as any);
});

// ---------- General tests ----------

describe('POST /api/ai (general)', () => {
  it('returns 405 for GET', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();
    await handler(req as any, res as any);
    expect(res._status).toBe(405);
  });

  it('returns 400 for missing feature parameter', async () => {
    const req = createMockRequest({ method: 'POST', query: {} });
    const res = createMockResponse();
    await handler(req as any, res as any);
    expect(res._status).toBe(400);
    expect((res._body as any).error.code).toBe('INVALID_FEATURE');
  });

  it('returns 400 for invalid feature parameter', async () => {
    const req = createMockRequest({ method: 'POST', query: { feature: 'nonexistent' } });
    const res = createMockResponse();
    await handler(req as any, res as any);
    expect(res._status).toBe(400);
    expect((res._body as any).error.code).toBe('INVALID_FEATURE');
  });

  it('returns 401 when auth fails', async () => {
    mockRequireAuth.mockRejectedValueOnce({
      category: 'AUTHENTICATION',
      code: 'MISSING_TOKEN',
      message: 'Authorization required',
    });
    const req = createMockRequest({ method: 'POST', query: { feature: 'commentary' }, body: {} });
    const res = createMockResponse();
    await handler(req as any, res as any);
    expect(res._status).toBe(401);
  });
});

// ---------- Commentary tests ----------

const validCommentaryBody = {
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

describe('POST /api/ai?feature=commentary', () => {
  it('returns 200 with Claude source when Claude succeeds', async () => {
    mockCallClaude.mockResolvedValueOnce({ text: 'Trout crushes one!' });
    const req = createMockRequest({ method: 'POST', query: { feature: 'commentary' }, body: validCommentaryBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.text).toBe('Trout crushes one!');
    expect(body.data.source).toBe('claude');
  });

  it('returns 200 with template source when Claude returns null', async () => {
    mockCallClaude.mockResolvedValueOnce(null);
    const req = createMockRequest({ method: 'POST', query: { feature: 'commentary' }, body: validCommentaryBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.source).toBe('template');
    expect(body.data.text.length).toBeGreaterThan(0);
  });

  it('response includes requestId in meta', async () => {
    mockCallClaude.mockResolvedValueOnce(null);
    const req = createMockRequest({ method: 'POST', query: { feature: 'commentary' }, body: validCommentaryBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    const body = res._body as any;
    expect(body.meta.requestId).toBeDefined();
    expect(typeof body.meta.requestId).toBe('string');
  });
});

// ---------- Game Summary tests ----------

const validGameSummaryBody = {
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

describe('POST /api/ai?feature=game-summary', () => {
  it('returns 200 with Claude source when Claude succeeds', async () => {
    mockCallClaude.mockResolvedValueOnce({ text: 'Sluggers Top Aces 5-3\nA dominant pitching performance...' });
    const req = createMockRequest({ method: 'POST', query: { feature: 'game-summary' }, body: validGameSummaryBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.headline).toBe('Sluggers Top Aces 5-3');
    expect(body.data.source).toBe('claude');
  });

  it('returns 200 with template source when Claude returns null', async () => {
    mockCallClaude.mockResolvedValueOnce(null);
    const req = createMockRequest({ method: 'POST', query: { feature: 'game-summary' }, body: validGameSummaryBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.source).toBe('template');
    expect(body.data.headline.length).toBeGreaterThan(0);
    expect(body.data.summary.length).toBeGreaterThan(0);
  });
});

// ---------- Trade Eval tests ----------

const validTradeEvalBody = {
  managerStyle: 'balanced',
  managerName: 'Johnny McCoy',
  teamName: 'Sluggers',
  playersOffered: [{ name: 'Player A', position: 'LF', value: 50 }],
  playersRequested: [{ name: 'Player B', position: 'RF', value: 55 }],
  teamNeeds: ['RF', 'SP'],
};

describe('POST /api/ai?feature=trade-eval', () => {
  it('returns 200 with Claude source when Claude succeeds', async () => {
    mockCallClaude.mockResolvedValueOnce({ text: 'ACCEPT\nGreat value trade.\n0.15' });
    const req = createMockRequest({ method: 'POST', query: { feature: 'trade-eval' }, body: validTradeEvalBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.recommendation).toBe('accept');
    expect(body.data.source).toBe('claude');
  });

  it('returns 200 with template source when Claude returns null', async () => {
    mockCallClaude.mockResolvedValueOnce(null);
    const req = createMockRequest({ method: 'POST', query: { feature: 'trade-eval' }, body: validTradeEvalBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.source).toBe('template');
    expect(['accept', 'reject', 'counter']).toContain(body.data.recommendation);
  });

  it('parses REJECT from Claude response', async () => {
    mockCallClaude.mockResolvedValueOnce({ text: 'REJECT\nNot enough value.\n-0.20' });
    const req = createMockRequest({ method: 'POST', query: { feature: 'trade-eval' }, body: validTradeEvalBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    const body = res._body as any;
    expect(body.data.recommendation).toBe('reject');
  });
});

// ---------- Draft Reasoning tests ----------

const validDraftReasoningBody = {
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

describe('POST /api/ai?feature=draft-reasoning', () => {
  it('returns 200 with Claude source when Claude succeeds', async () => {
    mockCallClaude.mockResolvedValueOnce({ text: 'I picked Griffey because of his elite tools.' });
    const req = createMockRequest({ method: 'POST', query: { feature: 'draft-reasoning' }, body: validDraftReasoningBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.reasoning).toBe('I picked Griffey because of his elite tools.');
    expect(body.data.source).toBe('claude');
  });

  it('returns 200 with template source when Claude returns null', async () => {
    mockCallClaude.mockResolvedValueOnce(null);
    const req = createMockRequest({ method: 'POST', query: { feature: 'draft-reasoning' }, body: validDraftReasoningBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.source).toBe('template');
    expect(body.data.reasoning.length).toBeGreaterThan(0);
  });
});

// ---------- Manager Explanation tests ----------

const validManagerExplanationBody = {
  managerName: 'Duke Robinson',
  managerStyle: 'aggressive',
  decision: 'steal',
  inning: 7,
  outs: 1,
  scoreDiff: -1,
  gameContext: 'runner at first with a good basestealer',
};

describe('POST /api/ai?feature=manager-explanation', () => {
  it('returns 200 with Claude source when Claude succeeds', async () => {
    mockCallClaude.mockResolvedValueOnce({ text: 'I send the runner because we need to create pressure.' });
    const req = createMockRequest({ method: 'POST', query: { feature: 'manager-explanation' }, body: validManagerExplanationBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.explanation).toContain('pressure');
    expect(body.data.source).toBe('claude');
  });

  it('returns 200 with template source when Claude returns null', async () => {
    mockCallClaude.mockResolvedValueOnce(null);
    const req = createMockRequest({ method: 'POST', query: { feature: 'manager-explanation' }, body: validManagerExplanationBody });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const body = res._body as any;
    expect(body.data.source).toBe('template');
    expect(body.data.explanation.length).toBeGreaterThan(0);
  });
});
