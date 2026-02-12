/**
 * Tests for Auth Store
 */

vi.mock('@lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

import { useAuthStore } from '@stores/authStore';
import { getSupabaseClient } from '@lib/supabase/client';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useAuthStore.setState({
      user: null,
      session: null,
      isInitialized: false,
      error: null,
    });
  });

  it('starts with null user and session', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isInitialized).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setUser updates user and clears error', () => {
    const store = useAuthStore.getState();
    store.setError('old error');
    store.setUser({ id: 'u1', email: 'test@test.com', displayName: 'Test' });

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe('u1');
    expect(state.user?.email).toBe('test@test.com');
    expect(state.error).toBeNull();
  });

  it('setSession updates session', () => {
    const store = useAuthStore.getState();
    store.setSession({ accessToken: 'abc', expiresAt: 9999 });

    expect(useAuthStore.getState().session?.accessToken).toBe('abc');
  });

  it('setInitialized updates isInitialized', () => {
    useAuthStore.getState().setInitialized(true);
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('setError updates error', () => {
    useAuthStore.getState().setError('Something failed');
    expect(useAuthStore.getState().error).toBe('Something failed');
  });

  it('logout clears user, session, and error', () => {
    const store = useAuthStore.getState();
    store.setUser({ id: 'u1', email: 'x@y.com', displayName: 'X' });
    store.setSession({ accessToken: 'tok', expiresAt: 1000 });
    store.setError('err');
    store.logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.error).toBeNull();
  });

  it('setUser with null clears user', () => {
    const store = useAuthStore.getState();
    store.setUser({ id: 'u1', email: 'x@y.com', displayName: 'X' });
    store.setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
  });

  describe('initialize', () => {
    it('sets isInitialized true when getSession returns no session', async () => {
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          onAuthStateChange: vi.fn(),
        },
      } as never);

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isInitialized).toBe(true);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('sets isInitialized true with error when getSession hangs (timeout)', async () => {
      vi.useFakeTimers();
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          getSession: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
          onAuthStateChange: vi.fn(),
        },
      } as never);

      const initPromise = useAuthStore.getState().initialize();
      await vi.advanceTimersByTimeAsync(10_000);
      await initPromise;

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.error).toBe('Session check timed out');
      expect(state.user).toBeNull();

      vi.useRealTimers();
    });

    it('sets user when getSession returns a valid session', async () => {
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                user: { id: 'u1', email: 'a@b.com', user_metadata: { display_name: 'Test' } },
                access_token: 'tok',
                expires_at: 9999,
              },
            },
          }),
          onAuthStateChange: vi.fn(),
        },
      } as never);

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.user?.id).toBe('u1');
      expect(state.session?.accessToken).toBe('tok');
    });
  });
});
