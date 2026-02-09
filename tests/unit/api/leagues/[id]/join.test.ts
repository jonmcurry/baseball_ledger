/**
 * Tests for POST /api/leagues/:id/join -- Join a league via invite key
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/join';
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

describe('POST /api/leagues/:id/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  });

  it('returns 405 for GET method', async () => {
    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
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
    // Call 1: from('leagues') -> league with correct invite key
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

    // Call 2: from('teams') -> existing team with owner_id matching userId
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
    // Call 1: from('leagues') -> league with correct invite key
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

    // Call 2: from('teams') -> no existing membership (empty array, resolves via thenable)
    const existingTeamsBuilder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });

    // Call 3: from('teams') -> no unowned team found (.single() returns error)
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
    // Call 1: from('leagues') -> league with correct invite key
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

    // Call 2: from('teams') -> no existing membership
    const existingTeamsBuilder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });

    // Call 3: from('teams') -> found unowned team
    const unownedTeamBuilder = createMockQueryBuilder({
      data: { id: 'team-5', name: 'Unowned Team', owner_id: null, league_id: 'league-1' },
      error: null,
      count: null,
    });
    addIsMethod(unownedTeamBuilder);

    // Call 4: from('teams') -> update succeeds
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
    // Call 1: from('leagues') -> league with correct invite key
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

    // Call 2: from('teams') -> no existing membership
    const existingTeamsBuilder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });

    // Call 3: from('teams') -> found unowned team
    const unownedTeamBuilder = createMockQueryBuilder({
      data: { id: 'team-5', name: 'Unowned Team', owner_id: null, league_id: 'league-1' },
      error: null,
      count: null,
    });
    addIsMethod(unownedTeamBuilder);

    // Call 4: from('teams') -> update fails
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
