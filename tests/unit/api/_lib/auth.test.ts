import type { VercelRequest } from '@vercel/node';

// Mock the server client module before importing auth
vi.mock('@lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

import { requireAuth } from '../../../../api/_lib/auth';
import { createServerClient } from '@lib/supabase/server';

const mockCreateServerClient = vi.mocked(createServerClient);

describe('api/_lib/auth', () => {
  const validUser = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns userId and email for valid token', async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: validUser },
          error: null,
        }),
      },
    } as never);

    const req = {
      headers: { authorization: 'Bearer valid-token-123' },
    } as unknown as VercelRequest;

    const result = await requireAuth(req);
    expect(result).toEqual({ userId: 'user-123', email: 'test@example.com' });
  });

  it('throws AUTHENTICATION error when no Authorization header', async () => {
    const req = { headers: {} } as unknown as VercelRequest;

    await expect(requireAuth(req)).rejects.toMatchObject({
      category: 'AUTHENTICATION',
      code: 'MISSING_TOKEN',
    });
  });

  it('throws AUTHENTICATION error when header is not Bearer', async () => {
    const req = {
      headers: { authorization: 'Basic abc123' },
    } as unknown as VercelRequest;

    await expect(requireAuth(req)).rejects.toMatchObject({
      category: 'AUTHENTICATION',
      code: 'MISSING_TOKEN',
    });
  });

  it('throws AUTHENTICATION error for invalid token', async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        }),
      },
    } as never);

    const req = {
      headers: { authorization: 'Bearer bad-token' },
    } as unknown as VercelRequest;

    await expect(requireAuth(req)).rejects.toMatchObject({
      category: 'AUTHENTICATION',
      code: 'INVALID_TOKEN',
    });
  });

  it('throws AUTHENTICATION error when user is null', async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    const req = {
      headers: { authorization: 'Bearer token-no-user' },
    } as unknown as VercelRequest;

    await expect(requireAuth(req)).rejects.toMatchObject({
      category: 'AUTHENTICATION',
      code: 'INVALID_TOKEN',
    });
  });

  it('returns empty string email when user has no email', async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { ...validUser, email: undefined } },
          error: null,
        }),
      },
    } as never);

    const req = {
      headers: { authorization: 'Bearer valid-token' },
    } as unknown as VercelRequest;

    const result = await requireAuth(req);
    expect(result.email).toBe('');
  });

  it('extracts token correctly (strips Bearer prefix)', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: validUser },
      error: null,
    });
    mockCreateServerClient.mockReturnValue({
      auth: { getUser: mockGetUser },
    } as never);

    const req = {
      headers: { authorization: 'Bearer my-jwt-token-here' },
    } as unknown as VercelRequest;

    await requireAuth(req);
    expect(mockGetUser).toHaveBeenCalledWith('my-jwt-token-here');
  });
});
