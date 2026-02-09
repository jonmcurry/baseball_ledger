/**
 * Tests for GET /api/leagues/:id/stats/team
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../../api/leagues/[id]/stats/team';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('GET /api/leagues/:id/stats/team', () => {
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

  it('returns 200 with team stats including run differential', async () => {
    const teamsData = [
      {
        id: 'team-1',
        name: 'Yankees',
        city: 'New York',
        wins: 95,
        losses: 67,
        runs_scored: 750,
        runs_allowed: 620,
      },
      {
        id: 'team-2',
        name: 'Red Sox',
        city: 'Boston',
        wins: 82,
        losses: 80,
        runs_scored: 680,
        runs_allowed: 700,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    // Verify camelCase transformation and run_differential computation
    expect(res._body.data[0]).toHaveProperty('teamId', 'team-1');
    expect(res._body.data[0]).toHaveProperty('teamName', 'Yankees');
    expect(res._body.data[0]).toHaveProperty('runsScored', 750);
    expect(res._body.data[0]).toHaveProperty('runsAllowed', 620);
    expect(res._body.data[0]).toHaveProperty('runDifferential', 130);
    expect(res._body.data[0]).not.toHaveProperty('team_id');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('computes run_differential correctly (runs_scored - runs_allowed)', async () => {
    const teamsData = [
      {
        id: 'team-1',
        name: 'Orioles',
        city: 'Baltimore',
        wins: 60,
        losses: 102,
        runs_scored: 550,
        runs_allowed: 800,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    // 550 - 800 = -250
    expect(res._body.data[0]).toHaveProperty('runDifferential', -250);
  });

  it('returns empty array when no teams', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toEqual([]);
  });
});
