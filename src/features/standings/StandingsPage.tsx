/**
 * StandingsPage
 *
 * Full standings view with division standings.
 */

import { useLeague } from '@hooks/useLeague';
import { StandingsTable } from '@components/data-display/StandingsTable';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';

export function StandingsPage() {
  const { standings, isLoading, error } = useLeague();

  if (isLoading) {
    return <LoadingLedger message="Loading standings..." />;
  }

  return (
    <div className="space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Standings</h2>

      {error && <ErrorBanner severity="error" message={error} />}

      <StandingsTable
        standings={standings}
        userTeamId=""
        onTeamClick={() => {}}
      />
    </div>
  );
}
