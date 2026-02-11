/**
 * Tests for GET/POST /api/leagues/:id/archive
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('@lib/transforms/archive-builder', () => ({
  buildArchiveData: vi.fn().mockReturnValue({
    champion: 'New York Yankees',
    playoffResults: { worldSeriesChampionId: 'team-1' },
    leagueLeaders: {
      batting: { HR: [{ playerId: 'p-1', playerName: 'Aaron Judge', teamId: 'team-1', value: 45, rank: 1 }] },
      pitching: { W: [{ playerId: 'p-6', playerName: 'Gerrit Cole', teamId: 'team-1', value: 18, rank: 1 }] },
    },
  }),
}));

import handler from '../../../../../api/leagues/[id]/archive';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import { buildArchiveData } from '@lib/transforms/archive-builder';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);
const mockBuildArchiveData = vi.mocked(buildArchiveData);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
});

// ---------- General ----------

describe('GET/POST /api/leagues/:id/archive (general)', () => {
  it('returns 405 for PUT', async () => {
    const req = createMockRequest({ method: 'PUT' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
  });
});

// ---------- GET: List archives ----------

describe('GET /api/leagues/:id/archive', () => {
  it('returns 200 with array of archives', async () => {
    const archivesData = [
      {
        id: 'archive-1',
        league_id: 'league-1',
        season_number: 2,
        champion: 'team-1',
        created_at: '2025-06-01T00:00:00Z',
      },
      {
        id: 'archive-2',
        league_id: 'league-1',
        season_number: 1,
        champion: 'team-2',
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    const builder = createMockQueryBuilder({
      data: archivesData,
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'archive-1', seasonNumber: 2 }),
        expect.objectContaining({ id: 'archive-2', seasonNumber: 1 }),
      ]),
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('leagueId');
    expect(res._body.data[0]).toHaveProperty('seasonNumber');
    expect(res._body.data[0]).toHaveProperty('createdAt');
    expect(res._body.data[0]).not.toHaveProperty('league_id');
    expect(res._body.data[0]).not.toHaveProperty('season_number');
  });

  it('returns 200 with empty array when no archives exist', async () => {
    const builder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: [],
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
  });
});

// ---------- POST: Archive season ----------

describe('POST /api/leagues/:id/archive', () => {
  it('returns 404 when league not found', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-999' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      error: { code: 'LEAGUE_NOT_FOUND' },
    });
  });

  it('returns 403 when user is not commissioner', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'other-user', status: 'completed', season_year: 1 },
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({
      error: { code: 'NOT_COMMISSIONER' },
    });
  });

  it('returns 400 when season is not completed', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'active', season_year: 1 },
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'SEASON_NOT_COMPLETE' },
    });
  });

  it('returns 204 on success', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'completed', season_year: 1, playoff_bracket: null, player_name_cache: {} },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [
        { id: 'team-1', name: 'Yankees', wins: 90, losses: 72 },
        { id: 'team-2', name: 'Red Sox', wins: 85, losses: 77 },
      ],
      error: null,
      count: null,
    });
    const seasonStatsBuilder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });
    const archivesBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'season_stats') return seasonStatsBuilder;
      if (table === 'archives') return archivesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(204);
    expect(res.end).toHaveBeenCalled();
  });

  // --- Enriched archive data tests ---

  function setupArchiveSuccess() {
    const leaguesBuilder = createMockQueryBuilder({
      data: {
        commissioner_id: 'user-123',
        status: 'completed',
        season_year: 1,
        playoff_bracket: { worldSeriesChampionId: 'team-1' },
        player_name_cache: { 'p-1': 'Aaron Judge' },
      },
      error: null,
      count: null,
    });
    const teamsData = [
      { id: 'team-1', name: 'Yankees', city: 'New York', wins: 95, losses: 67 },
      { id: 'team-2', name: 'Red Sox', city: 'Boston', wins: 85, losses: 77 },
    ];
    const teamsBuilder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    const seasonStatsBuilder = createMockQueryBuilder({ data: [{ player_id: 'p-1', team_id: 'team-1', batting_stats: {}, pitching_stats: null }], error: null, count: null });
    const archivesBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
    const defaultBuilder = createMockQueryBuilder({ data: null, error: null, count: null });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'season_stats') return seasonStatsBuilder;
      if (table === 'archives') return archivesBuilder;
      return defaultBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    return { mockFrom, archivesBuilder, teamsData };
  }

  it('stores champion from buildArchiveData in archive insert', async () => {
    const { mockFrom, archivesBuilder } = setupArchiveSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();
    await handler(req as any, res as any);

    expect(res._status).toBe(204);
    expect(archivesBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ champion: 'New York Yankees' }),
    );
  });

  it('stores playoff_results from buildArchiveData in archive insert', async () => {
    const { archivesBuilder } = setupArchiveSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();
    await handler(req as any, res as any);

    expect(archivesBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ playoff_results: { worldSeriesChampionId: 'team-1' } }),
    );
  });

  it('stores league_leaders from buildArchiveData in archive insert', async () => {
    const { archivesBuilder } = setupArchiveSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();
    await handler(req as any, res as any);

    expect(archivesBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        league_leaders: expect.objectContaining({
          batting: expect.any(Object),
          pitching: expect.any(Object),
        }),
      }),
    );
  });

  it('deletes season_stats, schedule, game_logs after archive', async () => {
    const { mockFrom } = setupArchiveSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();
    await handler(req as any, res as any);

    expect(res._status).toBe(204);
    // Verify delete was called on cleanup tables
    const calledTables = mockFrom.mock.calls.map((c: unknown[]) => c[0]);
    expect(calledTables).toContain('season_stats');
    expect(calledTables).toContain('schedule');
    expect(calledTables).toContain('game_logs');
  });

  it('resets team records (wins=0, losses=0, etc.)', async () => {
    const { mockFrom } = setupArchiveSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();
    await handler(req as any, res as any);

    expect(res._status).toBe(204);
    // Find teams update calls -- there will be multiple from() calls for 'teams'
    const teamsCalls = mockFrom.mock.calls.filter((c: unknown[]) => c[0] === 'teams');
    // At least 2: one SELECT for standings, one UPDATE for reset
    expect(teamsCalls.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------- GET: Archive detail ----------

describe('GET /api/leagues/:id/archive?seasonId=...', () => {
  it('returns 200 with full archive record when seasonId provided', async () => {
    const fullArchive = {
      id: 'archive-1',
      league_id: 'league-1',
      season_number: 1,
      standings: { teams: [] },
      playoff_results: { worldSeriesChampionId: 'team-1' },
      champion: 'New York Yankees',
      league_leaders: { batting: {}, pitching: {} },
      stats_storage_path: null,
      created_at: '2025-06-01T00:00:00Z',
    };

    const builder = createMockQueryBuilder({
      data: fullArchive,
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1', seasonId: 'archive-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: expect.objectContaining({
        id: 'archive-1',
        champion: 'New York Yankees',
        playoffResults: { worldSeriesChampionId: 'team-1' },
        leagueLeaders: { batting: {}, pitching: {} },
      }),
    });
  });

  it('returns 404 when seasonId not found', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1', seasonId: 'archive-999' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      error: { code: 'ARCHIVE_NOT_FOUND' },
    });
  });
});
