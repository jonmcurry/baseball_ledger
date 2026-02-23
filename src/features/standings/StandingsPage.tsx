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
    <div>
      <div className="page-header">
        <h2 className="page-header-title">Division Races</h2>
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
