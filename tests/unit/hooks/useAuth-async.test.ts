/**
 * Tests for useAuth hook -- login and signup async actions
 *
 * Uses renderHook from @testing-library/react since useAuth is a React hook.
 * Mocks the Supabase client for auth operations.
 *
 * @vitest-environment jsdom
 */

vi.mock('@lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../../src/hooks/useAuth';
import { getSupabaseClient } from '@lib/supabase/client';
import { useAuthStore } from '../../../src/stores/authStore';

function setupMockAuth(overrides?: {
  signInResult?: { data: unknown; error: unknown };
  signUpResult?: { data: unknown; error: unknown };
}) {
  const mockSignIn = vi.fn().mockResolvedValue(
    overrides?.signInResult ?? {
      data: {
        user: { id: 'u1', email: 'test@test.com', user_metadata: { display_name: 'Tester' } },
        session: { access_token: 'token-abc', expires_at: 9999 },
      },
      error: null,
    },
  );

  const mockSignUp = vi.fn().mockResolvedValue(
    overrides?.signUpResult ?? {
      data: { user: { id: 'u2', email: 'new@test.com' }, session: null },
      error: null,
    },
  );

  vi.mocked(getSupabaseClient).mockReturnValue({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  } as never);

  return { mockSignIn, mockSignUp };
}

describe('useAuth async actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
    useAuthStore.getState().setInitialized(false);
    useAuthStore.getState().setError(null);
  });

  // -----------------------------------------------------------------------
  // login
  // -----------------------------------------------------------------------

  it('login calls signInWithPassword with correct credentials', async () => {
    const { mockSignIn } = setupMockAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@test.com', 'password123');
    });

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123',
    });
  });

  it('login returns true and sets user on success', async () => {
    setupMockAuth();
    const { result } = renderHook(() => useAuth());

    let loginResult: boolean = false;
    await act(async () => {
      loginResult = await result.current.login('test@test.com', 'password123');
    });

    expect(loginResult).toBe(true);
    expect(result.current.user).toEqual({
      id: 'u1',
      email: 'test@test.com',
      displayName: 'Tester',
    });
    expect(result.current.session).toEqual({
      accessToken: 'token-abc',
      expiresAt: 9999,
    });
  });

  it('login returns false and sets error on auth failure', async () => {
    setupMockAuth({
      signInResult: {
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      },
    });
    const { result } = renderHook(() => useAuth());

    let loginResult: boolean = true;
    await act(async () => {
      loginResult = await result.current.login('bad@test.com', 'wrong');
    });

    expect(loginResult).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  // -----------------------------------------------------------------------
  // signup
  // -----------------------------------------------------------------------

  it('signup calls signUp with correct credentials', async () => {
    const { mockSignUp } = setupMockAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signup('new@test.com', 'newpass123');
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'newpass123',
    });
  });

  it('signup returns true on success', async () => {
    setupMockAuth();
    const { result } = renderHook(() => useAuth());

    let signupResult: boolean = false;
    await act(async () => {
      signupResult = await result.current.signup('new@test.com', 'newpass123');
    });

    expect(signupResult).toBe(true);
  });

  it('signup sets error on failure', async () => {
    setupMockAuth({
      signUpResult: {
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      },
    });
    const { result } = renderHook(() => useAuth());

    let signupResult: boolean = true;
    await act(async () => {
      signupResult = await result.current.signup('existing@test.com', 'pass');
    });

    expect(signupResult).toBe(false);
    expect(result.current.error).toBe('Email already registered');
  });
});
