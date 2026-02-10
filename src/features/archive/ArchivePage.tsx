/**
 * ArchivePage
 *
 * Historical season archive and records.
 * Fetches archived seasons via useArchive hook.
 * Shows StampAnimation when league status is 'completed'.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useState } from 'react';
import { useLeague } from '@hooks/useLeague';
import { useArchive } from '@hooks/useArchive';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { StampAnimation } from '@components/feedback/StampAnimation';
import { SeasonList } from './SeasonList';
import { SeasonDetail } from './SeasonDetail';

export function ArchivePage() {
  const { league, standings, isLoading, error, leagueStatus } = useLeague();
  const { seasons: archivedSeasons, isLoading: archiveLoading, error: archiveError } = useArchive(league?.id ?? '');
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  const loading = isLoading || archiveLoading;
  const displayError = error || archiveError;
  const seasonJustCompleted = leagueStatus === 'completed';

  if (loading) {
    return <LoadingLedger message="Loading archives..." />;
  }

  const seasonListData = archivedSeasons.map((s) => ({
    id: s.id,
    year: s.seasonNumber,
    champion: s.champion ?? 'Unknown',
    runnerUp: '',
  }));

  const selectedArchive = archivedSeasons.find((s) => s.id === selectedSeason);

  return (
    <div className="space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Archive</h2>

      <StampAnimation isVisible={seasonJustCompleted} />

      {displayError && <ErrorBanner severity="error" message={displayError} />}

      {!selectedSeason && (
        <SeasonList
          seasons={seasonListData}
          onSelect={setSelectedSeason}
        />
      )}

      {selectedSeason && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelectedSeason(null)}
            className="text-xs text-ballpark hover:underline"
          >
            Back to Archive
          </button>
          <SeasonDetail
            year={selectedArchive?.seasonNumber ?? 0}
            champion={selectedArchive?.champion ?? 'Unknown'}
            standings={standings}
          />
        </div>
      )}
    </div>
  );
}

export default ArchivePage;
