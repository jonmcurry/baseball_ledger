// @vitest-environment jsdom
/**
 * Tests for useAuth hook
 */

const { mockSignInAnonymously, mockSignInWithPassword, mockSignUp } = vi.hoisted(() => ({
  mockSignInAnonymously: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock('@lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      signInAnonymously: mockSignInAnonymously,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  }),
}));

import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@hooks/useAuth';
import { useAuthStore } from '@stores/authStore';

describe('useAuth', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      isInitialized: false,
      error: null,
    });
    mockSignInAnonymously.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
  });

  it('isAuthenticated is false when no user', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('isAuthenticated is false when user exists but no session', () => {
    useAuthStore.getState().setUser({ id: 'u1', email: 'x@y.com', displayName: 'X' });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('isAuthenticated is true when both user and session exist', () => {
    useAuthStore.getState().setUser({ id: 'u1', email: 'x@y.com', displayName: 'X' });
    useAuthStore.getState().setSession({ accessToken: 'tok', expiresAt: 9999 });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('exposes user from store', () => {
    useAuthStore.getState().setUser({ id: 'u1', email: 'x@y.com', displayName: 'Player' });

    const { result } = renderHook(() => useAuth());
    expect(result.current.user?.displayName).toBe('Player');
  });

  it('exposes isInitialized from store', () => {
    useAuthStore.getState().setInitialized(true);

    const { result } = renderHook(() => useAuth());
    expect(result.current.isInitialized).toBe(true);
  });

  it('exposes error from store', () => {
    useAuthStore.getState().setError('Auth failed');

    const { result } = renderHook(() => useAuth());
    expect(result.current.error).toBe('Auth failed');
  });

  it('logout clears authentication', () => {
    useAuthStore.getState().setUser({ id: 'u1', email: 'x@y.com', displayName: 'X' });
    useAuthStore.getState().setSession({ accessToken: 'tok', expiresAt: 9999 });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // loginAsGuest (REQ-AUTH-001)
  // ---------------------------------------------------------------------------

  describe('loginAsGuest', () => {
    it('calls signInAnonymously on Supabase', async () => {
      mockSignInAnonymously.mockResolvedValue({
        data: {
          user: { id: 'anon-1', email: null, user_metadata: {}, is_anonymous: true },
          session: { access_token: 'anon-tok', expires_at: 9999 },
        },
        error: null,
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.loginAsGuest();
      });

      expect(mockSignInAnonymously).toHaveBeenCalled();
    });

    it('sets guest user in store on success', async () => {
      mockSignInAnonymously.mockResolvedValue({
        data: {
          user: { id: 'anon-1', email: null, user_metadata: {}, is_anonymous: true },
          session: { access_token: 'anon-tok', expires_at: 9999 },
        },
        error: null,
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.loginAsGuest();
      });

      expect(result.current.user).toMatchObject({ id: 'anon-1', displayName: 'Guest' });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('returns true on success', async () => {
      mockSignInAnonymously.mockResolvedValue({
        data: {
          user: { id: 'anon-1', email: null, user_metadata: {}, is_anonymous: true },
          session: { access_token: 'anon-tok', expires_at: 9999 },
        },
        error: null,
      });

      const { result } = renderHook(() => useAuth());
      let success = false;
      await act(async () => {
        success = await result.current.loginAsGuest();
      });

      expect(success).toBe(true);
    });

    it('sets error and returns false on failure', async () => {
      mockSignInAnonymously.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Anonymous sign-in disabled' },
      });

      const { result } = renderHook(() => useAuth());
      let success = true;
      await act(async () => {
        success = await result.current.loginAsGuest();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Anonymous sign-in disabled');
    });
  });
});
