/**
 * PlayoffsPage
 *
 * Playoff bracket viewer with series progress.
 * Loads persisted bracket from league data (FullPlayoffBracket).
 * Renders AL bracket, NL bracket, and World Series section.
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
import { SeriesCard } from './SeriesCard';

export function PlayoffsPage() {
  const { teams, playoffBracket, isLoading, error, leagueStatus } = useLeague();
  usePostseasonTheme();

  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => map.set(t.id, `${t.city} ${t.name}`));
    return map;
  }, [teams]);

  const getTeamName = (teamId: string | null | undefined) =>
    teamId ? (teamNameMap.get(teamId) ?? 'TBD') : 'TBD';

  if (isLoading) {
    return <LoadingLedger message="Loading playoffs..." />;
  }

  const isPlayoffActive = leagueStatus === 'playoffs' || leagueStatus === 'completed';
  const hasBracket = playoffBracket !== null;

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

      {isPlayoffActive && playoffBracket?.worldSeriesChampionId && (
        <div className="rounded-card border-2 border-ballpark bg-ballpark/10 px-gutter py-4 text-center">
          <p className="text-xs font-medium text-muted">World Series Champion</p>
          <p className="font-headline text-xl font-bold text-ballpark">
            {getTeamName(playoffBracket.worldSeriesChampionId)}
          </p>
        </div>
      )}

      {isPlayoffActive && hasBracket && (
        <div className="grid gap-gutter lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h3 className="mb-2 font-headline text-sm font-bold text-ballpark">
              American League
            </h3>
            <PlayoffBracketView bracket={playoffBracket.al} teams={teamNameMap} />
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-2 font-headline text-sm font-bold text-ballpark">
              World Series
            </h3>
            <SeriesCard
              series={playoffBracket.worldSeries}
              homeTeam={getTeamName(playoffBracket.worldSeries.higherSeed?.teamId)}
              awayTeam={getTeamName(playoffBracket.worldSeries.lowerSeed?.teamId)}
            />
          </div>

          <div className="lg:col-span-5">
            <h3 className="mb-2 font-headline text-sm font-bold text-ballpark">
              National League
            </h3>
            <PlayoffBracketView bracket={playoffBracket.nl} teams={teamNameMap} />
          </div>
        </div>
      )}

      {isPlayoffActive && !hasBracket && (
        <p className="text-xs text-muted">Playoff bracket has not been set.</p>
      )}
    </div>
  );
}

export default PlayoffsPage;
