/**
 * Tests for GET /api/leagues/:id/draft/state
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../../api/leagues/[id]/draft/state';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('GET /api/leagues/:id/draft/state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  });

  it('returns 405 for POST', async () => {
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
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
