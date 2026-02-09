/**
 * ArchivePage
 *
 * Historical season archive and records.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useState } from 'react';
import { useLeague } from '@hooks/useLeague';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { SeasonList } from './SeasonList';
import { SeasonDetail } from './SeasonDetail';
import type { ArchivedSeason } from './SeasonList';

export function ArchivePage() {
  const { standings, isLoading, error } = useLeague();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  // Placeholder: archive data would come from an archive service
  const archivedSeasons: ArchivedSeason[] = [];

  if (isLoading) {
    return <LoadingLedger message="Loading archives..." />;
  }

  return (
    <div className="space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Archive</h2>

      {error && <ErrorBanner severity="error" message={error} />}

      {!selectedSeason && (
        <SeasonList
          seasons={archivedSeasons}
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
            year={2024}
            champion="TBD"
            standings={standings}
          />
        </div>
      )}
    </div>
  );
}
