/**
 * Tests for GET /api/leagues/:id/archives
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/archives';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('GET /api/leagues/:id/archives', () => {
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

  it('returns 200 with array of archives', async () => {
    const archivesData = [
      {
        id: 'archive-1',
        league_id: 'league-1',
        season_number: 2,
        champion: 'team-1',
        created_at: '2025-06-01T00:00:00Z',
      },
      {
        id: 'archive-2',
        league_id: 'league-1',
        season_number: 1,
        champion: 'team-2',
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    const builder = createMockQueryBuilder({
      data: archivesData,
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'archive-1', seasonNumber: 2 }),
        expect.objectContaining({ id: 'archive-2', seasonNumber: 1 }),
      ]),
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
    // Verify camelCase transformation
    expect(res._body.data[0]).toHaveProperty('leagueId');
    expect(res._body.data[0]).toHaveProperty('seasonNumber');
    expect(res._body.data[0]).toHaveProperty('createdAt');
    expect(res._body.data[0]).not.toHaveProperty('league_id');
    expect(res._body.data[0]).not.toHaveProperty('season_number');
  });

  it('returns 200 with empty array when no archives exist', async () => {
    const builder = createMockQueryBuilder({
      data: [],
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      data: [],
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
  });
});
