/**
 * Tests for GET/PATCH/POST /api/leagues/:id/teams
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../../api/_lib/validate', () => ({
  validateBody: vi.fn(),
}));
vi.mock('@lib/draft/trade-validator', () => ({
  validateTradeRosters: vi.fn(),
}));

import handler from '../../../../../api/leagues/[id]/teams';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import { validateBody } from '../../../../../api/_lib/validate';
import { validateTradeRosters } from '@lib/draft/trade-validator';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);
const mockValidateTradeRosters = vi.mocked(validateTradeRosters);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  mockValidateBody.mockImplementation((req) => req.body as any);
});

// ---------- General ----------

describe('GET/PATCH/POST /api/leagues/:id/teams (general)', () => {
  it('returns 405 for DELETE', async () => {
    const req = createMockRequest({ method: 'DELETE' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
  });
});

// ---------- GET: List teams ----------

describe('GET /api/leagues/:id/teams', () => {
  it('returns 200 with teams array on success', async () => {
    const teamsData = [
      {
        id: 'team-1',
        name: 'Yankees',
        city: 'New York',
        league_id: 'league-1',
        owner_id: 'user-123',
        manager_profile: 'balanced',
        league_division: 'American',
        division: 'East',
        wins: 90,
        losses: 72,
        runs_scored: 700,
        runs_allowed: 650,
      },
      {
        id: 'team-2',
        name: 'Red Sox',
        city: 'Boston',
        league_id: 'league-1',
        owner_id: 'user-456',
        manager_profile: 'aggressive',
        league_division: 'American',
        division: 'East',
        wins: 85,
        losses: 77,
        runs_scored: 680,
        runs_allowed: 670,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'team-1', name: 'Yankees', leagueDivision: 'American' }),
        expect.objectContaining({ id: 'team-2', name: 'Red Sox', leagueDivision: 'American' }),
      ]),
    );
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('leagueId');
    expect(res._body.data[0]).toHaveProperty('ownerId');
    expect(res._body.data[0]).toHaveProperty('managerProfile');
    expect(res._body.data[0]).not.toHaveProperty('league_id');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('handles query error', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Connection failed', code: 'PGRST000' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(500);
    expect(res._body.error).toHaveProperty('code', 'QUERY_FAILED');
  });
});

// ---------- GET: Roster ----------

describe('GET /api/leagues/:id/teams?tid=X&include=roster', () => {
  it('returns 200 with roster array on success', async () => {
    const rosterData = [
      {
        id: 'roster-1',
        team_id: 'team-1',
        player_id: 'player-1',
        lineup_order: 1,
        position: 'SS',
        is_active: true,
      },
      {
        id: 'roster-2',
        team_id: 'team-1',
        player_id: 'player-2',
        lineup_order: 2,
        position: 'CF',
        is_active: true,
      },
    ];

    const builder = createMockQueryBuilder({ data: rosterData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', tid: 'team-1', include: 'roster' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('teamId', 'team-1');
    expect(res._body.data[0]).toHaveProperty('playerId', 'player-1');
    expect(res._body.data[0]).toHaveProperty('lineupOrder', 1);
    expect(res._body.data[0]).toHaveProperty('isActive', true);
    expect(res._body.data[0]).not.toHaveProperty('team_id');
    expect(res._body.data[0]).not.toHaveProperty('lineup_order');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('returns empty array when no roster entries', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', tid: 'team-1', include: 'roster' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toEqual([]);
    expect(res._body.meta).toHaveProperty('requestId');
  });
});

// ---------- PATCH: Update team ----------

describe('PATCH /api/leagues/:id/teams?tid=X', () => {
  const existingTeam = {
    id: 'team-1',
    name: 'Yankees',
    city: 'New York',
    league_id: 'league-1',
    owner_id: 'user-123',
    manager_profile: 'balanced',
    league_division: 'American',
    division: 'East',
    wins: 90,
    losses: 72,
    runs_scored: 700,
    runs_allowed: 650,
    leagues: { commissioner_id: 'commissioner-1' },
  };

  it('returns 400 for invalid body', async () => {
    mockValidateBody.mockImplementation(() => {
      throw {
        category: 'VALIDATION',
        code: 'INVALID_REQUEST_BODY',
        message: 'Request body validation failed',
        details: [{ field: 'name', message: 'String must contain at least 1 character(s)' }],
      };
    });

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1' },
      body: { name: '' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('returns 404 when team not found', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'nonexistent-team' },
      body: { name: 'New Name' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body.error).toHaveProperty('code', 'TEAM_NOT_FOUND');
  });

  it('returns 403 when not owner or commissioner', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'other-user', email: 'other@example.com' });

    const builder = createMockQueryBuilder({
      data: existingTeam,
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1' },
      body: { name: 'New Name' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body.error).toHaveProperty('code', 'NOT_TEAM_OWNER');
  });

  it('returns 200 with updated team on success (owner)', async () => {
    const updatedTeam = {
      ...existingTeam,
      name: 'Bronx Bombers',
      leagues: undefined,
    };

    const singleFn = vi.fn()
      .mockResolvedValueOnce({ data: existingTeam, error: null, count: null })
      .mockResolvedValueOnce({ data: updatedTeam, error: null, count: null });

    const builder = createMockQueryBuilder({ data: existingTeam, error: null, count: null });
    builder.single = singleFn;

    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1' },
      body: { name: 'Bronx Bombers' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toEqual(
      expect.objectContaining({ name: 'Bronx Bombers' }),
    );
    // Verify camelCase transformation
    expect(res._body.data).toHaveProperty('managerProfile');
    expect(res._body.data).not.toHaveProperty('manager_profile');
    expect(res._body.meta).toHaveProperty('requestId');
  });
});

// ---------- PATCH: Update lineup ----------

describe('PATCH /api/leagues/:id/teams?tid=X&include=roster (lineup update)', () => {
  const existingTeamWithLeagues = {
    id: 'team-1',
    name: 'Yankees',
    city: 'New York',
    league_id: 'league-1',
    owner_id: 'user-123',
    manager_profile: 'balanced',
    leagues: { commissioner_id: 'commissioner-1' },
  };

  const rosterRows = [
    { id: 'roster-1', team_id: 'team-1', player_id: 'p-1', season_year: 1927, player_card: { power: 21 }, roster_slot: 'starter', lineup_order: 1, lineup_position: 'SS' },
    { id: 'roster-2', team_id: 'team-1', player_id: 'p-2', season_year: 1927, player_card: { power: 18 }, roster_slot: 'starter', lineup_order: 2, lineup_position: 'CF' },
  ];

  const validLineupBody = {
    updates: [
      { rosterId: 'roster-1', lineupOrder: 3, lineupPosition: 'SS', rosterSlot: 'starter' },
      { rosterId: 'roster-2', lineupOrder: 1, lineupPosition: 'CF', rosterSlot: 'starter' },
    ],
  };

  function setupLineupMocks(opts: {
    teamData?: Record<string, unknown> | null;
    teamError?: { message: string; code: string } | null;
    rosterData?: Record<string, unknown>[];
    rosterSelectData?: Record<string, unknown>[];
    updateError?: { message: string } | null;
  } = {}) {
    const teamData = opts.teamData !== undefined ? opts.teamData : existingTeamWithLeagues;
    const teamError = opts.teamError ?? (teamData ? null : { message: 'Not found', code: 'PGRST116' });

    const teamsBuilder = createMockQueryBuilder({
      data: teamData,
      error: teamError,
      count: null,
    });

    // Rosters: first call = select for ownership check, second call = update loop, last call = re-fetch
    const rostersBuilder = createMockQueryBuilder({
      data: opts.rosterData ?? rosterRows,
      error: null,
      count: null,
    });

    // Update call on rosters (chained .update().eq())
    const updateBuilder = createMockQueryBuilder({
      data: null,
      error: opts.updateError ?? null,
      count: null,
    });

    let rostersCallCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') {
        rostersCallCount++;
        // First call: select roster IDs for ownership verification
        // Middle calls: update operations
        // Last call: re-fetch full roster
        if (rostersCallCount === 1) return rostersBuilder;
        // The final re-fetch call
        const refetchData = opts.rosterSelectData ?? rosterRows;
        const refetchBuilder = createMockQueryBuilder({
          data: refetchData,
          error: null,
          count: null,
        });
        // For update calls, also return a builder that has update
        updateBuilder.select = vi.fn().mockReturnValue(updateBuilder);
        return { ...rostersBuilder, update: vi.fn().mockReturnValue(updateBuilder), select: vi.fn().mockReturnValue(refetchBuilder) };
      }
      return createMockQueryBuilder();
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);
    return { mockFrom, teamsBuilder, rostersBuilder };
  }

  it('returns 200 with updated roster on successful lineup save', async () => {
    setupLineupMocks();

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1', include: 'roster' },
      body: validLineupBody,
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.data)).toBe(true);
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('rejects invalid rosterSlot value', async () => {
    mockValidateBody.mockImplementation(() => {
      throw {
        category: 'VALIDATION',
        code: 'INVALID_REQUEST_BODY',
        message: 'Request body validation failed',
        details: [{ field: 'updates.0.rosterSlot', message: 'Invalid enum value' }],
      };
    });

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1', include: 'roster' },
      body: {
        updates: [
          { rosterId: 'roster-1', lineupOrder: 1, lineupPosition: 'SS', rosterSlot: 'invalid' },
        ],
      },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('rejects lineupOrder out of range', async () => {
    mockValidateBody.mockImplementation(() => {
      throw {
        category: 'VALIDATION',
        code: 'INVALID_REQUEST_BODY',
        message: 'Request body validation failed',
        details: [{ field: 'updates.0.lineupOrder', message: 'Number must be less than or equal to 9' }],
      };
    });

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1', include: 'roster' },
      body: {
        updates: [
          { rosterId: 'roster-1', lineupOrder: 10, lineupPosition: 'SS', rosterSlot: 'starter' },
        ],
      },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('rejects invalid lineupPosition', async () => {
    mockValidateBody.mockImplementation(() => {
      throw {
        category: 'VALIDATION',
        code: 'INVALID_REQUEST_BODY',
        message: 'Request body validation failed',
        details: [{ field: 'updates.0.lineupPosition', message: 'Invalid enum value' }],
      };
    });

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1', include: 'roster' },
      body: {
        updates: [
          { rosterId: 'roster-1', lineupOrder: 1, lineupPosition: 'XX', rosterSlot: 'starter' },
        ],
      },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('returns 403 if user is not team owner or commissioner', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'other-user', email: 'other@example.com' });
    setupLineupMocks();

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1', include: 'roster' },
      body: validLineupBody,
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body.error).toHaveProperty('code', 'NOT_TEAM_OWNER');
  });

  it('returns 404 if team not found', async () => {
    setupLineupMocks({ teamData: null });

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1', include: 'roster' },
      body: validLineupBody,
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body.error).toHaveProperty('code', 'TEAM_NOT_FOUND');
  });

  it('returns 400 when roster ID does not belong to team', async () => {
    // Roster select returns only roster-1, but we try to update roster-999
    setupLineupMocks({
      rosterData: [{ id: 'roster-1', team_id: 'team-1' }],
    });

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1', include: 'roster' },
      body: {
        updates: [
          { rosterId: 'roster-999', lineupOrder: 1, lineupPosition: 'SS', rosterSlot: 'starter' },
        ],
      },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_ROSTER_ID');
  });

  it('handles empty updates array and returns current roster', async () => {
    setupLineupMocks();

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1', include: 'roster' },
      body: { updates: [] },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.data)).toBe(true);
  });
});

// ---------- POST: Roster transactions ----------

describe('POST /api/leagues/:id/teams (transactions)', () => {
  it('returns 400 for invalid body (missing type)', async () => {
    mockValidateBody.mockImplementation(() => {
      throw {
        category: 'VALIDATION',
        code: 'INVALID_REQUEST_BODY',
        message: 'Request body validation failed',
        details: [{ field: 'type', message: 'Required' }],
      };
    });

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { teamId: '550e8400-e29b-41d4-a716-446655440000' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'INVALID_REQUEST_BODY' },
    });
  });

  it('returns 404 when team not found', async () => {
    const teamsBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });
    const rostersBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: {
        type: 'add',
        teamId: '550e8400-e29b-41d4-a716-446655440000',
        playersToAdd: [],
        playersToDrop: [],
      },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      error: { code: 'TEAM_NOT_FOUND' },
    });
  });

  it('returns 400 when team does not belong to league', async () => {
    const teamsBuilder = createMockQueryBuilder({
      data: { id: '550e8400-e29b-41d4-a716-446655440000', owner_id: 'user-123', league_id: 'other-league' },
      error: null,
      count: null,
    });
    const rostersBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: {
        type: 'add',
        teamId: '550e8400-e29b-41d4-a716-446655440000',
        playersToAdd: [],
        playersToDrop: [],
      },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'WRONG_LEAGUE' },
    });
  });

  it('returns 403 when user is not team owner', async () => {
    const teamsBuilder = createMockQueryBuilder({
      data: { id: '550e8400-e29b-41d4-a716-446655440000', owner_id: 'other-user', league_id: 'league-1' },
      error: null,
      count: null,
    });
    const rostersBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: {
        type: 'add',
        teamId: '550e8400-e29b-41d4-a716-446655440000',
        playersToAdd: [],
        playersToDrop: [],
      },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({
      error: { code: 'NOT_TEAM_OWNER' },
    });
  });

  it('returns 201 with transaction result on success (add players)', async () => {
    const teamsBuilder = createMockQueryBuilder({
      data: { id: '550e8400-e29b-41d4-a716-446655440000', owner_id: 'user-123', league_id: 'league-1' },
      error: null,
      count: null,
    });
    const rostersBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: {
        type: 'add',
        teamId: '550e8400-e29b-41d4-a716-446655440000',
        playersToAdd: [
          {
            playerId: 'player-1',
            playerName: 'Babe Ruth',
            seasonYear: 1927,
            playerCard: { power: 21 },
          },
        ],
        playersToDrop: [],
      },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(201);
    expect(res._body).toMatchObject({
      data: {
        type: 'add',
        teamId: '550e8400-e29b-41d4-a716-446655440000',
        playersAdded: [{ playerId: 'player-1', playerName: 'Babe Ruth' }],
      },
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
  });

  // Trade-specific tests (REQ-RST-005, REQ-RST-006)

  describe('trade type', () => {
    const TEAM_A_ID = '550e8400-e29b-41d4-a716-446655440000';
    const TEAM_B_ID = '660e8400-e29b-41d4-a716-446655440001';

    function setupTradeEnv(opts: {
      targetTeamData?: Record<string, unknown> | null;
      validationResult?: { valid: boolean; errors: string[] };
    } = {}) {
      const teamsBuilder = createMockQueryBuilder();
      teamsBuilder.single
        .mockResolvedValueOnce({
          data: { id: TEAM_A_ID, owner_id: 'user-123', league_id: 'league-1' },
          error: null,
          count: null,
        })
        .mockResolvedValueOnce({
          data: opts.targetTeamData !== undefined ? opts.targetTeamData : { id: TEAM_B_ID, owner_id: 'user-456', league_id: 'league-1' },
          error: opts.targetTeamData === null ? { message: 'Not found', code: 'PGRST116' } : null,
          count: null,
        });

      const rostersBuilder = createMockQueryBuilder({ data: [], error: null, count: null });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'teams') return teamsBuilder;
        if (table === 'rosters') return rostersBuilder;
        return createMockQueryBuilder();
      });
      mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

      mockValidateTradeRosters.mockReturnValue(
        opts.validationResult ?? { valid: true, errors: [] },
      );

      return { rostersBuilder, mockFrom };
    }

    it('returns 201 for valid trade', async () => {
      setupTradeEnv();

      const req = createMockRequest({
        method: 'POST',
        query: { id: 'league-1' },
        body: {
          type: 'trade',
          teamId: TEAM_A_ID,
          targetTeamId: TEAM_B_ID,
          playersFromMe: ['p-1'],
          playersFromThem: ['p-2'],
        },
        headers: { authorization: 'Bearer token' },
      });
      const res = createMockResponse();

      await handler(req as any, res as any);

      expect(res._status).toBe(201);
      expect(res._body).toMatchObject({
        data: {
          type: 'trade',
          teamId: TEAM_A_ID,
          targetTeamId: TEAM_B_ID,
        },
      });
    });

    it('returns 400 on roster composition violation', async () => {
      setupTradeEnv({
        validationResult: {
          valid: false,
          errors: ['Team A would be missing starter: C'],
        },
      });

      const req = createMockRequest({
        method: 'POST',
        query: { id: 'league-1' },
        body: {
          type: 'trade',
          teamId: TEAM_A_ID,
          targetTeamId: TEAM_B_ID,
          playersFromMe: ['p-1'],
          playersFromThem: ['p-2'],
        },
        headers: { authorization: 'Bearer token' },
      });
      const res = createMockResponse();

      await handler(req as any, res as any);

      expect(res._status).toBe(400);
      expect(res._body).toMatchObject({
        error: { code: 'TRADE_COMPOSITION_VIOLATION' },
      });
    });

    it('returns 404 when target team not found', async () => {
      setupTradeEnv({ targetTeamData: null });

      const req = createMockRequest({
        method: 'POST',
        query: { id: 'league-1' },
        body: {
          type: 'trade',
          teamId: TEAM_A_ID,
          targetTeamId: TEAM_B_ID,
          playersFromMe: ['p-1'],
          playersFromThem: ['p-2'],
        },
        headers: { authorization: 'Bearer token' },
      });
      const res = createMockResponse();

      await handler(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._body).toMatchObject({
        error: { code: 'TARGET_TEAM_NOT_FOUND' },
      });
    });

    it('returns 400 when trade-specific fields are missing', async () => {
      const teamsBuilder = createMockQueryBuilder({
        data: { id: TEAM_A_ID, owner_id: 'user-123', league_id: 'league-1' },
        error: null,
        count: null,
      });
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'teams') return teamsBuilder;
        return createMockQueryBuilder();
      });
      mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

      const req = createMockRequest({
        method: 'POST',
        query: { id: 'league-1' },
        body: {
          type: 'trade',
          teamId: TEAM_A_ID,
        },
        headers: { authorization: 'Bearer token' },
      });
      const res = createMockResponse();

      await handler(req as any, res as any);

      expect(res._status).toBe(400);
      expect(res._body).toMatchObject({
        error: { code: 'MISSING_TRADE_FIELDS' },
      });
    });

    it('calls validateTradeRosters with correct arguments', async () => {
      setupTradeEnv();

      const req = createMockRequest({
        method: 'POST',
        query: { id: 'league-1' },
        body: {
          type: 'trade',
          teamId: TEAM_A_ID,
          targetTeamId: TEAM_B_ID,
          playersFromMe: ['p-1', 'p-3'],
          playersFromThem: ['p-2'],
        },
        headers: { authorization: 'Bearer token' },
      });
      const res = createMockResponse();

      await handler(req as any, res as any);

      expect(mockValidateTradeRosters).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        ['p-1', 'p-3'],
        ['p-2'],
      );
    });
  });
});
