/**
 * Tests for Auth Store
 */

import { useAuthStore } from '@stores/authStore';

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
});
