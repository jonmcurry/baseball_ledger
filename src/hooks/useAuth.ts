/**
 * useAuth Hook
 *
 * Composes authStore to provide authentication state and derived values.
 * isAuthenticated requires both user AND session to be non-null.
 *
 * Layer 5: Hook. Composes stores. Does not import components.
 */

import { useAuthStore } from '@stores/authStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const error = useAuthStore((s) => s.error);
  const logout = useAuthStore((s) => s.logout);

  const isAuthenticated = user !== null && session !== null;

  return {
    user,
    session,
    isAuthenticated,
    isInitialized,
    error,
    logout,
  };
}
