/**
 * AuthenticatedLayout
 *
 * Composes AppShell + Header + Footer for authenticated routes.
 * Renders child routes via Outlet.
 * Loads league data from URL :leagueId param into leagueStore.
 * Shows WARN-severity ErrorBanner when localStorage is unavailable (REQ-STATE-010).
 */

import { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '@components/layout/AppShell';
import { Header } from '@components/layout/Header';
import type { LeagueStatus } from '@components/layout/Header';
import { Footer } from '@components/layout/Footer';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { isMemoryFallback } from '@stores/storage-factory';
import { useLeagueStore } from '@stores/leagueStore';
import { useAuth } from '@hooks/useAuth';

const STATUS_MAP: Record<string, LeagueStatus> = {
  setup: 'setup',
  drafting: 'draft',
  regular_season: 'regular_season',
  playoffs: 'playoffs',
  offseason: 'offseason',
};

export function AuthenticatedLayout() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();

  const league = useLeagueStore((s) => s.league);
  const activeLeagueId = useLeagueStore((s) => s.activeLeagueId);
  const isLoading = useLeagueStore((s) => s.isLoading);
  const fetchLeagueData = useLeagueStore((s) => s.fetchLeagueData);

  useEffect(() => {
    if (leagueId && leagueId !== activeLeagueId) {
      fetchLeagueData(leagueId);
    }
  }, [leagueId, activeLeagueId, fetchLeagueData]);

  const leagueName = league?.name ?? 'Baseball Ledger';
  const leagueStatus = STATUS_MAP[league?.status ?? 'setup'] ?? 'setup';
  const userName = user?.displayName ?? user?.email ?? 'Player';
  const isCommissioner = league?.commissionerId === user?.id;

  const handleNavigate = (route: string) => {
    if (leagueId) {
      navigate(`/leagues/${leagueId}${route}`);
    }
  };

  const handleLogout = () => {
    authLogout();
    navigate('/');
  };

  if (isLoading && !league) {
    return <LoadingLedger message="Loading league..." />;
  }

  return (
    <AppShell>
      <Header
        leagueName={leagueName}
        leagueStatus={leagueStatus}
        userName={userName}
        isCommissioner={isCommissioner}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      {isMemoryFallback() && (
        <div className="px-gutter pt-gutter">
          <ErrorBanner
            severity="warning"
            message="Browser storage unavailable -- data will not persist between sessions."
          />
        </div>
      )}
      <div className="py-gutter-lg">
        <Outlet />
      </div>
      <Footer />
    </AppShell>
  );
}

export default AuthenticatedLayout;
