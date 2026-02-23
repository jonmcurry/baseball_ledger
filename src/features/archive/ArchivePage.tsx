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

import { useMemo } from 'react';
import { useLeague } from '@hooks/useLeague';
import { useArchive } from '@hooks/useArchive';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { StampAnimation } from '@components/feedback/StampAnimation';
import { SeasonList } from './SeasonList';
import { SeasonDetail } from './SeasonDetail';
import { usePageTitle } from '@hooks/usePageTitle';

/** Map a season year to its baseball era for thematic CSS variable scoping. */
export function getBaseballEra(year: number): string {
  if (year <= 1919) return 'deadball';
  if (year <= 1941) return 'liveball';
  if (year <= 1960) return 'golden';
  if (year <= 1976) return 'expansion';
  if (year <= 1993) return 'freeagent';
  if (year <= 2005) return 'steroid';
  return 'modern';
}

export function ArchivePage() {
  usePageTitle('Season Archive');
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

  // Compute era for thematic CSS variable scoping when viewing detail
  const era = useMemo(() => {
    if (!detail) return undefined;
    return getBaseballEra(detail.seasonNumber);
  }, [detail]);

  const handleSelect = (seasonId: string) => {
    fetchDetail(seasonId);
  };

  const handleBack = () => {
    clearDetail();
  };

  return (
    <div data-era={era}>
      <div className="page-header">
        <h2 className="page-header-title">Past Seasons</h2>
      </div>

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
