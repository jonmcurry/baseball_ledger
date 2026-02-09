/**
 * Tests for Auth Store -- async initialize action
 *
 * Covers initialize (session bootstrap + onAuthStateChange listener).
 * REQ-STATE-001.
 */

vi.mock('@lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

import { useAuthStore } from '../../../src/stores/authStore';
import { getSupabaseClient } from '@lib/supabase/client';

function createMockSupabaseAuth(options?: {
  session?: {
    user: { id: string; email: string; user_metadata?: Record<string, unknown> };
    access_token: string;
    expires_at?: number;
  } | null;
  getSessionError?: Error;
}) {
  const session = options?.session ?? null;
  const mockOnAuthStateChange = vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });

  const mockGetSession = options?.getSessionError
    ? vi.fn().mockRejectedValue(options.getSessionError)
    : vi.fn().mockResolvedValue({ data: { session } });

  vi.mocked(getSupabaseClient).mockReturnValue({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  } as never);

  return { mockGetSession, mockOnAuthStateChange };
}

describe('authStore async initialize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      session: null,
      isInitialized: false,
      error: null,
    });
  });

  it('initialize sets isInitialized when no session exists', async () => {
    createMockSupabaseAuth({ session: null });

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('initialize sets user and session when session exists', async () => {
    createMockSupabaseAuth({
      session: {
        user: { id: 'u1', email: 'test@test.com', user_metadata: { display_name: 'Tester' } },
        access_token: 'token-123',
        expires_at: 1234567890,
      },
    });

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.user).toEqual({
      id: 'u1',
      email: 'test@test.com',
      displayName: 'Tester',
    });
    expect(state.session).toEqual({
      accessToken: 'token-123',
      expiresAt: 1234567890,
    });
    expect(state.isInitialized).toBe(true);
  });

  it('initialize maps user metadata to displayName', async () => {
    createMockSupabaseAuth({
      session: {
        user: { id: 'u2', email: 'no-display@test.com' },
        access_token: 'tok',
        expires_at: 999,
      },
    });

    await useAuthStore.getState().initialize();

    // When display_name is missing, falls back to email
    expect(useAuthStore.getState().user?.displayName).toBe('no-display@test.com');
  });

  it('initialize subscribes to auth state changes', async () => {
    const { mockOnAuthStateChange } = createMockSupabaseAuth({ session: null });

    await useAuthStore.getState().initialize();

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('initialize handles auth state change (sign out)', async () => {
    const { mockOnAuthStateChange } = createMockSupabaseAuth({
      session: {
        user: { id: 'u1', email: 'test@test.com', user_metadata: { display_name: 'Tester' } },
        access_token: 'token-123',
        expires_at: 1234567890,
      },
    });

    await useAuthStore.getState().initialize();

    // Verify user is set after init
    expect(useAuthStore.getState().user).not.toBeNull();

    // Extract the callback and simulate sign-out
    const authCallback = mockOnAuthStateChange.mock.calls[0][0];
    authCallback('SIGNED_OUT', null);

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('initialize sets error on failure', async () => {
    createMockSupabaseAuth({ getSessionError: new Error('Auth service unavailable') });

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.error).toBe('Auth service unavailable');
  });
});
