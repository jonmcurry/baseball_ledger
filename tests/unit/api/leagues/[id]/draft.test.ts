/**
 * Tests for GET/POST /api/leagues/:id/draft
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../../api/_lib/validate', () => ({
  validateBody: vi.fn(),
}));

import handler from '../../../../../api/leagues/[id]/draft';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import { validateBody } from '../../../../../api/_lib/validate';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  mockValidateBody.mockImplementation((req) => req.body as any);
});

// ---------- General ----------

describe('GET/POST /api/leagues/:id/draft (general)', () => {
  it('returns 405 for PUT', async () => {
    const req = createMockRequest({ method: 'PUT' });
    const res = createMockResponse();
    await handler(req as any, res as any);
    expect(res._status).toBe(405);
  });

  it('returns 400 for POST with invalid action', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { action: 'invalid' },
    });
    const res = createMockResponse();
    await handler(req as any, res as any);
    expect(res._status).toBe(400);
    expect((res._body as any).error.code).toBe('INVALID_ACTION');
  });

  it('returns 400 for POST with missing action', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: {},
    });
    const res = createMockResponse();
    await handler(req as any, res as any);
    expect(res._status).toBe(400);
    expect((res._body as any).error.code).toBe('INVALID_ACTION');
  });
});

// ---------- GET: Draft state ----------

describe('GET /api/leagues/:id/draft (state)', () => {
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
      method: 'GET',
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

  it('returns 200 with draft state for drafting league', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting', team_count: 4 },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 'team-1' }, { id: 'team-2' }, { id: 'team-3' }, { id: 'team-4' }],
      error: null,
      count: null,
    });
    const rostersBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: 8,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: {
        leagueId: 'league-1',
        status: 'in_progress',
        currentRound: 3,
        currentPick: 1,
        totalRounds: 21,
        totalPicks: 8,
      },
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
  });

  it('maps setup status to not_started', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'setup', team_count: 4 },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 'team-1' }, { id: 'team-2' }, { id: 'team-3' }, { id: 'team-4' }],
      error: null,
      count: null,
    });
    const rostersBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: 0,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data.status).toBe('not_started');
  });

  it('maps completed status to completed', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'completed', team_count: 4 },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 'team-1' }, { id: 'team-2' }, { id: 'team-3' }, { id: 'team-4' }],
      error: null,
      count: null,
    });
    const rostersBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: 84,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data.status).toBe('completed');
  });
});

// ---------- POST action=start ----------

describe('POST /api/leagues/:id/draft (action=start)', () => {
  it('returns 404 when league not found', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-999' },
      body: { action: 'start' },
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
    const builder = createMockQueryBuilder({
      data: { commissioner_id: 'other-user', status: 'setup' },
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { action: 'start' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({
      error: { code: 'NOT_COMMISSIONER' },
    });
  });

  it('returns 400 when league status is not setup', async () => {
    const builder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'drafting' },
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { action: 'start' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'INVALID_STATUS' },
    });
  });

  it('returns 200 with draft state on success', async () => {
    const builder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'setup' },
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { action: 'start' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: {
        leagueId: 'league-1',
        status: 'in_progress',
        currentRound: 1,
        currentPick: 1,
      },
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
  });
});

// ---------- POST action=pick ----------

const validPickBody = {
  action: 'pick',
  playerId: 'player-1',
  playerName: 'Babe Ruth',
  position: 'RF',
  seasonYear: 1927,
  playerCard: { power: 21, contact: 15 },
};

describe('POST /api/leagues/:id/draft (action=pick)', () => {
  it('returns 400 for invalid body (missing playerId)', async () => {
    mockValidateBody.mockImplementation(() => {
      throw {
        category: 'VALIDATION',
        code: 'INVALID_REQUEST_BODY',
        message: 'Request body validation failed',
        details: [{ field: 'playerId', message: 'Required' }],
      };
    });

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { action: 'pick', playerName: 'Babe Ruth' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

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

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-999' },
      body: validPickBody,
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      error: { code: 'LEAGUE_NOT_FOUND' },
    });
  });

  it('returns 400 when league is not in drafting status', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'setup' },
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
      body: validPickBody,
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'NOT_DRAFTING' },
    });
  });

  it('returns 403 when user has no team in league', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting' },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: validPickBody,
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({
      error: { code: 'NO_TEAM' },
    });
  });

  it('returns 201 with pick result on success', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting' },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: { id: 'team-1' },
      error: null,
      count: null,
    });
    const rostersBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: validPickBody,
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(201);
    expect(res._body).toMatchObject({
      data: {
        teamId: 'team-1',
        playerId: 'player-1',
        playerName: 'Babe Ruth',
        position: 'RF',
      },
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
  });

  it('returns 409 when player already drafted (duplicate key)', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting' },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: { id: 'team-1' },
      error: null,
      count: null,
    });
    const rostersBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'duplicate key value', code: '23505' },
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'rosters') return rostersBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: validPickBody,
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(409);
    expect(res._body).toMatchObject({
      error: { code: 'PLAYER_ALREADY_DRAFTED' },
    });
  });
});
