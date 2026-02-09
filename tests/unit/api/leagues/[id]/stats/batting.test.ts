/**
 * Tests for GET /api/leagues/:id/stats/batting
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../../api/leagues/[id]/stats/batting';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

/**
 * Adds `.not()` to a mock query builder (not in the shared fixture).
 * The batting/pitching endpoints chain `.not('batting_stats', 'is', null)`.
 */
function addNotMethod<T extends ReturnType<typeof createMockQueryBuilder>>(builder: T): T {
  (builder as any).not = vi.fn().mockReturnValue(builder);
  return builder;
}

describe('GET /api/leagues/:id/stats/batting', () => {
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

  it('returns 200 with paginated batting leaders', async () => {
    const battingData = [
      {
        player_id: 'p1',
        team_id: 't1',
        batting_stats: { hits: 150, at_bats: 500, home_runs: 30 },
      },
      {
        player_id: 'p2',
        team_id: 't2',
        batting_stats: { hits: 140, at_bats: 480, home_runs: 25 },
      },
    ];

    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 75 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: battingData, error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('playerId', 'p1');
    expect(res._body.data[0]).toHaveProperty('teamId', 't1');
    expect(res._body.data[0]).toHaveProperty('stats');
    expect(res._body.data[0]).not.toHaveProperty('player_id');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('uses page query param for pagination (default page 1)', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 100 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: [], error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', page: '2' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    // Page 2 should call range(50, 99) for PAGE_SIZE=50
    expect(dataBuilder.range).toHaveBeenCalledWith(50, 99);
  });

  it('returns correct pagination metadata', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 75 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: [], error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.pagination).toEqual({
      page: 1,
      pageSize: 50,
      totalRows: 75,
      totalPages: 2,
    });
  });

  it('handles count query error', async () => {
    const countBuilder = addNotMethod(
      createMockQueryBuilder({
        data: null,
        error: { message: 'Count failed', code: 'PGRST000' },
        count: null,
      }),
    );

    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(countBuilder),
    } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(500);
    expect(res._body.error).toHaveProperty('code', 'QUERY_FAILED');
  });

  it('handles data query error', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 10 }));
    const dataBuilder = addNotMethod(
      createMockQueryBuilder({
        data: null,
        error: { message: 'Data fetch failed', code: 'PGRST000' },
        count: null,
      }),
    );
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(500);
    expect(res._body.error).toHaveProperty('code', 'QUERY_FAILED');
  });
});
