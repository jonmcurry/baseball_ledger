/**
 * Tests for GET /api/leagues/:id/players -- Fetch available players
 *
 * REQ-DATA-002: Player pool accessible for draft board.
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/players';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

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

describe('GET /api/leagues/:id/players', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  });

  it('returns 405 for non-GET methods', async () => {
    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(405);
  });

  it('returns 401 when not authenticated', async () => {
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

  it('returns paginated list of available players', async () => {
    const rows = [makeMockPlayerRow()];

    const builder = createMockQueryBuilder({ data: rows, error: null, count: 1 });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
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

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
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
      query: { id: 'league-1', page: '2', pageSize: '50' },
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
      query: { id: 'league-1', drafted: 'false' },
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

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
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
      query: { id: 'league-42' },
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
      query: { id: 'league-1', sortBy: 'seasonYear' },
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

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as never, res as never);

    const body = res._body as { data: Array<{ player_card: Record<string, unknown> }> };
    expect(body.data[0].player_card).toMatchObject({
      playerId: 'ruthba01',
      nameFirst: 'Babe',
    });
  });
});
