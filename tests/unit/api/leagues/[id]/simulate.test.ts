/**
 * Tests for POST /api/leagues/:id/simulate
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../../api/_lib/load-team-config', () => ({
  loadTeamConfig: vi.fn(),
  selectStartingPitcher: vi.fn(),
}));
vi.mock('../../../../../api/_lib/simulate-day', () => ({
  simulateDayOnServer: vi.fn(),
}));
vi.mock('../../../../../api/_lib/playoff-transition', () => ({
  checkAndTransitionToPlayoffs: vi.fn().mockResolvedValue(false),
}));
vi.mock('../../../../../api/_lib/simulate-playoff-game', () => ({
  simulatePlayoffGame: vi.fn(),
}));

import handler from '../../../../../api/leagues/[id]/simulate';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import { loadTeamConfig, selectStartingPitcher } from '../../../../../api/_lib/load-team-config';
import { simulateDayOnServer } from '../../../../../api/_lib/simulate-day';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';
import type { PlayerCard } from '@lib/types/player';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);
const mockLoadTeamConfig = vi.mocked(loadTeamConfig);
const mockSelectStartingPitcher = vi.mocked(selectStartingPitcher);
const mockSimulateDayOnServer = vi.mocked(simulateDayOnServer);

function mockPitcherCard(id: string): PlayerCard {
  return { playerId: id, nameFirst: 'Pitcher', nameLast: id } as PlayerCard;
}

function mockTeamConfig(teamId: string) {
  return {
    lineup: [{ playerId: `${teamId}-p1`, playerName: 'Player One', position: 'CF' as const }],
    batterCards: new Map<string, PlayerCard>([[`${teamId}-p1`, { playerId: `${teamId}-p1` } as PlayerCard]]),
    rotation: [mockPitcherCard(`${teamId}-sp1`)],
    startingPitcher: mockPitcherCard(`${teamId}-sp1`),
    bullpen: [mockPitcherCard(`${teamId}-rp1`)],
    closer: mockPitcherCard(`${teamId}-cl1`),
    bench: [],
    managerStyle: 'balanced' as const,
  };
}

const mockDayResult = {
  dayNumber: 43,
  games: [
    {
      gameId: 'g-1',
      homeTeamId: 't-1',
      awayTeamId: 't-2',
      homeScore: 5,
      awayScore: 3,
      innings: 9,
      winningPitcherId: 'wp-1',
      losingPitcherId: 'lp-1',
      savePitcherId: null,
      playerBattingLines: [],
      playerPitchingLines: [],
    },
    {
      gameId: 'g-2',
      homeTeamId: 't-3',
      awayTeamId: 't-4',
      homeScore: 2,
      awayScore: 7,
      innings: 9,
      winningPitcherId: 'wp-2',
      losingPitcherId: 'lp-2',
      savePitcherId: 'sv-1',
      playerBattingLines: [],
      playerPitchingLines: [],
    },
  ],
};

describe('POST /api/leagues/:id/simulate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
    mockLoadTeamConfig.mockImplementation(async (_sb, teamId) => mockTeamConfig(teamId));
    mockSelectStartingPitcher.mockReturnValue(mockPitcherCard('selected-sp'));
    mockSimulateDayOnServer.mockResolvedValue(mockDayResult);
  });

  it('returns 405 for GET', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
  });

  it('returns 400 for invalid body (missing days)', async () => {
    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: {} });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('returns 400 for invalid body (days=0)', async () => {
    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 0 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('returns 404 when league not found', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(leagueBuilder) } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'bad-id' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body.error).toHaveProperty('code', 'LEAGUE_NOT_FOUND');
  });

  it('returns 400 when league status is setup', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'setup', current_day: 0 },
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(leagueBuilder) } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_LEAGUE_STATUS');
  });

  it('returns 200 for sync simulation (days=1) with no games when schedule empty', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 42 },
      error: null,
      count: null,
    });
    const scheduleBuilder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });
    let fromCallCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? leagueBuilder : scheduleBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveProperty('dayNumber', 43);
    expect(res._body.data).toHaveProperty('games');
    expect(res._body.data.games).toEqual([]);
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('returns 200 with DayResult for sync simulation (days=1) with scheduled games', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 42 },
      error: null,
      count: null,
    });
    const scheduleBuilder = createMockQueryBuilder({
      data: [
        { id: 'g-1', league_id: 'league-1', day_number: 43, home_team_id: 't-1', away_team_id: 't-2' },
        { id: 'g-2', league_id: 'league-1', day_number: 43, home_team_id: 't-3', away_team_id: 't-4' },
      ],
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [
        { id: 't-1', wins: 20, losses: 10 },
        { id: 't-2', wins: 15, losses: 15 },
        { id: 't-3', wins: 18, losses: 12 },
        { id: 't-4', wins: 12, losses: 18 },
      ],
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leagueBuilder;
      if (table === 'teams') return teamsBuilder;
      return scheduleBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveProperty('dayNumber', 43);
    expect(res._body.data.games).toHaveLength(2);
    expect(res._body.data.games[0]).toMatchObject({
      homeTeamId: 't-1',
      awayTeamId: 't-2',
      homeScore: 5,
      awayScore: 3,
    });
  });

  it('loads team configs for all teams in scheduled games', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 0 },
      error: null,
      count: null,
    });
    const scheduleBuilder = createMockQueryBuilder({
      data: [
        { id: 'g-1', league_id: 'league-1', day_number: 1, home_team_id: 't-1', away_team_id: 't-2' },
      ],
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 't-1', wins: 0, losses: 0 }, { id: 't-2', wins: 0, losses: 0 }],
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leagueBuilder;
      if (table === 'teams') return teamsBuilder;
      return scheduleBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(mockLoadTeamConfig).toHaveBeenCalledTimes(2);
    expect(mockLoadTeamConfig).toHaveBeenCalledWith(expect.anything(), 't-1');
    expect(mockLoadTeamConfig).toHaveBeenCalledWith(expect.anything(), 't-2');
  });

  it('calls simulateDayOnServer with correct params', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 10 },
      error: null,
      count: null,
    });
    const scheduleBuilder = createMockQueryBuilder({
      data: [
        { id: 'g-1', league_id: 'league-1', day_number: 11, home_team_id: 't-1', away_team_id: 't-2' },
      ],
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 't-1', wins: 5, losses: 5 }, { id: 't-2', wins: 6, losses: 4 }],
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leagueBuilder;
      if (table === 'teams') return teamsBuilder;
      return scheduleBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(mockSimulateDayOnServer).toHaveBeenCalledTimes(1);
    expect(mockSimulateDayOnServer).toHaveBeenCalledWith(
      expect.anything(),
      'league-1',
      11,
      expect.arrayContaining([
        expect.objectContaining({ gameId: 'g-1', homeTeamId: 't-1', awayTeamId: 't-2' }),
      ]),
      expect.any(Number),
    );
  });

  it('marks schedule rows complete after simulation', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 42 },
      error: null,
      count: null,
    });
    const scheduleBuilder = createMockQueryBuilder({
      data: [
        { id: 'g-1', league_id: 'league-1', day_number: 43, home_team_id: 't-1', away_team_id: 't-2' },
      ],
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 't-1', wins: 0, losses: 0 }, { id: 't-2', wins: 0, losses: 0 }],
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leagueBuilder;
      if (table === 'teams') return teamsBuilder;
      return scheduleBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    // Schedule update should be called for each game
    expect(scheduleBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_complete: true,
        home_score: expect.any(Number),
        away_score: expect.any(Number),
      }),
    );
  });

  it('propagates simulation errors to client', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 0 },
      error: null,
      count: null,
    });
    const scheduleBuilder = createMockQueryBuilder({
      data: [
        { id: 'g-1', league_id: 'league-1', day_number: 1, home_team_id: 't-1', away_team_id: 't-2' },
      ],
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 't-1', wins: 0, losses: 0 }, { id: 't-2', wins: 0, losses: 0 }],
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leagueBuilder;
      if (table === 'teams') return teamsBuilder;
      return scheduleBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    mockSimulateDayOnServer.mockRejectedValue({
      category: 'EXTERNAL',
      code: 'SIMULATION_COMMIT_FAILED',
      message: 'RPC failed',
    });

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(502);
    expect(res._body.error).toHaveProperty('code', 'SIMULATION_COMMIT_FAILED');
  });

  it('returns 202 for async simulation (days=7) with simulationId', async () => {
    let fromCallCount = 0;
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 10 },
      error: null,
      count: null,
    });
    const progressBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? leagueBuilder : progressBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 7 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(202);
    expect(res._body.data).toHaveProperty('simulationId');
    expect(typeof res._body.data.simulationId).toBe('string');
    expect(res._body.meta).toHaveProperty('requestId');
    expect(progressBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        league_id: 'league-1',
        status: 'running',
      }),
    );
  });

  it('returns 202 for season simulation (days=season)', async () => {
    let fromCallCount = 0;
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 50 },
      error: null,
      count: null,
    });
    const progressBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? leagueBuilder : progressBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { days: 'season' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(202);
    expect(res._body.data).toHaveProperty('simulationId');
    expect(res._body.meta).toHaveProperty('requestId');
    expect(progressBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        total_games: 448,
        current_day: 50,
      }),
    );
  });
});
