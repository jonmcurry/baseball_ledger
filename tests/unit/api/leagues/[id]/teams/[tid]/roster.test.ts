/**
 * Tests for GET /api/leagues/:id/teams/:tid/roster
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../../../api/leagues/[id]/teams/[tid]/roster';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('GET /api/leagues/:id/teams/:tid/roster', () => {
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

  it('returns 200 with roster array on success', async () => {
    const rosterData = [
      {
        id: 'roster-1',
        team_id: 'team-1',
        player_id: 'player-1',
        lineup_order: 1,
        position: 'SS',
        is_active: true,
      },
      {
        id: 'roster-2',
        team_id: 'team-1',
        player_id: 'player-2',
        lineup_order: 2,
        position: 'CF',
        is_active: true,
      },
    ];

    const builder = createMockQueryBuilder({ data: rosterData, error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', tid: 'team-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toHaveLength(2);
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('teamId', 'team-1');
    expect(res._body.data[0]).toHaveProperty('playerId', 'player-1');
    expect(res._body.data[0]).toHaveProperty('lineupOrder', 1);
    expect(res._body.data[0]).toHaveProperty('isActive', true);
    expect(res._body.data[0]).not.toHaveProperty('team_id');
    expect(res._body.data[0]).not.toHaveProperty('lineup_order');
    expect(res._body.meta).toHaveProperty('requestId');
  });

  it('returns empty array when no roster entries', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null, count: null });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({ method: 'GET', query: { id: 'league-1', tid: 'team-1' } });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toEqual([]);
    expect(res._body.meta).toHaveProperty('requestId');
  });
});
