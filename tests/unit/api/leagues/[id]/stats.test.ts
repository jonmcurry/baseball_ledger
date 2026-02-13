/**
 * Tests for GET /api/leagues/:id/stats?type=batting|pitching|team
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/stats';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

/**
 * Adds `.not()` to a mock query builder (not in the shared fixture).
 * The batting/pitching endpoints chain `.not('batting_stats', 'is', null)`.
 */
function addNotMethod<T extends ReturnType<typeof createMockQueryBuilder>>(builder: T): T {
  (builder as any).not = vi.fn().mockReturnValue(builder);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
});

// ---------- General ----------

describe('GET /api/leagues/:id/stats (general)', () => {
  it('returns 405 for POST', async () => {
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
  });

  it('returns 400 for missing type parameter', async () => {
    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect((res._body as any).error.code).toBe('INVALID_TYPE');
  });

  it('returns 400 for invalid type parameter', async () => {
    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'invalid' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect((res._body as any).error.code).toBe('INVALID_TYPE');
  });
});

// ---------- Batting ----------

describe('GET /api/leagues/:id/stats?type=batting', () => {
  it('returns 200 with paginated batting leaders', async () => {
    const battingData = [
      {
        player_id: 'p1',
        team_id: 't1',
        batting_stats: { hits: 150, at_bats: 500, home_runs: 30 },
      },
      {
        player_id: 'p2',
        team_id: 't2',
        batting_stats: { hits: 140, at_bats: 480, home_runs: 25 },
      },
    ];

    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 75 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: battingData, error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'batting' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('playerId', 'p1');
    expect(res._body.data[0]).toHaveProperty('teamId', 't1');
    expect(res._body.data[0]).toHaveProperty('stats');
    expect(res._body.data[0]).not.toHaveProperty('player_id');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('uses page query param for pagination (default page 1)', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 100 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: [], error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'batting', page: '2' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    // Page 2 should call range(50, 99) for PAGE_SIZE=50
    expect(dataBuilder.range).toHaveBeenCalledWith(50, 99);
  });

  it('returns correct pagination metadata', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 75 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: [], error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'batting' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.pagination).toEqual({
      page: 1,
      pageSize: 50,
      totalRows: 75,
      totalPages: 2,
    });
  });

  it('handles count query error', async () => {
    const countBuilder = addNotMethod(
      createMockQueryBuilder({
        data: null,
        error: { message: 'Count failed', code: 'PGRST000' },
        count: null,
      }),
    );

    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(countBuilder),
    } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'batting' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(500);
    expect(res._body.error).toHaveProperty('code', 'QUERY_FAILED');
  });

  it('handles data query error', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 10 }));
    const dataBuilder = addNotMethod(
      createMockQueryBuilder({
        data: null,
        error: { message: 'Data fetch failed', code: 'PGRST000' },
        count: null,
      }),
    );
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'batting' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(500);
    expect(res._body.error).toHaveProperty('code', 'QUERY_FAILED');
  });
});

// ---------- Pitching ----------

describe('GET /api/leagues/:id/stats?type=pitching', () => {
  it('returns 200 with paginated pitching leaders', async () => {
    const pitchingData = [
      {
        player_id: 'p1',
        team_id: 't1',
        pitching_stats: { wins: 15, losses: 8, era: 3.25, strikeouts: 200 },
      },
      {
        player_id: 'p2',
        team_id: 't2',
        pitching_stats: { wins: 12, losses: 10, era: 3.80, strikeouts: 175 },
      },
    ];

    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 40 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: pitchingData, error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'pitching' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('playerId', 'p1');
    expect(res._body.data[0]).toHaveProperty('teamId', 't1');
    expect(res._body.data[0]).toHaveProperty('stats');
    expect(res._body.data[0]).not.toHaveProperty('player_id');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('uses page query param for pagination', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 120 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: [], error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'pitching', page: '3' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    // Page 3 with PAGE_SIZE=50: offset = (3-1)*50 = 100, range(100, 149)
    expect(dataBuilder.range).toHaveBeenCalledWith(100, 149);
  });

  it('returns correct pagination metadata', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 120 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: [], error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'pitching' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.pagination).toEqual({
      page: 1,
      pageSize: 50,
      totalRows: 120,
      totalPages: 3,
    });
  });

  it('handles count query error', async () => {
    const countBuilder = addNotMethod(
      createMockQueryBuilder({
        data: null,
        error: { message: 'Count failed', code: 'PGRST000' },
        count: null,
      }),
    );

    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(countBuilder),
    } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'pitching' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(500);
    expect(res._body.error).toHaveProperty('code', 'QUERY_FAILED');
  });
});

// ---------- Team ----------

describe('GET /api/leagues/:id/stats?type=team', () => {
  it('returns 200 with team stats including run differential', async () => {
    const teamsData = [
      {
        id: 'team-1',
        name: 'Yankees',
        city: 'New York',
        wins: 95,
        losses: 67,
        runs_scored: 750,
        runs_allowed: 620,
      },
      {
        id: 'team-2',
        name: 'Red Sox',
        city: 'Boston',
        wins: 82,
        losses: 80,
        runs_scored: 680,
        runs_allowed: 700,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'team' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    // Verify camelCase transformation and run_differential computation
    expect(res._body.data[0]).toHaveProperty('teamId', 'team-1');
    expect(res._body.data[0]).toHaveProperty('teamName', 'Yankees');
    expect(res._body.data[0]).toHaveProperty('runsScored', 750);
    expect(res._body.data[0]).toHaveProperty('runsAllowed', 620);
    expect(res._body.data[0]).toHaveProperty('runDifferential', 130);
    expect(res._body.data[0]).not.toHaveProperty('team_id');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('computes run_differential correctly (runs_scored - runs_allowed)', async () => {
    const teamsData = [
      {
        id: 'team-1',
        name: 'Orioles',
        city: 'Baltimore',
        wins: 60,
        losses: 102,
        runs_scored: 550,
        runs_allowed: 800,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'team' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    // 550 - 800 = -250
    expect(res._body.data[0]).toHaveProperty('runDifferential', -250);
  });

  it('returns empty array when no teams', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'team' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toEqual([]);
  });
});

// ---------- Player (individual season stats) ----------

describe('GET /api/leagues/:id/stats?type=player&playerId=X', () => {
  it('returns 400 when playerId is missing', async () => {
    const builder = createMockQueryBuilder({ data: null, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'player' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'MISSING_PLAYER_ID');
  });

  it('returns 200 with player season stats', async () => {
    const statsData = {
      player_id: 'batter01',
      team_id: 'team-a',
      season_year: 2020,
      batting_stats: { G: 10, AB: 40, H: 12, HR: 2, BA: 0.300, OBP: 0.350, SLG: 0.475, OPS: 0.825 },
      pitching_stats: null,
    };

    const builder = createMockQueryBuilder({ data: statsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1', type: 'player', playerId: 'batter01' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveProperty('playerId', 'batter01');
    expect(res._body.data).toHaveProperty('battingStats');
    expect(res._body.data.battingStats).toHaveProperty('G', 10);
  });

  it('returns 200 with null stats when player has no season stats', async () => {
    const builder = createMockQueryBuilder({ data: null, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1', type: 'player', playerId: 'unknown01' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveProperty('playerId', 'unknown01');
    expect(res._body.data).toHaveProperty('battingStats', null);
    expect(res._body.data).toHaveProperty('pitchingStats', null);
  });
});

// ---------- Standings ----------

describe('GET /api/leagues/:id/stats?type=standings', () => {
  it('returns 200 with division-grouped standings', async () => {
    const teamsData = [
      {
        id: 'team-1', name: 'Yankees', city: 'New York', owner_id: 'user-1',
        manager_profile: 'balanced', league_division: 'American', division: 'East',
        wins: 95, losses: 67, runs_scored: 750, runs_allowed: 600,
      },
      {
        id: 'team-2', name: 'Red Sox', city: 'Boston', owner_id: 'user-2',
        manager_profile: 'aggressive', league_division: 'American', division: 'East',
        wins: 85, losses: 77, runs_scored: 700, runs_allowed: 680,
      },
      {
        id: 'team-3', name: 'Dodgers', city: 'Los Angeles', owner_id: 'user-3',
        manager_profile: 'analytical', league_division: 'National', division: 'West',
        wins: 100, losses: 62, runs_scored: 800, runs_allowed: 550,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'standings' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('groups teams correctly by league_division and division', async () => {
    const teamsData = [
      {
        id: 'team-1', name: 'Yankees', city: 'New York', owner_id: 'user-1',
        manager_profile: 'balanced', league_division: 'American', division: 'East',
        wins: 95, losses: 67, runs_scored: 750, runs_allowed: 600,
      },
      {
        id: 'team-2', name: 'Red Sox', city: 'Boston', owner_id: 'user-2',
        manager_profile: 'aggressive', league_division: 'American', division: 'East',
        wins: 85, losses: 77, runs_scored: 700, runs_allowed: 680,
      },
      {
        id: 'team-3', name: 'Twins', city: 'Minnesota', owner_id: 'user-3',
        manager_profile: 'conservative', league_division: 'American', division: 'Central',
        wins: 78, losses: 84, runs_scored: 650, runs_allowed: 700,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'standings' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const standings = res._body.data;
    expect(standings).toHaveLength(2);

    const alEast = standings.find(
      (d: any) => d.leagueDivision === 'American' && d.division === 'East',
    );
    const alCentral = standings.find(
      (d: any) => d.leagueDivision === 'American' && d.division === 'Central',
    );

    expect(alEast).toBeDefined();
    expect(alEast.teams).toHaveLength(2);
    expect(alCentral).toBeDefined();
    expect(alCentral.teams).toHaveLength(1);
  });

  it('returns empty array when no teams', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', type: 'standings' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toEqual([]);
  });
});
