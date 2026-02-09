/**
 * Tests for POST /api/leagues/:id/simulate
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/simulate';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('POST /api/leagues/:id/simulate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  });

  it('returns 405 for GET', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
  });

  it('returns 400 for invalid body (missing days)', async () => {
    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: {} });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('returns 400 for invalid body (days=0)', async () => {
    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 0 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('returns 404 when league not found', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(leagueBuilder) } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'bad-id' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body.error).toHaveProperty('code', 'LEAGUE_NOT_FOUND');
  });

  it('returns 400 when league status is setup', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'setup', current_day: 0 },
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(leagueBuilder) } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_LEAGUE_STATUS');
  });

  it('returns 200 for sync simulation (days=1) with dayNumber and games', async () => {
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 42 },
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(leagueBuilder) } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 1 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveProperty('dayNumber', 43);
    expect(res._body.data).toHaveProperty('games');
    expect(Array.isArray(res._body.data.games)).toBe(true);
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('returns 202 for async simulation (days=7) with simulationId', async () => {
    let fromCallCount = 0;
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 10 },
      error: null,
      count: null,
    });
    const progressBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? leagueBuilder : progressBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({ method: 'POST', query: { id: 'league-1' }, body: { days: 7 } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(202);
    expect(res._body.data).toHaveProperty('simulationId');
    expect(typeof res._body.data.simulationId).toBe('string');
    expect(res._body.meta).toHaveProperty('requestId');
    // Verify simulation_progress was upserted
    expect(progressBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        league_id: 'league-1',
        status: 'running',
      }),
    );
  });

  it('returns 202 for season simulation (days=season)', async () => {
    let fromCallCount = 0;
    const leagueBuilder = createMockQueryBuilder({
      data: { status: 'regular_season', current_day: 50 },
      error: null,
      count: null,
    });
    const progressBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? leagueBuilder : progressBuilder;
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      body: { days: 'season' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(202);
    expect(res._body.data).toHaveProperty('simulationId');
    expect(res._body.meta).toHaveProperty('requestId');
    // Verify total_games calculation: (162 - 50) * 4 = 448
    expect(progressBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        total_games: 448,
        current_day: 50,
      }),
    );
  });
});
