/**
 * Tests for GET/POST /api/leagues/:id/draft
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../../api/_lib/validate', () => ({
  validateBody: vi.fn(),
}));
vi.mock('../../../../../api/_lib/generate-schedule-rows', () => ({
  generateAndInsertSchedule: vi.fn(),
}));
vi.mock('../../../../../api/_lib/generate-lineup-rows', () => ({
  generateAndInsertLineups: vi.fn(),
}));

import handler from '../../../../../api/leagues/[id]/draft';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import { validateBody } from '../../../../../api/_lib/validate';
import { generateAndInsertSchedule } from '../../../../../api/_lib/generate-schedule-rows';
import { generateAndInsertLineups } from '../../../../../api/_lib/generate-lineup-rows';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);
const mockGenerateSchedule = vi.mocked(generateAndInsertSchedule);
const mockGenerateLineups = vi.mocked(generateAndInsertLineups);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  mockValidateBody.mockImplementation((req) => req.body as any);
  mockGenerateSchedule.mockResolvedValue({ totalDays: 162, totalGames: 1296 });
  mockGenerateLineups.mockResolvedValue({ teamsProcessed: 8, playersUpdated: 168 });
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

  it('returns currentTeamId for drafting league with draft_order', async () => {
    // draft_order = [team-a, team-b, team-c, team-d], 8 picks done
    // round = floor(8/4)+1 = 3, pick = (8%4)+1 = 1
    // Round 3 is odd = forward order, pick 1 = team-a
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting', team_count: 4, draft_order: ['team-a', 'team-b', 'team-c', 'team-d'] },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 'team-a' }, { id: 'team-b' }, { id: 'team-c' }, { id: 'team-d' }],
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
    expect(res._body.data.currentTeamId).toBe('team-a');
  });

  it('returns null currentTeamId when league has no draft_order', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting', team_count: 4, draft_order: null },
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
    expect(res._body.data.currentTeamId).toBeNull();
  });

  it('returns pickTimerSeconds: 60 in GET state response', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting', team_count: 4, draft_order: null },
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
    expect(res._body.data.pickTimerSeconds).toBe(60);
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
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'setup' },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 'team-1' }, { id: 'team-2' }],
      error: null,
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

  it('returns 201 with isComplete field on success', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting', team_count: 4, draft_order: null },
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
    expect(res._body.data).toHaveProperty('isComplete');
  });

  it('returns round and pick in POST pick response', async () => {
    // draft_order = [team-1, team-2], 4 picks done -> round 3, pick 1
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting', team_count: 2, draft_order: ['team-1', 'team-2'] },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: { id: 'team-1' },
      error: null,
      count: null,
    });
    // rosters calls: 1) count for turn validation, 2) insert, 3) count for completion
    const rosterCount4 = createMockQueryBuilder({ data: null, error: null, count: 4 });
    const rosterInsert = createMockQueryBuilder({ data: null, error: null, count: null });
    const rosterCount5 = createMockQueryBuilder({ data: null, error: null, count: 5 });
    const playerPoolBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
    let rostersCall = 0;

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'player_pool') return playerPoolBuilder;
      if (table === 'rosters') {
        rostersCall++;
        if (rostersCall === 1) return rosterCount4;
        if (rostersCall === 2) return rosterInsert;
        return rosterCount5;
      }
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
    expect(res._body.data.round).toBe(3);
    expect(res._body.data.pick).toBe(1);
  });

  it('returns nextTeamId for non-final pick', async () => {
    // draft_order = [team-1, team-2], 4 picks done -> round 3, pick 1
    // next pick: round 3, pick 2 -> team-2 (odd round = forward, pick 2 = index 1)
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting', team_count: 2, draft_order: ['team-1', 'team-2'] },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: { id: 'team-1' },
      error: null,
      count: null,
    });
    const rosterCount4 = createMockQueryBuilder({ data: null, error: null, count: 4 });
    const rosterInsert = createMockQueryBuilder({ data: null, error: null, count: null });
    const rosterCount5 = createMockQueryBuilder({ data: null, error: null, count: 5 });
    const playerPoolBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
    let rostersCall = 0;

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'player_pool') return playerPoolBuilder;
      if (table === 'rosters') {
        rostersCall++;
        if (rostersCall === 1) return rosterCount4;
        if (rostersCall === 2) return rosterInsert;
        return rosterCount5;
      }
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
    expect(res._body.data.nextTeamId).toBe('team-2');
  });

  it('returns null nextTeamId when draft completes', async () => {
    // draft_order = [team-2, team-1], 41 picks done -> final pick (round 21, pick 2)
    // After pick: 42 total, getNextPick returns null -> nextTeamId is null
    const draftOrderFinal = ['team-2', 'team-1'];
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting', team_count: 2, draft_order: draftOrderFinal },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: { id: 'team-1' },
      error: null,
      count: null,
    });
    const playerPoolBuilder = createMockQueryBuilder({ data: null, error: null, count: null });

    const rosterCount41 = createMockQueryBuilder({ data: null, error: null, count: 41 });
    const rosterInsert = createMockQueryBuilder({ data: null, error: null, count: null });
    const rosterCount42 = createMockQueryBuilder({ data: null, error: null, count: 42 });
    let rostersCall = 0;

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'player_pool') return playerPoolBuilder;
      if (table === 'rosters') {
        rostersCall++;
        if (rostersCall === 1) return rosterCount41;
        if (rostersCall === 2) return rosterInsert;
        return rosterCount42;
      }
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
    expect(res._body.data.isComplete).toBe(true);
    expect(res._body.data.nextTeamId).toBeNull();
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

// ---------- POST action=start: Draft order generation ----------

describe('POST /api/leagues/:id/draft (start generates draft order)', () => {
  it('generates and stores draft order in league on start', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'setup' },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [{ id: 'team-a' }, { id: 'team-b' }, { id: 'team-c' }],
      error: null,
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
      body: { action: 'start' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    // Draft order should be returned containing all team IDs
    const data = res._body.data;
    expect(data.draftOrder).toBeDefined();
    expect(data.draftOrder).toHaveLength(3);
    expect(new Set(data.draftOrder)).toEqual(new Set(['team-a', 'team-b', 'team-c']));
  });

  it('returns 400 when no teams found', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'setup' },
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
      error: { code: 'NO_TEAMS' },
    });
  });
});

// ---------- POST action=auto-pick ----------

describe('POST /api/leagues/:id/draft (action=auto-pick)', () => {
  it('returns 403 when user is not commissioner', async () => {
    const builder = createMockQueryBuilder({
      data: { commissioner_id: 'other-user', status: 'drafting', team_count: 4, draft_order: ['t1', 't2'] },
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { action: 'auto-pick' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({
      error: { code: 'NOT_COMMISSIONER' },
    });
  });

  it('returns 400 when league is not drafting', async () => {
    const builder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'setup', team_count: 4, draft_order: null },
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { action: 'auto-pick' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'NOT_DRAFTING' },
    });
  });

  it('returns 200 when triggered by commissioner', async () => {
    const builder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'drafting', team_count: 4, draft_order: ['t1', 't2', 't3', 't4'] },
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { action: 'auto-pick' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toMatchObject({
      leagueId: 'league-1',
      action: 'auto-pick',
      status: 'processed',
    });
  });
});

// ---------- POST action=pick: Player pool marking ----------

describe('POST /api/leagues/:id/draft (pick marks player_pool)', () => {
  it('marks player as drafted in player_pool after successful pick', async () => {
    const playerPoolBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
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
      if (table === 'player_pool') return playerPoolBuilder;
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
    expect(mockFrom).toHaveBeenCalledWith('player_pool');
    expect(playerPoolBuilder.update).toHaveBeenCalledWith({
      is_drafted: true,
      drafted_by_team_id: 'team-1',
    });
  });

  it('marks all seasons of player (filters by player_id, not season_year)', async () => {
    const playerPoolBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
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
      if (table === 'player_pool') return playerPoolBuilder;
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

    // Should filter by league_id and player_id (marks all seasons)
    expect(playerPoolBuilder.eq).toHaveBeenCalledWith('league_id', 'league-1');
    expect(playerPoolBuilder.eq).toHaveBeenCalledWith('player_id', 'player-1');
  });

  it('does not fail the pick when player_pool update fails', async () => {
    const playerPoolBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Pool update failed', code: '42000' },
      count: null,
    });
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
      if (table === 'player_pool') return playerPoolBuilder;
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

    // Pick should still succeed despite pool update failure
    expect(res._status).toBe(201);
    expect(res._body.data.playerId).toBe('player-1');
  });
});

// ---------- POST action=pick: Draft completion + schedule generation ----------

describe('POST /api/leagues/:id/draft (draft completion generates schedule)', () => {
  // 2 teams, draft_order = ['team-2', 'team-1'], TOTAL_ROUNDS = 21
  // Final pick: round 21, pick 2 (team-1, the user's team)
  // Before insert: 41 picks already. After insert: 42 picks total.
  const draftOrder = ['team-2', 'team-1'];

  function setupDraftCompletionMocks() {
    const leaguesBuilder = createMockQueryBuilder({
      data: { status: 'drafting', team_count: 2, draft_order: draftOrder },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: { id: 'team-1' },
      error: null,
      count: null,
    });
    const playerPoolBuilder = createMockQueryBuilder({ data: null, error: null, count: null });

    // rosters is called 3 times:
    // 1) count for turn validation (41 picks) 2) insert 3) count for completion (42 picks)
    const rosterCount41 = createMockQueryBuilder({ data: null, error: null, count: 41 });
    const rosterInsert = createMockQueryBuilder({ data: null, error: null, count: null });
    const rosterCount42 = createMockQueryBuilder({ data: null, error: null, count: 42 });
    let rostersCall = 0;

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'player_pool') return playerPoolBuilder;
      if (table === 'rosters') {
        rostersCall++;
        if (rostersCall === 1) return rosterCount41;
        if (rostersCall === 2) return rosterInsert;
        return rosterCount42;
      }
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    return { mockFrom, leaguesBuilder };
  }

  it('calls generateAndInsertSchedule when draft completes', async () => {
    setupDraftCompletionMocks();

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: validPickBody,
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(201);
    expect(res._body.data.isComplete).toBe(true);
    expect(mockGenerateSchedule).toHaveBeenCalledWith(
      expect.anything(),
      'league-1',
    );
  });

  it('does not transition to regular_season if schedule generation fails', async () => {
    const { leaguesBuilder } = setupDraftCompletionMocks();
    mockGenerateSchedule.mockRejectedValue({
      category: 'DATA',
      code: 'INSERT_FAILED',
      message: 'Schedule insert failed',
    });

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: validPickBody,
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    // Should return an error, not 201
    expect(res._status).toBe(500);
    // leagues.update should NOT have been called with regular_season
    expect(leaguesBuilder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'regular_season' }),
    );
  });

  it('calls generateAndInsertLineups before schedule when draft completes', async () => {
    setupDraftCompletionMocks();

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: validPickBody,
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(201);
    expect(res._body.data.isComplete).toBe(true);
    expect(mockGenerateLineups).toHaveBeenCalledWith(
      expect.anything(),
      'league-1',
    );
    // Lineup generation should be called before schedule generation
    const lineupsOrder = mockGenerateLineups.mock.invocationCallOrder[0];
    const scheduleOrder = mockGenerateSchedule.mock.invocationCallOrder[0];
    expect(lineupsOrder).toBeLessThan(scheduleOrder);
  });

  it('does not call schedule generation if lineup generation fails', async () => {
    const { leaguesBuilder } = setupDraftCompletionMocks();
    mockGenerateLineups.mockRejectedValue({
      category: 'DATA',
      code: 'INSERT_FAILED',
      message: 'Lineup generation failed',
    });

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: validPickBody,
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(500);
    expect(mockGenerateSchedule).not.toHaveBeenCalled();
    expect(leaguesBuilder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'regular_season' }),
    );
  });
});

// ---------- GET ?resource=players: Player pool ----------

function makeMockPlayerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pp-1',
    league_id: 'league-1',
    player_id: 'ruthba01',
    season_year: 1927,
    player_card: {
      playerId: 'ruthba01',
      nameFirst: 'Babe',
      nameLast: 'Ruth',
      seasonYear: 1927,
      primaryPosition: 'RF',
      card: new Array(35).fill(0),
    },
    is_drafted: false,
    drafted_by_team_id: null,
    ...overrides,
  };
}

describe('GET /api/leagues/:id/draft?resource=players', () => {
  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue({
      category: 'AUTHENTICATION',
      code: 'MISSING_TOKEN',
      message: 'Missing token',
    });

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', resource: 'players' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(401);
  });

  it('returns paginated list of available players', async () => {
    const rows = [makeMockPlayerRow()];

    const builder = createMockQueryBuilder({ data: rows, error: null, count: 1 });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', resource: 'players' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ player_id: 'ruthba01' }),
      ]),
      pagination: expect.objectContaining({
        page: 1,
        pageSize: 100,
      }),
    });
  });

  it('filters by drafted=false by default', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: 0 });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', resource: 'players' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(builder.eq).toHaveBeenCalledWith('is_drafted', false);
  });

  it('respects page and pageSize params', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: 200 });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1', resource: 'players', page: '2', pageSize: '50' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(builder.range).toHaveBeenCalledWith(50, 99);
  });

  it('returns empty data when all players drafted', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: 0 });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1', resource: 'players', drafted: 'false' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: [],
      pagination: expect.objectContaining({ totalRows: 0 }),
    });
  });

  it('queries the player_pool table', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: 0 });
    const mockFrom = vi.fn().mockReturnValue(builder);
    mockCreateServerClient.mockReturnValue({
      from: mockFrom,
    } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', resource: 'players' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(mockFrom).toHaveBeenCalledWith('player_pool');
  });

  it('filters by league_id from route param', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: 0 });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-42', resource: 'players' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(builder.eq).toHaveBeenCalledWith('league_id', 'league-42');
  });

  it('sorts by season_year when sortBy=seasonYear', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: 0 });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1', resource: 'players', sortBy: 'seasonYear' },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(builder.order).toHaveBeenCalledWith('season_year', expect.objectContaining({ ascending: true }));
  });

  it('returns player_card JSONB in each record', async () => {
    const rows = [makeMockPlayerRow()];
    const builder = createMockQueryBuilder({ data: rows, error: null, count: 1 });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', resource: 'players' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    const body = res._body as { data: Array<{ player_card: Record<string, unknown> }> };
    expect(body.data[0].player_card).toMatchObject({
      playerId: 'ruthba01',
      nameFirst: 'Babe',
    });
  });
});
