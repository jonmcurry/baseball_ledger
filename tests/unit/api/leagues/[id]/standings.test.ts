/**
 * Tests for GET /api/leagues/:id/standings
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/standings';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('GET /api/leagues/:id/standings', () => {
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

  it('returns 200 with division-grouped standings', async () => {
    const teamsData = [
      {
        id: 'team-1',
        name: 'Yankees',
        city: 'New York',
        owner_id: 'user-1',
        manager_profile: 'balanced',
        league_division: 'American',
        division: 'East',
        wins: 95,
        losses: 67,
        runs_scored: 750,
        runs_allowed: 600,
      },
      {
        id: 'team-2',
        name: 'Red Sox',
        city: 'Boston',
        owner_id: 'user-2',
        manager_profile: 'aggressive',
        league_division: 'American',
        division: 'East',
        wins: 85,
        losses: 77,
        runs_scored: 700,
        runs_allowed: 680,
      },
      {
        id: 'team-3',
        name: 'Dodgers',
        city: 'Los Angeles',
        owner_id: 'user-3',
        manager_profile: 'analytical',
        league_division: 'National',
        division: 'West',
        wins: 100,
        losses: 62,
        runs_scored: 800,
        runs_allowed: 550,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('groups teams correctly by league_division and division', async () => {
    const teamsData = [
      {
        id: 'team-1',
        name: 'Yankees',
        city: 'New York',
        owner_id: 'user-1',
        manager_profile: 'balanced',
        league_division: 'American',
        division: 'East',
        wins: 95,
        losses: 67,
        runs_scored: 750,
        runs_allowed: 600,
      },
      {
        id: 'team-2',
        name: 'Red Sox',
        city: 'Boston',
        owner_id: 'user-2',
        manager_profile: 'aggressive',
        league_division: 'American',
        division: 'East',
        wins: 85,
        losses: 77,
        runs_scored: 700,
        runs_allowed: 680,
      },
      {
        id: 'team-3',
        name: 'Twins',
        city: 'Minnesota',
        owner_id: 'user-3',
        manager_profile: 'conservative',
        league_division: 'American',
        division: 'Central',
        wins: 78,
        losses: 84,
        runs_scored: 650,
        runs_allowed: 700,
      },
    ];

    const builder = createMockQueryBuilder({ data: teamsData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    const standings = res._body.data;
    expect(standings).toHaveLength(2);

    // The standings use snakeToCamel, so keys are camelCase
    const alEast = standings.find(
      (d: any) => d.leagueDivision === 'American' && d.division === 'East',
    );
    const alCentral = standings.find(
      (d: any) => d.leagueDivision === 'American' && d.division === 'Central',
    );

    expect(alEast).toBeDefined();
    expect(alEast.teams).toHaveLength(2);
    expect(alCentral).toBeDefined();
    expect(alCentral.teams).toHaveLength(1);
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
