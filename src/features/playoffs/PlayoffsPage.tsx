/**
 * PlayoffsPage
 *
 * Playoff bracket viewer with series progress.
 * Postseason theme is active when this page renders.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useMemo } from 'react';
import { useLeague } from '@hooks/useLeague';
import { usePostseasonTheme } from '@hooks/usePostseasonTheme';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { PlayoffBracketView } from './PlayoffBracketView';
import type { PlayoffBracket } from '@lib/types/schedule';

export function PlayoffsPage() {
  const { teams, isLoading, error, leagueStatus } = useLeague();
  usePostseasonTheme();

  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => map.set(t.id, `${t.city} ${t.name}`));
    return map;
  }, [teams]);

  if (isLoading) {
    return <LoadingLedger message="Loading playoffs..." />;
  }

  // Placeholder bracket until live data is available
  const bracket: PlayoffBracket = {
    leagueId: '',
    rounds: [],
    championId: null,
  };

  const isPlayoffActive = leagueStatus === 'playoffs';

  return (
    <div className="space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Playoffs</h2>

      {error && <ErrorBanner severity="error" message={error} />}

      {!isPlayoffActive && (
        <div className="rounded-card border border-sandstone bg-old-lace px-gutter py-3">
          <p className="font-headline text-sm font-bold text-ink">Playoffs Not Started</p>
          <p className="text-xs text-muted">The regular season must be completed first.</p>
        </div>
      )}

      {isPlayoffActive && (
        <PlayoffBracketView bracket={bracket} teams={teamNameMap} />
      )}
    </div>
  );
}
