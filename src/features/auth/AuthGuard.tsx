/**
 * AuthGuard
 *
 * Route guard that checks authentication status.
 * In mock mode (no Supabase), defaults to authenticated.
 */

import { Outlet } from 'react-router-dom';

export function AuthGuard() {
  // Mock mode: always authenticated until Supabase is connected
  const isAuthenticated = true;

  if (!isAuthenticated) {
    // Will redirect to login when auth store is wired
    return null;
  }

  return <Outlet />;
}
