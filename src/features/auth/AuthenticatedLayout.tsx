/**
 * AuthenticatedLayout
 *
 * Composes AppShell + Header + Footer for authenticated routes.
 * Renders child routes via Outlet.
 * Shows WARN-severity ErrorBanner when localStorage is unavailable (REQ-STATE-010).
 */

import { Outlet } from 'react-router-dom';
import { AppShell } from '@components/layout/AppShell';
import { Header } from '@components/layout/Header';
import { Footer } from '@components/layout/Footer';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { isMemoryFallback } from '@stores/storage-factory';

export function AuthenticatedLayout() {
  // Mock data until hooks layer is wired
  const leagueName = 'Baseball Ledger';
  const leagueStatus = 'regular_season' as const;
  const userName = 'Player';
  const isCommissioner = true;

  return (
    <AppShell>
      <Header
        leagueName={leagueName}
        leagueStatus={leagueStatus}
        userName={userName}
        isCommissioner={isCommissioner}
        onNavigate={() => {}}
        onLogout={() => {}}
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
