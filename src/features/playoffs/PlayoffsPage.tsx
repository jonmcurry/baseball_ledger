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
import { usePageTitle } from '@hooks/usePageTitle';

export function PlayoffsPage() {
  usePageTitle('Playoffs');
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
    <div>
      <div className="broadcast-bar">
        <h2 className="broadcast-team">Playoffs</h2>
      </div>

      {error && <ErrorBanner severity="error" message={error} />}

      {!isPlayoffActive && (
        <div className="panel mt-gutter">
          <div className="panel-header">
            <span>Playoff Status</span>
          </div>
          <div className="panel-body">
            <p className="font-headline text-sm font-bold text-[var(--text-primary)]">Playoffs Not Started</p>
            <p className="text-xs text-[var(--text-secondary)]">The regular season must be completed first.</p>
          </div>
        </div>
      )}

      {isPlayoffActive && playoffBracket?.worldSeriesChampionId && (
        <div className="broadcast-bar mt-gutter" style={{ background: 'var(--accent-secondary)' }}>
          <div className="text-center">
            <p className="broadcast-label">World Series Champion</p>
            <p className="broadcast-team text-type-5">
              {getTeamName(playoffBracket.worldSeriesChampionId)}
            </p>
          </div>
        </div>
      )}

      {isPlayoffActive && hasBracket && (
        <div className="grid gap-gutter lg:grid-cols-12 mt-gutter">
          <div className="lg:col-span-5">
            <div className="panel">
              <div className="panel-header">
                <span>American League</span>
              </div>
              <div className="panel-body">
                <PlayoffBracketView bracket={playoffBracket.al} teams={teamNameMap} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="panel">
              <div className="panel-header">
                <span>World Series</span>
              </div>
              <div className="panel-body">
                <SeriesCard
                  series={playoffBracket.worldSeries}
                  homeTeam={getTeamName(playoffBracket.worldSeries.higherSeed?.teamId)}
                  awayTeam={getTeamName(playoffBracket.worldSeries.lowerSeed?.teamId)}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="panel">
              <div className="panel-header">
                <span>National League</span>
              </div>
              <div className="panel-body">
                <PlayoffBracketView bracket={playoffBracket.nl} teams={teamNameMap} />
              </div>
            </div>
          </div>
        </div>
      )}

      {isPlayoffActive && !hasBracket && (
        <p className="text-xs text-[var(--text-secondary)] mt-gutter">Playoff bracket has not been set.</p>
      )}
    </div>
  );
}

export default PlayoffsPage;
