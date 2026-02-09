/**
 * useAuth Hook
 *
 * Composes authStore to provide authentication state and derived values.
 * isAuthenticated requires both user AND session to be non-null.
 *
 * Layer 5: Hook. Composes stores. Does not import components.
 */

import { useAuthStore } from '@stores/authStore';
import { getSupabaseClient } from '@lib/supabase/client';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const error = useAuthStore((s) => s.error);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);
  const setError = useAuthStore((s) => s.setError);
  const initialize = useAuthStore((s) => s.initialize);

  const isAuthenticated = user !== null && session !== null;

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const supabase = getSupabaseClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        return false;
      }
      if (data.user && data.session) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? '',
          displayName: data.user.user_metadata?.display_name ?? data.user.email ?? '',
        });
        setSession({
          accessToken: data.session.access_token,
          expiresAt: data.session.expires_at ?? 0,
        });
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      setError(null);
      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setError(authError.message);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      return false;
    }
  };

  return {
    user,
    session,
    isAuthenticated,
    isInitialized,
    error,
    login,
    signup,
    logout,
    initialize,
  };
}
