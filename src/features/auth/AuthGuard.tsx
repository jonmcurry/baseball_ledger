/**
 * AuthGuard
 *
 * Route guard that checks authentication status.
 * Redirects to /login if not authenticated after initialization.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

export function AuthGuard() {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
