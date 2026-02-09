/**
 * Tests for PATCH /api/leagues/:id/teams/:tid
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../../api/leagues/[id]/teams/[tid]';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('PATCH /api/leagues/:id/teams/:tid', () => {
  const existingTeam = {
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
    leagues: { commissioner_id: 'commissioner-1' },
  };

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

  it('returns 400 for invalid body', async () => {
    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1' },
      body: { name: '' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('returns 404 when team not found', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'nonexistent-team' },
      body: { name: 'New Name' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body.error).toHaveProperty('code', 'TEAM_NOT_FOUND');
  });

  it('returns 403 when not owner or commissioner', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'other-user', email: 'other@example.com' });

    const builder = createMockQueryBuilder({
      data: existingTeam,
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1' },
      body: { name: 'New Name' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body.error).toHaveProperty('code', 'NOT_TEAM_OWNER');
  });

  it('returns 200 with updated team on success (owner)', async () => {
    const updatedTeam = {
      ...existingTeam,
      name: 'Bronx Bombers',
      leagues: undefined,
    };

    // The handler calls from('teams') twice:
    // 1. select().eq().single() for ownership check -> returns existingTeam
    // 2. update().eq().select().single() for the update -> returns updatedTeam
    const singleFn = vi.fn()
      .mockResolvedValueOnce({ data: existingTeam, error: null, count: null })
      .mockResolvedValueOnce({ data: updatedTeam, error: null, count: null });

    const builder = createMockQueryBuilder({ data: existingTeam, error: null, count: null });
    builder.single = singleFn;

    mockCreateServerClient.mockReturnValue({ from: vi.fn().mockReturnValue(builder) } as never);

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'league-1', tid: 'team-1' },
      body: { name: 'Bronx Bombers' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body.data).toEqual(
      expect.objectContaining({ name: 'Bronx Bombers' }),
    );
    // Verify camelCase transformation
    expect(res._body.data).toHaveProperty('managerProfile');
    expect(res._body.data).not.toHaveProperty('manager_profile');
    expect(res._body.meta).toHaveProperty('requestId');
  });
});
