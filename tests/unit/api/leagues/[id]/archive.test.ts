/**
 * Tests for GET/POST /api/leagues/:id/archive
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../../api/leagues/[id]/archive';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../../api/_lib/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockQueryBuilder,
} from '../../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
});

// ---------- General ----------

describe('GET/POST /api/leagues/:id/archive (general)', () => {
  it('returns 405 for PUT', async () => {
    const req = createMockRequest({ method: 'PUT' });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(405);
  });
});

// ---------- GET: List archives ----------

describe('GET /api/leagues/:id/archive', () => {
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

// ---------- POST: Archive season ----------

describe('POST /api/leagues/:id/archive', () => {
  it('returns 404 when league not found', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' },
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-999' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      error: { code: 'LEAGUE_NOT_FOUND' },
    });
  });

  it('returns 403 when user is not commissioner', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'other-user', status: 'completed', season_year: 1 },
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({
      error: { code: 'NOT_COMMISSIONER' },
    });
  });

  it('returns 400 when season is not completed', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'active', season_year: 1 },
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'SEASON_NOT_COMPLETE' },
    });
  });

  it('returns 204 on success', async () => {
    const leaguesBuilder = createMockQueryBuilder({
      data: { commissioner_id: 'user-123', status: 'completed', season_year: 1 },
      error: null,
      count: null,
    });
    const teamsBuilder = createMockQueryBuilder({
      data: [
        { id: 'team-1', name: 'Yankees', wins: 90, losses: 72 },
        { id: 'team-2', name: 'Red Sox', wins: 85, losses: 77 },
      ],
      error: null,
      count: null,
    });
    const archivesBuilder = createMockQueryBuilder({
      data: null,
      error: null,
      count: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'teams') return teamsBuilder;
      if (table === 'archives') return archivesBuilder;
      return createMockQueryBuilder();
    });
    mockCreateServerClient.mockReturnValue({ from: mockFrom } as never);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'league-1' },
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res._status).toBe(204);
    expect(res.end).toHaveBeenCalled();
  });
});
