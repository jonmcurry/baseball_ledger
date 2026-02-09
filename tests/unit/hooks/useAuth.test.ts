// @vitest-environment jsdom
/**
 * Tests for useAuth hook
 */

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
});
