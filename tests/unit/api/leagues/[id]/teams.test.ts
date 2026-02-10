/**
 * Tests for GET/PATCH /api/leagues/:id/teams
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/teams';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
});

// ---------- General ----------

describe('GET/PATCH /api/leagues/:id/teams (general)', () => {
  it('returns 405 for POST', async () => {
    const req = createMockRequest({ method: 'POST' });
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
