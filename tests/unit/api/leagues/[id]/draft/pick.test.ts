/**
 * Tests for POST /api/leagues/:id/draft/pick
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../../../api/_lib/validate', () => ({
  validateBody: vi.fn(),
}));

import handler from '../../../../../../api/leagues/[id]/draft/pick';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../../api/_lib/auth';
import { validateBody } from '../../../../../../api/_lib/validate';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);
const mockValidateBody = vi.mocked(validateBody);

const validPickBody = {
  playerId: 'player-1',
  playerName: 'Babe Ruth',
  position: 'RF',
  seasonYear: 1927,
  playerCard: { power: 21, contact: 15 },
};

describe('POST /api/leagues/:id/draft/pick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
    mockValidateBody.mockImplementation((req) => req.body as any);
  });

  it('returns 405 for GET', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
  });

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
      body: { playerName: 'Babe Ruth' },
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
