/**
 * ArchivePage
 *
 * Historical season archive and records.
 * Fetches archived seasons via useArchive hook.
 * Shows StampAnimation when league status is 'completed'.
 *
 * REQ-SCH-009: Archive detail with champion, playoff results, league leaders.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useLeague } from '@hooks/useLeague';
import { useArchive } from '@hooks/useArchive';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { StampAnimation } from '@components/feedback/StampAnimation';
import { SeasonList } from './SeasonList';
import { SeasonDetail } from './SeasonDetail';

export function ArchivePage() {
  const { league, isLoading, error, leagueStatus } = useLeague();
  const {
    seasons: archivedSeasons,
    isLoading: archiveLoading,
    error: archiveError,
    detail,
    detailLoading,
    fetchDetail,
    clearDetail,
  } = useArchive(league?.id ?? '');

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

  const handleSelect = (seasonId: string) => {
    fetchDetail(seasonId);
  };

  const handleBack = () => {
    clearDetail();
  };

  return (
    <div className="space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Archive</h2>

      <StampAnimation isVisible={seasonJustCompleted} />

      {displayError && <ErrorBanner severity="error" message={displayError} />}

      {!detail && (
        <SeasonList
          seasons={seasonListData}
          onSelect={handleSelect}
        />
      )}

      {detailLoading && <LoadingLedger message="Loading season detail..." />}

      {detail && !detailLoading && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleBack}
            className="text-xs text-ballpark hover:underline"
          >
            Back to Archive
          </button>
          <SeasonDetail
            year={detail.seasonNumber}
            champion={detail.champion ?? 'Unknown'}
            playoffResults={detail.playoffResults}
            leagueLeaders={detail.leagueLeaders}
          />
        </div>
      )}
    </div>
  );
}

export default ArchivePage;
