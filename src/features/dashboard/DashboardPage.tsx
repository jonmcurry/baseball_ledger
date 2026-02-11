/**
 * DashboardPage
 *
 * Main league dashboard with standings, today's schedule, and simulation controls.
 * Wires useLeague + useSimulation + useRealtimeProgress hooks to presentational components.
 *
 * REQ-STATE-014: useRealtimeProgress triggers cache invalidation after simulation.
 * REQ-SCH-007: SimulationNotification shows typewriter results after simulation.
 * REQ-SCH-009: SeasonCompletePanel shows champion and archive button when completed.
 */

import { useState, useEffect, useMemo } from 'react';
import { useLeague } from '@hooks/useLeague';
import { useSimulation } from '@hooks/useSimulation';
import { useRealtimeProgress } from '@hooks/useRealtimeProgress';
import { StandingsTable } from '@components/data-display/StandingsTable';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { SimulationControls } from './SimulationControls';
import { ScheduleView } from './ScheduleView';
import { ResultsTicker } from './ResultsTicker';
import type { TickerResult } from './ResultsTicker';
import { SimulationNotification } from './SimulationNotification';
import { SeasonCompletePanel } from './SeasonCompletePanel';
import { NewSeasonPanel } from './NewSeasonPanel';
import { PlayoffStatusPanel } from './PlayoffStatusPanel';
import { InviteKeyDisplay } from '@features/league/InviteKeyDisplay';
import { apiPost } from '@services/api-client';
import { useLeagueStore } from '@stores/leagueStore';
import { buildPlayoffGameMessage } from '@lib/schedule/playoff-display';
import { usePageTitle } from '@hooks/usePageTitle';

const SCOPE_TO_DAYS: Record<string, number | 'season'> = {
  day: 1,
  week: 7,
  month: 30,
  season: 162,
};

export function DashboardPage() {
  usePageTitle('Dashboard');
  const { league, teams, standings, schedule, playoffBracket, currentDay, isLoading, error, isCommissioner, leagueStatus } = useLeague();
  const { status, totalDays, completedGames, isRunning, progressPct, runSimulation, lastPlayoffResult } = useSimulation();

  // REQ-STATE-014: Cache invalidation on simulation completion
  useRealtimeProgress(league?.id ?? null);

  // REQ-SCH-009: Season completion ceremony
  const [isArchiving, setIsArchiving] = useState(false);
  const [isStartingSeason, setIsStartingSeason] = useState(false);

  const championName = useMemo(() => {
    if (!playoffBracket?.worldSeriesChampionId) return 'Unknown';
    const team = teams.find((t) => t.id === playoffBracket.worldSeriesChampionId);
    return team ? `${team.city} ${team.name}` : 'Unknown';
  }, [playoffBracket, teams]);

  // REQ-LGE-009: Playoff notification message
  const playoffMessage = useMemo(() => {
    if (!lastPlayoffResult) return undefined;
    const home = teams.find((t) => t.id === lastPlayoffResult.homeTeamId);
    const away = teams.find((t) => t.id === lastPlayoffResult.awayTeamId);
    return buildPlayoffGameMessage({
      round: lastPlayoffResult.round,
      gameNumber: lastPlayoffResult.gameNumber,
      homeTeamName: home?.name ?? lastPlayoffResult.homeTeamId,
      awayTeamName: away?.name ?? lastPlayoffResult.awayTeamId,
      homeScore: lastPlayoffResult.homeScore,
      awayScore: lastPlayoffResult.awayScore,
      isPlayoffsComplete: lastPlayoffResult.isPlayoffsComplete,
    });
  }, [lastPlayoffResult, teams]);

  const handleArchive = async () => {
    if (!league) return;
    setIsArchiving(true);
    try {
      await apiPost(`/api/leagues/${league.id}/archive`);
      await useLeagueStore.getState().fetchLeagueData(league.id);
    } catch {
      // Error reflected in league store
    } finally {
      setIsArchiving(false);
    }
  };

  const handleStartSeason = async () => {
    if (!league) return;
    setIsStartingSeason(true);
    try {
      await apiPost(`/api/leagues/${league.id}/schedule`);
      await useLeagueStore.getState().fetchLeagueData(league.id);
    } catch {
      // Error reflected in league store
    } finally {
      setIsStartingSeason(false);
    }
  };

  // REQ-SCH-007: Typewriter results notification
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (status === 'complete' && completedGames > 0) {
      setShowNotification(true);
    } else if (status === 'running') {
      setShowNotification(false);
    }
  }, [status, completedGames]);

  const handleSimulate = (scope: 'day' | 'week' | 'month' | 'season') => {
    if (!league) return;
    const days = SCOPE_TO_DAYS[scope] ?? 1;
    runSimulation(league.id, days);
  };

  if (isLoading) {
    return <LoadingLedger message="Loading league data..." />;
  }

  const todaySchedule = schedule.find((d) => d.dayNumber === currentDay) ?? null;

  // Build ticker results from the most recent completed games
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const recentResults: TickerResult[] = [];
  for (const day of schedule) {
    for (const game of day.games) {
      if (game.isComplete && game.homeScore !== null && game.awayScore !== null) {
        const home = teamMap.get(game.homeTeamId);
        const away = teamMap.get(game.awayTeamId);
        recentResults.push({
          gameId: game.id,
          homeName: home?.name ?? game.homeTeamId,
          awayName: away?.name ?? game.awayTeamId,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
        });
      }
    }
  }

  return (
    <div className="space-y-gutter-lg">
      {error && <ErrorBanner severity="error" message={error} />}

      <div>
        <h2 className="font-headline text-2xl font-bold text-ballpark">
          {league?.name ?? 'Dashboard'}
        </h2>
        {league && (
          <p className="mt-1 text-sm text-muted">
            Day {currentDay} -- {league.status.replace('_', ' ')}
          </p>
        )}
      </div>

      {league?.status === 'setup' && (
        league.seasonYear > 1 ? (
          <NewSeasonPanel
            seasonYear={league.seasonYear}
            isCommissioner={isCommissioner}
            onStartSeason={handleStartSeason}
            isStarting={isStartingSeason}
          />
        ) : league.inviteKey ? (
          <InviteKeyDisplay inviteKey={league.inviteKey} />
        ) : null
      )}

      {recentResults.length > 0 && (
        <ResultsTicker results={recentResults} />
      )}

      {leagueStatus === 'completed' ? (
        <SeasonCompletePanel
          championName={championName}
          isCommissioner={isCommissioner}
          onArchive={handleArchive}
          isArchiving={isArchiving}
        />
      ) : (
        <SimulationControls
          isRunning={isRunning}
          progressPct={progressPct}
          onSimulate={handleSimulate}
          leagueStatus={leagueStatus}
        />
      )}

      {showNotification && (
        <SimulationNotification
          daysSimulated={totalDays}
          gamesCompleted={completedGames}
          isVisible={showNotification}
          onDismiss={() => setShowNotification(false)}
          playoffMessage={playoffMessage}
        />
      )}

      <div className="grid grid-cols-1 gap-gutter-lg md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-headline text-lg font-bold text-ballpark">
            Standings
          </h3>
          <StandingsTable
            standings={standings}
            userTeamId=""
            onTeamClick={() => {}}
          />
        </div>
        <div>
          {leagueStatus === 'playoffs' && playoffBracket ? (
            <PlayoffStatusPanel
              playoffBracket={playoffBracket}
              teams={teams}
              lastGameResult={lastPlayoffResult}
            />
          ) : (
            <ScheduleView day={todaySchedule} teams={teams} />
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
