/**
 * Tests for GET /api/leagues/:id/teams
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../../api/leagues/[id]/teams/index';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('GET /api/leagues/:id/teams', () => {
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

  it('returns 200 with teams array on success', async () => {
    const teamsData = [
      {
        id: 'team-1',
        name: 'Yankees',
        city: 'New York',
        league_id: 'league-1',
        owner_id: 'user-123',
        manager_profile: 'balanced',
        league_division: 'American',
        division: 'East',
        wins: 90,
        losses: 72,
        runs_scored: 700,
        runs_allowed: 650,
      },
      {
        id: 'team-2',
        name: 'Red Sox',
        city: 'Boston',
        league_id: 'league-1',
        owner_id: 'user-456',
        manager_profile: 'aggressive',
        league_division: 'American',
        division: 'East',
        wins: 85,
        losses: 77,
        runs_scored: 680,
        runs_allowed: 670,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'team-1', name: 'Yankees', leagueDivision: 'American' }),
        expect.objectContaining({ id: 'team-2', name: 'Red Sox', leagueDivision: 'American' }),
      ]),
    );
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('leagueId');
    expect(res._body.data[0]).toHaveProperty('ownerId');
    expect(res._body.data[0]).toHaveProperty('managerProfile');
    expect(res._body.data[0]).not.toHaveProperty('league_id');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('handles query error', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Connection failed', code: 'PGRST000' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(500);
    expect(res._body.error).toHaveProperty('code', 'QUERY_FAILED');
  });
});
