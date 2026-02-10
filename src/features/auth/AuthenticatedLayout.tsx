/**
 * AuthenticatedLayout
 *
 * Composes AppShell + Header + Footer for authenticated routes.
 * Renders child routes via Outlet.
 */

import { Outlet } from 'react-router-dom';
import { AppShell } from '@components/layout/AppShell';
import { Header } from '@components/layout/Header';
import { Footer } from '@components/layout/Footer';

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
      <div className="py-gutter-lg">
        <Outlet />
      </div>
      <Footer />
    </AppShell>
  );
}

export default AuthenticatedLayout;
