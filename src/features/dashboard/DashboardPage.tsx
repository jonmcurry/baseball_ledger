/**
 * DashboardPage
 *
 * Main league dashboard with vintage ballpark scoreboard aesthetic.
 * Standings, schedule, and simulation controls with golden era styling.
 *
 * REQ-STATE-014: useRealtimeProgress triggers cache invalidation after simulation.
 * REQ-SCH-007: SimulationNotification shows typewriter results after simulation.
 * REQ-SCH-009: SeasonCompletePanel shows champion and archive button when completed.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { TeamSetupPanel } from './TeamSetupPanel';
import { apiPost } from '@services/api-client';
import { useLeagueStore } from '@stores/leagueStore';
import { useAuth } from '@hooks/useAuth';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { league, teams, standings, schedule, playoffBracket, currentDay, isLoading, error, isCommissioner, leagueStatus } = useLeague();
  const { status, totalDays, completedGames, isRunning, progressPct, runSimulation, lastPlayoffResult } = useSimulation();

  // REQ-STATE-014: Cache invalidation on simulation completion
  useRealtimeProgress(league?.id ?? null);

  // REQ-SCH-009: Season completion ceremony
  const [isArchiving, setIsArchiving] = useState(false);
  const [isStartingSeason, setIsStartingSeason] = useState(false);
  const [isStartingDraft, setIsStartingDraft] = useState(false);

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

  const handleStartDraft = async () => {
    if (!league) return;
    setIsStartingDraft(true);
    try {
      await apiPost(`/api/leagues/${league.id}/draft`, { action: 'start' });
      await useLeagueStore.getState().fetchLeagueData(league.id);
      navigate('../draft');
    } catch {
      // Error reflected in league store
    } finally {
      setIsStartingDraft(false);
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

      {/* Header with pennant styling */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="pennant-header">
            {league?.name ?? 'Dashboard'}
          </h2>
          {league && (
            <p className="mt-1 font-stat text-sm text-[var(--color-muted)]">
              Day {currentDay} of Season {league.seasonYear} — {league.status.replace('_', ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Setup phase panels */}
      {league?.status === 'setup' && (
        league.seasonYear > 1 ? (
          <NewSeasonPanel
            seasonYear={league.seasonYear}
            isCommissioner={isCommissioner}
            onStartSeason={handleStartSeason}
            isStarting={isStartingSeason}
          />
        ) : (
          <TeamSetupPanel
            teams={teams}
            isCommissioner={isCommissioner}
            userId={user?.id ?? null}
            onStartDraft={handleStartDraft}
            isStartingDraft={isStartingDraft}
            inviteKey={league.inviteKey}
          />
        )
      )}

      {/* Drafting banner */}
      {league?.status === 'drafting' && (
        <div
          className="vintage-card relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--color-scoreboard-green) 0%, #0A1520 100%)',
            borderColor: 'var(--color-gold)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(135deg, var(--color-gold) 0%, #B8860B 100%)',
                boxShadow: '0 0 15px var(--color-gold)',
              }}
            >
              <svg
                className="h-6 w-6 text-[var(--color-ink)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5h3V8h4v4h3l-5 5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-[var(--color-gold)]">
                Draft In Progress
              </h3>
              <p className="font-stat text-sm text-[var(--color-scoreboard-text)]/80">
                The league draft is underway. Head to the Draft Board to make your picks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('../draft')}
              className="btn-vintage-primary"
            >
              Go to Draft Board
            </button>
          </div>
        </div>
      )}

      {/* Results ticker */}
      {recentResults.length > 0 && (
        <ResultsTicker results={recentResults} />
      )}

      {/* Simulation controls or season complete */}
      {leagueStatus === 'completed' ? (
        <SeasonCompletePanel
          championName={championName}
          isCommissioner={isCommissioner}
          onArchive={handleArchive}
          isArchiving={isArchiving}
        />
      ) : (leagueStatus === 'regular_season' || leagueStatus === 'playoffs') ? (
        <SimulationControls
          isRunning={isRunning}
          progressPct={progressPct}
          onSimulate={handleSimulate}
          leagueStatus={leagueStatus}
        />
      ) : null}

      {/* Simulation notification */}
      {showNotification && (
        <SimulationNotification
          daysSimulated={totalDays}
          gamesCompleted={completedGames}
          isVisible={showNotification}
          onDismiss={() => setShowNotification(false)}
          playoffMessage={playoffMessage}
        />
      )}

      {/* Main content grid -- hidden during setup (empty standings/schedule) */}
      {league?.status !== 'setup' && (
        <div className="grid grid-cols-1 gap-gutter-lg md:grid-cols-2">
          {/* Standings */}
          <div className="vintage-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)]/20">
                <svg
                  className="h-5 w-5 text-[var(--accent-primary)]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 5v14h18V5H3zm4 2v2H5V7h2zm-2 6v-2h2v2H5zm0 2h2v2H5v-2zm14 2H9v-2h10v2zm0-4H9v-2h10v2zm0-4H9V7h10v2z" />
                </svg>
              </div>
              <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                Standings
              </h3>
            </div>
            <StandingsTable
              standings={standings}
              userTeamId=""
              onTeamClick={() => {}}
            />
          </div>

          {/* Schedule or Playoff status */}
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
      )}
    </div>
  );
}

export default DashboardPage;
