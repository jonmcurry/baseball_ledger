/**
 * Tests for POST /api/leagues/:id/archive
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

describe('POST /api/leagues/:id/archive', () => {
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
