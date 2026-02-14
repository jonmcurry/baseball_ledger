/**
 * Tests for GET /api/leagues/:id, POST /api/leagues/:id (join), and DELETE /api/leagues/:id
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/index';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import { createMockRequest, createMockResponse, createMockQueryBuilder } from '../../../../fixtures/mock-supabase';
import type { MockQueryBuilder } from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

/**
 * Add the `.is()` method to a mock query builder.
 * The join handler uses `.is('owner_id', null)` which is not on the default builder.
 */
function addIsMethod(builder: MockQueryBuilder): MockQueryBuilder & { is: ReturnType<typeof vi.fn> } {
  const extended = builder as MockQueryBuilder & { is: ReturnType<typeof vi.fn> };
  extended.is = vi.fn().mockReturnValue(builder);
  return extended;
}

// ---------- GET ----------

describe('GET /api/leagues/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  });

  it('returns 405 for PUT method', async () => {
    const req = createMockRequest({ method: 'PUT', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(405);
  });

  it('returns 405 for PATCH method', async () => {
    const req = createMockRequest({ method: 'PATCH', query: { id: 'league-1' } });
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

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(401);
  });

  it('returns 200 with league data when user is commissioner', async () => {
    const leagueRow = {
      id: 'league-1',
      name: 'Test League',
      commissioner_id: 'user-123',
      invite_key: 'ABCD1234',
      team_count: 4,
      year_range_start: 1901,
      year_range_end: 2025,
      injuries_enabled: false,
      created_at: '2025-01-01T00:00:00Z',
    };

    const leaguesBuilder = createMockQueryBuilder({
      data: leagueRow,
      error: null,
      count: null,
    });

    const teamsBuilder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      return createMockQueryBuilder();
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: {
        id: 'league-1',
        name: 'Test League',
        commissionerId: 'user-123',
      },
    });
  });

  it('returns 200 when user is a team owner', async () => {
    const leagueRow = {
      id: 'league-1',
      name: 'Test League',
      commissioner_id: 'other-user',
      invite_key: 'ABCD1234',
      team_count: 4,
      year_range_start: 1901,
      year_range_end: 2025,
      injuries_enabled: false,
    };

    const leaguesBuilder = createMockQueryBuilder({
      data: leagueRow,
      error: null,
      count: null,
    });

    const teamsBuilder = createMockQueryBuilder({
      data: [{ owner_id: 'user-123' }],
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      return createMockQueryBuilder();
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: expect.objectContaining({ id: 'league-1' }),
    });
  });

  it('returns 404 when league not found', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });

    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(leaguesBuilder),
    } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'nonexistent' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      error: { code: 'LEAGUE_NOT_FOUND' },
    });
  });

  it('returns 403 when user is not a member', async () => {
    const leagueRow = {
      id: 'league-1',
      name: 'Test League',
      commissioner_id: 'other-user',
      invite_key: 'ABCD1234',
      team_count: 4,
    };

    const leaguesBuilder = createMockQueryBuilder({
      data: leagueRow,
      error: null,
      count: null,
    });

    const teamsBuilder = createMockQueryBuilder({
      data: [{ owner_id: 'some-other-user' }],
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      return createMockQueryBuilder();
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({
      error: { code: 'NOT_LEAGUE_MEMBER' },
    });
  });
});

// ---------- POST (Join) ----------

describe('POST /api/leagues/:id (join)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  });

  it('returns 401 when requireAuth rejects', async () => {
    mockRequireAuth.mockRejectedValue({
      category: 'AUTHENTICATION',
      code: 'MISSING_TOKEN',
      message: 'Missing token',
    });

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { inviteKey: 'ABCD1234' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(401);
  });

  it('returns 400 for missing inviteKey in body', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: {},
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'INVALID_REQUEST_BODY' },
    });
  });

  it('returns 404 when league not found', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });

    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(leaguesBuilder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'nonexistent' },
      body: { inviteKey: 'ABCD1234' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      error: { code: 'LEAGUE_NOT_FOUND' },
    });
  });

  it('returns 400 when invite key does not match', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: {
        id: 'league-1',
        name: 'Test League',
        invite_key: 'CORRECT1',
        commissioner_id: 'other-user',
      },
      error: null,
      count: null,
    });

    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(leaguesBuilder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { inviteKey: 'WRONGKEY' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'INVALID_INVITE_KEY' },
    });
  });

  it('returns 409 when user is already a member', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: {
        id: 'league-1',
        name: 'Test League',
        invite_key: 'ABCD1234',
        commissioner_id: 'other-user',
      },
      error: null,
      count: null,
    });

    const existingTeamsBuilder = createMockQueryBuilder({
      data: [{ id: 'team-1' }],
      error: null,
      count: null,
    });

    let teamsCallCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') {
        teamsCallCount++;
        if (teamsCallCount === 1) return existingTeamsBuilder;
      }
      return createMockQueryBuilder();
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { inviteKey: 'ABCD1234' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(409);
    expect(res._body).toMatchObject({
      error: { code: 'ALREADY_MEMBER' },
    });
  });

  it('returns 409 when no available teams', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: {
        id: 'league-1',
        name: 'Test League',
        invite_key: 'ABCD1234',
        commissioner_id: 'other-user',
      },
      error: null,
      count: null,
    });

    const existingTeamsBuilder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });

    const unownedTeamBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
      count: null,
    });
    addIsMethod(unownedTeamBuilder);

    let teamsCallCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') {
        teamsCallCount++;
        if (teamsCallCount === 1) return existingTeamsBuilder;
        if (teamsCallCount === 2) return unownedTeamBuilder;
      }
      return createMockQueryBuilder();
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { inviteKey: 'ABCD1234' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(409);
    expect(res._body).toMatchObject({
      error: { code: 'NO_AVAILABLE_TEAMS' },
    });
  });

  it('returns 200 with teamId and teamName on success', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: {
        id: 'league-1',
        name: 'Test League',
        invite_key: 'ABCD1234',
        commissioner_id: 'other-user',
      },
      error: null,
      count: null,
    });

    const existingTeamsBuilder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });

    const unownedTeamBuilder = createMockQueryBuilder({
      data: { id: 'team-5', name: 'Unowned Team', owner_id: null, league_id: 'league-1' },
      error: null,
      count: null,
    });
    addIsMethod(unownedTeamBuilder);

    const updateBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: null,
    });

    let teamsCallCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') {
        teamsCallCount++;
        if (teamsCallCount === 1) return existingTeamsBuilder;
        if (teamsCallCount === 2) return unownedTeamBuilder;
        if (teamsCallCount === 3) return updateBuilder;
      }
      return createMockQueryBuilder();
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { inviteKey: 'ABCD1234' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: {
        teamId: 'team-5',
        teamName: 'Unowned Team',
      },
    });
  });

  it('returns 500 when team update fails', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: {
        id: 'league-1',
        name: 'Test League',
        invite_key: 'ABCD1234',
        commissioner_id: 'other-user',
      },
      error: null,
      count: null,
    });

    const existingTeamsBuilder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });

    const unownedTeamBuilder = createMockQueryBuilder({
      data: { id: 'team-5', name: 'Unowned Team', owner_id: null, league_id: 'league-1' },
      error: null,
      count: null,
    });
    addIsMethod(unownedTeamBuilder);

    const updateBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Update failed', code: 'PGRST001' },
      count: null,
    });

    let teamsCallCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') {
        teamsCallCount++;
        if (teamsCallCount === 1) return existingTeamsBuilder;
        if (teamsCallCount === 2) return unownedTeamBuilder;
        if (teamsCallCount === 3) return updateBuilder;
      }
      return createMockQueryBuilder();
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { inviteKey: 'ABCD1234' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({
      error: { code: 'JOIN_FAILED' },
    });
  });
});

// ---------- DELETE ----------

describe('DELETE /api/leagues/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  });

  it('returns 204 when commissioner deletes league', async () => {
    const selectBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123' },
      error: null,
      count: null,
    });

    // teams SELECT returns team IDs for roster cleanup
    const teamsSelectBuilder = createMockQueryBuilder({
      data: [{ id: 'team-1' }],
      error: null,
      count: null,
    });

    const deleteBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: null,
    });

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectBuilder;  // leagues SELECT
      if (callCount === 2) return teamsSelectBuilder; // teams SELECT for IDs
      return deleteBuilder; // all deletes
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'DELETE', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(204);
    // 1 leagues SELECT + 1 teams SELECT + 1 rosters (1 team) + 7 child tables + 1 teams + 1 leagues = 12
    expect(mockFrom).toHaveBeenCalledTimes(12);
    expect(mockFrom).toHaveBeenCalledWith('leagues');
    expect(mockFrom).toHaveBeenCalledWith('teams');
    expect(mockFrom).toHaveBeenCalledWith('rosters');
  });

  it('returns 403 when non-commissioner tries to delete', async () => {
    const selectBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'other-user' },
      error: null,
      count: null,
    });

    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(selectBuilder),
    } as never);

    const req = createMockRequest({ method: 'DELETE', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({
      error: { code: 'NOT_COMMISSIONER' },
    });
  });

  it('returns 404 when league not found on delete', async () => {
    const selectBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });

    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(selectBuilder),
    } as never);

    const req = createMockRequest({ method: 'DELETE', query: { id: 'nonexistent' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      error: { code: 'LEAGUE_NOT_FOUND' },
    });
  });

  it('returns 500 when delete operation fails', async () => {
    const selectBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123' },
      error: null,
      count: null,
    });

    const deleteBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Delete failed', code: 'PGRST001' },
      count: null,
    });

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectBuilder;
      return deleteBuilder;
    });

    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'DELETE', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({
      error: { code: 'DELETE_FAILED' },
    });
  });
});
