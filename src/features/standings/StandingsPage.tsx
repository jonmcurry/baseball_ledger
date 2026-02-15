/**
 * StandingsPage
 *
 * Full standings view with division standings.
 */

import { useLeague } from '@hooks/useLeague';
import { StandingsTable } from '@components/data-display/StandingsTable';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { usePageTitle } from '@hooks/usePageTitle';

export function StandingsPage() {
  usePageTitle('Standings');
  const { standings, isLoading, error } = useLeague();

  if (isLoading) {
    return <LoadingLedger message="Loading standings..." />;
  }

  return (
    <div className="space-y-gutter-lg">
      {/* Page header */}
      <div>
        <h2
          className="font-display text-2xl tracking-[0.2em] uppercase text-[var(--accent-primary)] md:text-3xl"
          style={{
            textShadow: '1px 1px 0 rgba(255,255,255,0.6), -0.5px -0.5px 0 rgba(0,0,0,0.06)',
          }}
        >
          Standings
        </h2>
        <div className="mt-1 h-px w-16 bg-[var(--accent-primary)] opacity-40" aria-hidden="true" />
      </div>

      {error && <ErrorBanner severity="error" message={error} />}

      <StandingsTable
        standings={standings}
        userTeamId=""
        onTeamClick={() => {}}
      />
    </div>
  );
}

export default StandingsPage;
