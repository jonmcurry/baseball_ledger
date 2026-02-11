/**
 * Tests for GET/POST /api/leagues/:id/schedule
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../../api/_lib/generate-lineup-rows', () => ({
  generateAndInsertLineups: vi.fn().mockResolvedValue({ teamsProcessed: 30, playersUpdated: 300 }),
}));
vi.mock('../../../../../api/_lib/generate-schedule-rows', () => ({
  generateAndInsertSchedule: vi.fn().mockResolvedValue({ totalDays: 162, totalGames: 2430 }),
}));
vi.mock('@lib/validators/season-start', () => ({
  canStartSeason: vi.fn().mockReturnValue({ canStart: true, reason: null }),
}));

import handler from '../../../../../api/leagues/[id]/schedule';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import { generateAndInsertLineups } from '../../../../../api/_lib/generate-lineup-rows';
import { generateAndInsertSchedule } from '../../../../../api/_lib/generate-schedule-rows';
import { canStartSeason } from '@lib/validators/season-start';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);
const mockGenerateLineups = vi.mocked(generateAndInsertLineups);
const mockGenerateSchedule = vi.mocked(generateAndInsertSchedule);
const mockCanStartSeason = vi.mocked(canStartSeason);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  mockCanStartSeason.mockReturnValue({ canStart: true, reason: null });
  mockGenerateLineups.mockResolvedValue({ teamsProcessed: 30, playersUpdated: 300 });
  mockGenerateSchedule.mockResolvedValue({ totalDays: 162, totalGames: 2430 });
});

// ---------- General ----------

describe('GET/POST /api/leagues/:id/schedule (general)', () => {
  it('returns 405 for PUT', async () => {
    const req = createMockRequest({ method: 'PUT' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
  });
});

// ---------- GET: Fetch schedule ----------

describe('GET /api/leagues/:id/schedule', () => {
  const scheduleData = [
    {
      id: 'game-1',
      league_id: 'league-1',
      day_number: 1,
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      is_complete: false,
      home_score: null,
      away_score: null,
    },
    {
      id: 'game-2',
      league_id: 'league-1',
      day_number: 1,
      home_team_id: 'team-3',
      away_team_id: 'team-4',
      is_complete: false,
      home_score: null,
      away_score: null,
    },
    {
      id: 'game-3',
      league_id: 'league-1',
      day_number: 2,
      home_team_id: 'team-1',
      away_team_id: 'team-3',
      is_complete: false,
      home_score: null,
      away_score: null,
    },
  ];

  it('returns 200 with schedule array', async () => {
    const builder = createMockQueryBuilder({ data: scheduleData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(3);
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('homeTeamId', 'team-1');
    expect(res._body.data[0]).toHaveProperty('awayTeamId', 'team-2');
    expect(res._body.data[0]).toHaveProperty('dayNumber', 1);
    expect(res._body.data[0]).toHaveProperty('isComplete', false);
    expect(res._body.data[0]).not.toHaveProperty('home_team_id');
    expect(res._body.data[0]).not.toHaveProperty('day_number');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('filters by day when day query param provided', async () => {
    const day1Games = scheduleData.filter((g) => g.day_number === 1);
    const builder = createMockQueryBuilder({ data: day1Games, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', day: '1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    // Verify the builder chain had eq called for day_number
    expect(builder.eq).toHaveBeenCalledWith('league_id', 'league-1');
    expect(builder.eq).toHaveBeenCalledWith('day_number', 1);
  });

  it('returns full schedule when no day filter', async () => {
    const builder = createMockQueryBuilder({ data: scheduleData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(3);
    // eq should only be called for league_id, not day_number
    const eqCalls = builder.eq.mock.calls;
    const dayNumberCalls = eqCalls.filter((call: any[]) => call[0] === 'day_number');
    expect(dayNumberCalls).toHaveLength(0);
  });
});

// ---------- POST: Start new season ----------

describe('POST /api/leagues/:id/schedule', () => {
  function setupStartSeasonSuccess() {
    const leaguesSelectBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'setup', season_year: 2 },
      error: null,
      count: null,
    });
    const leaguesUpdateBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
    const rostersBuilder = createMockQueryBuilder({
      data: [{ team_id: 'team-1', count: 21 }, { team_id: 'team-2', count: 21 }],
      error: null,
      count: null,
    });

    let leagueCallCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') {
        leagueCallCount++;
        // First call is SELECT, subsequent calls are UPDATE
        return leagueCallCount === 1 ? leaguesSelectBuilder : leaguesUpdateBuilder;
      }
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder({ data: null, error: null, count: null });
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);
    return { mockFrom, leaguesSelectBuilder, leaguesUpdateBuilder };
  }

  it('returns 403 when user is not commissioner', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'other-user', status: 'setup', season_year: 2 },
      error: null,
      count: null,
    });
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({ error: { code: 'NOT_COMMISSIONER' } });
  });

  it('returns 400 when canStartSeason returns false (wrong status)', async () => {
    mockCanStartSeason.mockReturnValue({ canStart: false, reason: 'League must be in setup status' });
    setupStartSeasonSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: { code: 'SEASON_START_BLOCKED' } });
  });

  it('returns 400 when canStartSeason returns false (season_year=1)', async () => {
    mockCanStartSeason.mockReturnValue({ canStart: false, reason: 'First season requires a draft' });
    setupStartSeasonSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: expect.objectContaining({
        code: 'SEASON_START_BLOCKED',
        message: expect.stringContaining('draft'),
      }),
    });
  });

  it('calls generateAndInsertLineups then generateAndInsertSchedule', async () => {
    setupStartSeasonSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(201);
    expect(mockGenerateLineups).toHaveBeenCalledWith(expect.anything(), 'league-1');
    expect(mockGenerateSchedule).toHaveBeenCalledWith(expect.anything(), 'league-1');
  });

  it('updates league status to regular_season with current_day=1', async () => {
    const { leaguesUpdateBuilder: leagueUpdateBuilder } = setupStartSeasonSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(201);
    expect(leagueUpdateBuilder.update).toHaveBeenCalledWith({
      status: 'regular_season',
      current_day: 1,
    });
  });

  it('returns 201 with totalDays and totalGames', async () => {
    setupStartSeasonSuccess();

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, headers: { authorization: 'Bearer token' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(201);
    expect(res._body.data).toMatchObject({
      totalDays: 162,
      totalGames: 2430,
    });
  });
});
