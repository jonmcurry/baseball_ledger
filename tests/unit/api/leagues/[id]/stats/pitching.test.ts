/**
 * Tests for GET /api/leagues/:id/stats/pitching
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../../api/leagues/[id]/stats/pitching';
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
 * The pitching endpoint chains `.not('pitching_stats', 'is', null)`.
 */
function addNotMethod<T extends ReturnType<typeof createMockQueryBuilder>>(builder: T): T {
  (builder as any).not = vi.fn().mockReturnValue(builder);
  return builder;
}

describe('GET /api/leagues/:id/stats/pitching', () => {
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

  it('returns 200 with paginated pitching leaders', async () => {
    const pitchingData = [
      {
        player_id: 'p1',
        team_id: 't1',
        pitching_stats: { wins: 15, losses: 8, era: 3.25, strikeouts: 200 },
      },
      {
        player_id: 'p2',
        team_id: 't2',
        pitching_stats: { wins: 12, losses: 10, era: 3.80, strikeouts: 175 },
      },
    ];

    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 40 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: pitchingData, error: null, count: null }));
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

  it('uses page query param for pagination', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 120 }));
    const dataBuilder = addNotMethod(createMockQueryBuilder({ data: [], error: null, count: null }));
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? countBuilder : dataBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', page: '3' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    // Page 3 with PAGE_SIZE=50: offset = (3-1)*50 = 100, range(100, 149)
    expect(dataBuilder.range).toHaveBeenCalledWith(100, 149);
  });

  it('returns correct pagination metadata', async () => {
    let fromCallCount = 0;
    const countBuilder = addNotMethod(createMockQueryBuilder({ data: null, error: null, count: 120 }));
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
      totalRows: 120,
      totalPages: 3,
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
});
