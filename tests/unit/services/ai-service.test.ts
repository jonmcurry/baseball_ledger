/**
 * Tests for AI Service
 *
 * Verifies that each ai-service function calls apiPost with
 * the correct path and passes the body through.
 */

vi.mock('../../../src/services/api-client', () => ({
  apiGet: vi.fn(),
  apiGetPaginated: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

import {
  generateCommentary,
  generateGameSummary,
  evaluateTrade,
  generateDraftReasoning,
  explainManagerDecision,
} from '../../../src/services/ai-service';
import { apiPost } from '../../../src/services/api-client';

const mockApiPost = vi.mocked(apiPost);

const defaultMeta = { requestId: 'req-1', timestamp: '2024-01-01' };

describe('ai-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiPost.mockResolvedValue({ data: {}, meta: defaultMeta });
  });

  it('generateCommentary calls apiPost /api/ai/commentary with body', async () => {
    const body = { batterId: 'p1', batterName: 'Trout', pitcherId: 'p2', pitcherName: 'Maddux', outcome: 19, inning: 5, halfInning: 'bottom' as const, outs: 1, scoreDiff: 0, runnersOn: 0, style: 'newspaper' as const };
    const response = { text: 'Trout homers!', source: 'template' };
    mockApiPost.mockResolvedValueOnce({ data: response, meta: defaultMeta });

    const result = await generateCommentary(body);

    expect(mockApiPost).toHaveBeenCalledWith('/api/ai?feature=commentary', body);
    expect(result.data).toEqual(response);
  });

  it('generateGameSummary calls apiPost /api/ai/game-summary with body', async () => {
    const body = { homeTeamName: 'Sluggers', awayTeamName: 'Aces', homeScore: 5, awayScore: 3, innings: 9, winningPitcherName: 'Smith', losingPitcherName: 'Jones', savePitcherName: null, keyPlays: [], boxScore: { lineScore: { away: [], home: [] }, awayHits: 7, homeHits: 10, awayErrors: 0, homeErrors: 0 }, playerHighlights: [] };
    mockApiPost.mockResolvedValueOnce({ data: { headline: 'Sluggers Win', summary: 'Great game.', source: 'template' }, meta: defaultMeta });

    const result = await generateGameSummary(body);

    expect(mockApiPost).toHaveBeenCalledWith('/api/ai?feature=game-summary', body);
    expect(result.data).toBeDefined();
  });

  it('evaluateTrade calls apiPost /api/ai/trade-eval with body', async () => {
    const body = { managerStyle: 'balanced' as const, managerName: 'McCoy', teamName: 'Sluggers', playersOffered: [{ name: 'A', position: 'LF', value: 50 }], playersRequested: [{ name: 'B', position: 'RF', value: 55 }], teamNeeds: ['RF'] };
    mockApiPost.mockResolvedValueOnce({ data: { recommendation: 'accept', reasoning: 'Good deal.', valueDiff: 0.1, source: 'template' }, meta: defaultMeta });

    const result = await evaluateTrade(body);

    expect(mockApiPost).toHaveBeenCalledWith('/api/ai?feature=trade-eval', body);
    expect(result.data).toBeDefined();
  });

  it('generateDraftReasoning calls apiPost /api/ai/draft-reasoning with body', async () => {
    const body = { round: 1, managerStyle: 'balanced' as const, managerName: 'McCoy', teamName: 'Sluggers', pickedPlayerName: 'Griffey', pickedPlayerPosition: 'CF', pickedPlayerValue: 92, alternativePlayers: [], teamNeeds: ['CF'] };
    mockApiPost.mockResolvedValueOnce({ data: { reasoning: 'Elite pick.', source: 'template' }, meta: defaultMeta });

    const result = await generateDraftReasoning(body);

    expect(mockApiPost).toHaveBeenCalledWith('/api/ai?feature=draft-reasoning', body);
    expect(result.data).toBeDefined();
  });

  it('explainManagerDecision calls apiPost /api/ai/manager-explanation with body', async () => {
    const body = { managerName: 'Duke', managerStyle: 'aggressive' as const, decision: 'steal' as const, inning: 7, outs: 1, scoreDiff: -1, gameContext: '' };
    mockApiPost.mockResolvedValueOnce({ data: { explanation: 'We run here.', source: 'template' }, meta: defaultMeta });

    const result = await explainManagerDecision(body);

    expect(mockApiPost).toHaveBeenCalledWith('/api/ai?feature=manager-explanation', body);
    expect(result.data).toBeDefined();
  });

  it('passes body through without modification', async () => {
    const body = { batterId: 'x', batterName: 'Y', pitcherId: 'z', pitcherName: 'W', outcome: 15, inning: 1, halfInning: 'top' as const, outs: 0, scoreDiff: 0, runnersOn: 0, style: 'modern' as const };
    await generateCommentary(body);

    const passedBody = mockApiPost.mock.calls[0][1];
    expect(passedBody).toBe(body);
  });
});
