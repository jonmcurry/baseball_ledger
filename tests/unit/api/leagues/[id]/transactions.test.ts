/**
 * Tests for POST /api/leagues/:id/transactions
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../../../../../api/_lib/validate', () => ({
  validateBody: vi.fn(),
}));
vi.mock('@lib/draft/trade-validator', () => ({
  validateTradeRosters: vi.fn(),
}));

import handler from '../../../../../api/leagues/[id]/transactions';
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

describe('POST /api/leagues/:id/transactions', () => {
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

  // ---------------------------------------------------------------------------
  // Trade-specific tests (REQ-RST-005, REQ-RST-006)
  // ---------------------------------------------------------------------------

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
          // Missing targetTeamId, playersFromMe, playersFromThem
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
