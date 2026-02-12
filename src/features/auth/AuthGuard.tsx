/**
 * AuthGuard
 *
 * Route guard that checks authentication status.
 * Redirects to /login if not authenticated after initialization.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { LoadingLedger } from '@components/feedback/LoadingLedger';

export function AuthGuard() {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return <LoadingLedger message="Initializing..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default AuthGuard;
