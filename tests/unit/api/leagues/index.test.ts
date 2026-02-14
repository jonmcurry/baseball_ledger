/**
 * Tests for POST /api/leagues -- Create a new league
 *
 * REQ-DATA-002: League creation generates player pool from CSVs.
 */

const { mockLoadCsvFiles, mockRunCsvPipeline } = vi.hoisted(() => ({
  mockLoadCsvFiles: vi.fn(),
  mockRunCsvPipeline: vi.fn(),
}));

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../api/_lib/load-csvs', () => ({ loadCsvFiles: mockLoadCsvFiles }));
vi.mock('@lib/csv/load-pipeline', () => ({ runCsvPipeline: mockRunCsvPipeline }));

import handler from '../../../../api/leagues/index';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../api/_lib/auth';
import { createMockRequest, createMockResponse, createMockQueryBuilder } from '../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('POST /api/leagues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });

    // Default pipeline mocks
    mockLoadCsvFiles.mockReturnValue({
      peopleCsv: 'mock-people',
      battingCsv: 'mock-batting',
      pitchingCsv: 'mock-pitching',
      fieldingCsv: 'mock-fielding',
    });
    mockRunCsvPipeline.mockReturnValue({
      pool: [],
      leagueAverages: { BA: 0.260, hrPerPA: 0.03, bbPerPA: 0.08, soPerPA: 0.17, ERA: 3.80, k9: 7.0, bb9: 3.0, ISO: 0.150, BABIP: 0.300 },
      playerNameCache: {},
      cards: [],
      errors: [],
    });
  });

  it('returns 405 for non-POST methods', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(405);
  });

  it('returns 401 when requireAuth rejects', async () => {
    mockRequireAuth.mockRejectedValue({
      category: 'AUTHENTICATION',
      code: 'MISSING_TOKEN',
      message: 'Missing token',
    });

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 18 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(401);
    expect(res._body).toMatchObject({
      error: { code: 'MISSING_TOKEN' },
    });
  });

  it('returns 400 for missing name', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { teamCount: 18 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'INVALID_REQUEST_BODY' },
    });
  });

  it('returns 400 for invalid teamCount', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 8 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'INVALID_REQUEST_BODY' },
    });
  });

  it('returns 400 for teamCount below minimum', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 0 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
  });

  it('returns 201 with league data on success', async () => {
    const leagueRow = {
      id: 'league-1',
      name: 'Test League',
      commissioner_id: 'user-123',
      invite_key: 'ABCD1234',
      team_count: 18,
      year_range_start: 1901,
      year_range_end: 2025,
      injuries_enabled: false,
      created_at: '2025-01-01T00:00:00Z',
    };

    const builder = createMockQueryBuilder({
      data: leagueRow,
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 18 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(201);
    expect(res._body).toMatchObject({
      data: {
        id: 'league-1',
        name: 'Test League',
        commissionerId: 'user-123',
        teamCount: 18,
      },
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
  });

  it('returns 500 when Supabase insert fails', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Insert failed', code: 'PGRST001' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 18 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({
      error: { code: 'INSERT_FAILED' },
    });
  });

  it('passes correct insert payload to Supabase', async () => {
    const leagueRow = {
      id: 'league-2',
      name: 'My League',
      commissioner_id: 'user-123',
      invite_key: 'XYZ12345',
      team_count: 18,
      year_range_start: 1950,
      year_range_end: 2000,
      injuries_enabled: true,
      created_at: '2025-01-01T00:00:00Z',
    };

    const builder = createMockQueryBuilder({
      data: leagueRow,
      error: null,
      count: null,
    });
    const mockFrom = vi.fn().mockReturnValue(builder);
    mockCreateServerClient.mockReturnValue({
      from: mockFrom,
    } as never);

    const req = createMockRequest({
      method: 'POST',
      body: {
        name: 'My League',
        teamCount: 18,
        yearRangeStart: 1950,
        yearRangeEnd: 2000,
        injuriesEnabled: true,
        negroLeaguesEnabled: true,
      },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(mockFrom).toHaveBeenCalledWith('leagues');
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My League',
        commissioner_id: 'user-123',
        team_count: 18,
        year_range_start: 1950,
        year_range_end: 2000,
        injuries_enabled: true,
      }),
    );
  });

  // ---- Phase 25: Player pool generation tests ----

  it('calls runCsvPipeline with year range after league insert', async () => {
    const leagueRow = {
      id: 'league-3',
      name: 'Pool League',
      commissioner_id: 'user-123',
      invite_key: 'POOL1234',
      team_count: 18,
      year_range_start: 1960,
      year_range_end: 1970,
      injuries_enabled: false,
      created_at: '2025-01-01T00:00:00Z',
    };

    const leaguesBuilder = createMockQueryBuilder({ data: leagueRow, error: null, count: null });
    const poolBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
    const updateBuilder = createMockQueryBuilder({ data: null, error: null, count: null });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'player_pool') return poolBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Pool League', teamCount: 18, yearRangeStart: 1960, yearRangeEnd: 1970 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(mockRunCsvPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        yearRangeStart: 1960,
        yearRangeEnd: 1970,
      }),
    );
  });

  it('inserts player pool records into player_pool table', async () => {
    const mockCard = {
      playerId: 'ruthba01',
      nameFirst: 'Babe',
      nameLast: 'Ruth',
      seasonYear: 1927,
      card: new Array(35).fill(0),
    };
    mockRunCsvPipeline.mockReturnValue({
      pool: [{ playerID: 'ruthba01', seasonYear: 1927 }],
      leagueAverages: { BA: 0.260 },
      playerNameCache: { ruthba01: 'Babe Ruth' },
      cards: [mockCard],
      errors: [],
    });

    const leagueRow = {
      id: 'league-4',
      name: 'Ruth League',
      commissioner_id: 'user-123',
      invite_key: 'RUTH1234',
      team_count: 18,
      year_range_start: 1927,
      year_range_end: 1927,
      injuries_enabled: false,
      created_at: '2025-01-01T00:00:00Z',
    };

    const leaguesBuilder = createMockQueryBuilder({ data: leagueRow, error: null, count: null });
    const poolBuilder = createMockQueryBuilder({ data: null, error: null, count: null });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'player_pool') return poolBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Ruth League', teamCount: 18, yearRangeStart: 1927, yearRangeEnd: 1927 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(mockFrom).toHaveBeenCalledWith('player_pool');
    expect(poolBuilder.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          league_id: 'league-4',
          player_id: 'ruthba01',
          season_year: 1927,
        }),
      ]),
    );
  });

  it('updates league with player_name_cache', async () => {
    mockRunCsvPipeline.mockReturnValue({
      pool: [],
      leagueAverages: { BA: 0.260 },
      playerNameCache: { ruthba01: 'Babe Ruth' },
      cards: [],
      errors: [],
    });

    const leagueRow = {
      id: 'league-5',
      name: 'Cache League',
      commissioner_id: 'user-123',
      invite_key: 'CACHE123',
      team_count: 18,
      year_range_start: 1927,
      year_range_end: 1927,
      injuries_enabled: false,
      created_at: '2025-01-01T00:00:00Z',
    };

    const leaguesBuilder = createMockQueryBuilder({ data: leagueRow, error: null, count: null });
    const poolBuilder = createMockQueryBuilder({ data: null, error: null, count: null });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'player_pool') return poolBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Cache League', teamCount: 18, yearRangeStart: 1927, yearRangeEnd: 1927 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    // Verify update was called on leagues table with player_name_cache
    expect(leaguesBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        player_name_cache: { ruthba01: 'Babe Ruth' },
      }),
    );
  });

  it('still returns 201 when CSV pipeline fails', async () => {
    mockLoadCsvFiles.mockImplementation(() => {
      throw { category: 'DATA', code: 'CSV_LOAD_FAILED', message: 'File not found' };
    });

    const leagueRow = {
      id: 'league-6',
      name: 'No CSV League',
      commissioner_id: 'user-123',
      invite_key: 'NOCSV123',
      team_count: 18,
      year_range_start: 1901,
      year_range_end: 2025,
      injuries_enabled: false,
      created_at: '2025-01-01T00:00:00Z',
    };

    const builder = createMockQueryBuilder({ data: leagueRow, error: null, count: null });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'No CSV League', teamCount: 18 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    // League creation succeeds even if CSV pipeline fails
    expect(res._status).toBe(201);
  });

  it('passes CSV file contents to runCsvPipeline', async () => {
    mockLoadCsvFiles.mockReturnValue({
      peopleCsv: 'people-csv-content',
      battingCsv: 'batting-csv-content',
      pitchingCsv: 'pitching-csv-content',
      fieldingCsv: 'fielding-csv-content',
    });

    const leagueRow = {
      id: 'league-7',
      name: 'CSV League',
      commissioner_id: 'user-123',
      invite_key: 'CSV12345',
      team_count: 18,
      year_range_start: 1971,
      year_range_end: 1971,
      injuries_enabled: false,
      created_at: '2025-01-01T00:00:00Z',
    };

    const builder = createMockQueryBuilder({ data: leagueRow, error: null, count: null });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'CSV League', teamCount: 18, yearRangeStart: 1971, yearRangeEnd: 1971 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(mockRunCsvPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        peopleCsv: 'people-csv-content',
        battingCsv: 'batting-csv-content',
        pitchingCsv: 'pitching-csv-content',
        fieldingCsv: 'fielding-csv-content',
      }),
    );
  });
});
