/**
 * Tests for GET /api/leagues/:id/schedule
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/schedule';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('GET /api/leagues/:id/schedule', () => {
  const scheduleData = [
    {
      id: 'game-1',
      league_id: 'league-1',
      day_number: 1,
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      is_complete: false,
      home_score: null,
      away_score: null,
    },
    {
      id: 'game-2',
      league_id: 'league-1',
      day_number: 1,
      home_team_id: 'team-3',
      away_team_id: 'team-4',
      is_complete: false,
      home_score: null,
      away_score: null,
    },
    {
      id: 'game-3',
      league_id: 'league-1',
      day_number: 2,
      home_team_id: 'team-1',
      away_team_id: 'team-3',
      is_complete: false,
      home_score: null,
      away_score: null,
    },
  ];

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

  it('returns 200 with schedule array', async () => {
    const builder = createMockQueryBuilder({ data: scheduleData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(3);
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('homeTeamId', 'team-1');
    expect(res._body.data[0]).toHaveProperty('awayTeamId', 'team-2');
    expect(res._body.data[0]).toHaveProperty('dayNumber', 1);
    expect(res._body.data[0]).toHaveProperty('isComplete', false);
    expect(res._body.data[0]).not.toHaveProperty('home_team_id');
    expect(res._body.data[0]).not.toHaveProperty('day_number');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('filters by day when day query param provided', async () => {
    const day1Games = scheduleData.filter((g) => g.day_number === 1);
    const builder = createMockQueryBuilder({ data: day1Games, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', day: '1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    // Verify the builder chain had eq called for day_number
    expect(builder.eq).toHaveBeenCalledWith('league_id', 'league-1');
    expect(builder.eq).toHaveBeenCalledWith('day_number', 1);
  });

  it('returns full schedule when no day filter', async () => {
    const builder = createMockQueryBuilder({ data: scheduleData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(3);
    // eq should only be called for league_id, not day_number
    const eqCalls = builder.eq.mock.calls;
    const dayNumberCalls = eqCalls.filter((call: any[]) => call[0] === 'day_number');
    expect(dayNumberCalls).toHaveLength(0);
  });
});
