/**
 * Tests for GET /api/leagues/:id/games/:gid
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../../api/leagues/[id]/games/[gid]';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('GET /api/leagues/:id/games/:gid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  });

  it('returns 405 for POST', async () => {
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
  });

  it('returns 404 when game not found', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Row not found', code: 'PGRST116' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', gid: 'bad-game' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body.error).toHaveProperty('code', 'GAME_NOT_FOUND');
  });

  it('returns 200 with game detail including box_score and play_by_play', async () => {
    const gameData = {
      id: 'game-1',
      league_id: 'league-1',
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      home_score: 5,
      away_score: 3,
      status: 'completed',
      day_number: 42,
      box_score: {
        home: { runs: 5, hits: 10, errors: 1 },
        away: { runs: 3, hits: 7, errors: 2 },
      },
      play_by_play: [
        { inning: 1, half: 'top', description: 'Groundout to short' },
        { inning: 1, half: 'bottom', description: 'Single to center' },
      ],
      home_team: { id: 'team-1', name: 'Yankees', city: 'New York' },
      away_team: { id: 'team-2', name: 'Red Sox', city: 'Boston' },
    };

    const builder = createMockQueryBuilder({ data: gameData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', gid: 'game-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    // Verify camelCase transformation
    expect(res._body.data).toHaveProperty('homeScore', 5);
    expect(res._body.data).toHaveProperty('awayScore', 3);
    expect(res._body.data).toHaveProperty('boxScore');
    expect(res._body.data).toHaveProperty('playByPlay');
    expect(res._body.data).toHaveProperty('dayNumber', 42);
    expect(res._body.data).not.toHaveProperty('home_score');
    expect(res._body.data).not.toHaveProperty('box_score');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('queries game_logs with correct game id', async () => {
    const gameData = {
      id: 'game-42',
      league_id: 'league-1',
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      home_score: 2,
      away_score: 1,
      status: 'completed',
      day_number: 10,
      box_score: {},
      play_by_play: [],
      home_team: { id: 'team-1', name: 'Yankees', city: 'New York' },
      away_team: { id: 'team-2', name: 'Red Sox', city: 'Boston' },
    };

    const builder = createMockQueryBuilder({ data: gameData, error: null, count: null });
    const mockFrom = vi.fn().mockReturnValue(builder);
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', gid: 'game-42' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(mockFrom).toHaveBeenCalledWith('game_logs');
    expect(builder.eq).toHaveBeenCalledWith('id', 'game-42');
    expect(builder.single).toHaveBeenCalled();
  });
});
