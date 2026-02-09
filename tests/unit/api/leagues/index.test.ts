/**
 * Tests for POST /api/leagues -- Create a new league
 */

vi.mock('@lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('../../../../api/_lib/auth', () => ({ requireAuth: vi.fn() }));

import handler from '../../../../api/leagues/index';
import { createServerClient } from '@lib/supabase/server';
import { requireAuth } from '../../../../api/_lib/auth';
import { createMockRequest, createMockResponse, createMockQueryBuilder } from '../../../fixtures/mock-supabase';

const mockCreateServerClient = vi.mocked(createServerClient);
const mockRequireAuth = vi.mocked(requireAuth);

describe('POST /api/leagues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
  });

  it('returns 405 for non-POST methods', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(405);
  });

  it('returns 401 when requireAuth rejects', async () => {
    mockRequireAuth.mockRejectedValue({
      category: 'AUTHENTICATION',
      code: 'MISSING_TOKEN',
      message: 'Missing token',
    });

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 4 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(401);
    expect(res._body).toMatchObject({
      error: { code: 'MISSING_TOKEN' },
    });
  });

  it('returns 400 for missing name', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { teamCount: 4 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'INVALID_REQUEST_BODY' },
    });
  });

  it('returns 400 for non-even teamCount', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 3 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: { code: 'INVALID_REQUEST_BODY' },
    });
  });

  it('returns 400 for teamCount below minimum', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 0 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
  });

  it('returns 201 with league data on success', async () => {
    const leagueRow = {
      id: 'league-1',
      name: 'Test League',
      commissioner_id: 'user-123',
      invite_key: 'ABCD1234',
      team_count: 4,
      year_range_start: 1901,
      year_range_end: 2025,
      injuries_enabled: false,
      created_at: '2025-01-01T00:00:00Z',
    };

    const builder = createMockQueryBuilder({
      data: leagueRow,
      error: null,
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 4 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(201);
    expect(res._body).toMatchObject({
      data: {
        id: 'league-1',
        name: 'Test League',
        commissionerId: 'user-123',
        teamCount: 4,
      },
      meta: expect.objectContaining({ requestId: expect.any(String) }),
    });
  });

  it('returns 500 when Supabase insert fails', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Insert failed', code: 'PGRST001' },
      count: null,
    });
    mockCreateServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(builder),
    } as never);

    const req = createMockRequest({
      method: 'POST',
      body: { name: 'Test League', teamCount: 4 },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({
      error: { code: 'INSERT_FAILED' },
    });
  });

  it('passes correct insert payload to Supabase', async () => {
    const leagueRow = {
      id: 'league-2',
      name: 'My League',
      commissioner_id: 'user-123',
      invite_key: 'XYZ12345',
      team_count: 8,
      year_range_start: 1950,
      year_range_end: 2000,
      injuries_enabled: true,
      created_at: '2025-01-01T00:00:00Z',
    };

    const builder = createMockQueryBuilder({
      data: leagueRow,
      error: null,
      count: null,
    });
    const mockFrom = vi.fn().mockReturnValue(builder);
    mockCreateServerClient.mockReturnValue({
      from: mockFrom,
    } as never);

    const req = createMockRequest({
      method: 'POST',
      body: {
        name: 'My League',
        teamCount: 8,
        yearRangeStart: 1950,
        yearRangeEnd: 2000,
        injuriesEnabled: true,
      },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(mockFrom).toHaveBeenCalledWith('leagues');
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My League',
        commissioner_id: 'user-123',
        team_count: 8,
        year_range_start: 1950,
        year_range_end: 2000,
        injuries_enabled: true,
      }),
    );
  });
});
