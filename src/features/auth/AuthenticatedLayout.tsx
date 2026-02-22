/**
 * AuthenticatedLayout
 *
 * Composes BroadsheetShell + Masthead + FolioNav + Colophon for authenticated routes.
 * Renders child routes via Outlet.
 * Loads league data from URL :leagueId param into leagueStore.
 * Shows WARN-severity ErrorBanner when localStorage is unavailable (REQ-STATE-010).
 */

import { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { BroadsheetShell } from '@components/layout/BroadsheetShell';
import { Masthead } from '@components/layout/Masthead';
import { FolioNav } from '@components/layout/FolioNav';
import type { LeagueStatus } from '@components/layout/FolioNav';
import { Colophon } from '@components/layout/Colophon';
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

  const seasonInfo = league
    ? `Season ${league.seasonYear}`
    : undefined;

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
    <BroadsheetShell
      masthead={
        <Masthead
          leagueName={leagueName}
          seasonInfo={seasonInfo}
          userName={userName}
          onLogout={handleLogout}
        />
      }
      folio={
        <FolioNav
          leagueId={leagueId}
          leagueStatus={leagueStatus}
          isCommissioner={isCommissioner}
          onNavigate={handleNavigate}
        />
      }
      colophon={<Colophon />}
    >
      {isMemoryFallback() && (
        <div className="mb-gutter">
          <ErrorBanner
            severity="warning"
            message="Browser storage unavailable -- data will not persist between sessions."
          />
        </div>
      )}
      <Outlet />
    </BroadsheetShell>
  );
}

export default AuthenticatedLayout;
