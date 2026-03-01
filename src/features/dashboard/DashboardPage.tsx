/**
 * DashboardPage
 *
 * ESPN-style dashboard: scoreboard strip, season toolbar, data grid.
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
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { HeadlineInterrupt } from '@components/feedback/HeadlineInterrupt';
import { SimulationControls } from './SimulationControls';
import { SeasonScheduleView } from './SeasonScheduleView';
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
  usePageTitle('Season');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { league, teams, schedule, playoffBracket, currentDay, isLoading, error, isCommissioner, leagueStatus } = useLeague();
  const { status, totalDays, completedGames, isRunning, progressPct, runSimulation, lastPlayoffResult } = useSimulation();

  // REQ-STATE-014: Cache invalidation on simulation completion
  useRealtimeProgress(league?.id ?? null);

  // REQ-SCH-009: Season completion ceremony
  const [isArchiving, setIsArchiving] = useState(false);
  const [isStartingSeason, setIsStartingSeason] = useState(false);
  const [isStartingDraft, setIsStartingDraft] = useState(false);

  // HeadlineInterrupt: championship events
  const [showHeadline, setShowHeadline] = useState(false);
  const [headlineText, setHeadlineText] = useState('');

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

  // Trigger HeadlineInterrupt when playoffs complete with a champion
  useEffect(() => {
    if (lastPlayoffResult?.isPlayoffsComplete && playoffBracket?.worldSeriesChampionId) {
      setHeadlineText(`${championName} Win the World Series!`);
      setShowHeadline(true);
    }
  }, [lastPlayoffResult?.isPlayoffsComplete, playoffBracket?.worldSeriesChampionId, championName]);

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

  // Repair: auto-generate missing schedule/lineups after draft completion timeout
  const [isRepairing, setIsRepairing] = useState(false);
  useEffect(() => {
    if (!league?.id || isRepairing || isLoading) return;
    if (leagueStatus === 'regular_season' && schedule.length === 0 && currentDay === 0) {
      setIsRepairing(true);
      apiPost(`/api/leagues/${league.id}/schedule`)
        .then(() => useLeagueStore.getState().fetchLeagueData(league.id))
        .catch(() => { /* error reflected in league store */ })
        .finally(() => setIsRepairing(false));
    }
  }, [league?.id, leagueStatus, schedule.length, currentDay, isLoading, isRepairing]);

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

  const isInSeason = leagueStatus === 'regular_season' || leagueStatus === 'playoffs' || leagueStatus === 'completed';

  return (
    <div>
      {error && <ErrorBanner severity="error" message={error} />}

      {/* REQ-SCH-009: Championship headline interrupt */}
      <HeadlineInterrupt
        headline={headlineText}
        subheadline="A new champion is crowned"
        isVisible={showHeadline}
        onDismiss={() => setShowHeadline(false)}
      />

      {/* Fallback heading when no league/status */}
      {!isInSeason && !league?.status && (
        <h2 className="toolbar-label mt-gutter">Season</h2>
      )}

      {/* Scoreboard strip -- dark navy bar with recent scores */}
      {isInSeason && recentResults.length > 0 && (
        <ResultsTicker results={recentResults} onGameClick={(gameId) => navigate(`../game/${gameId}`)} />
      )}

      {/* Season toolbar -- title + day progress + simulation controls */}
      {isInSeason && (
        <div className="toolbar flex-wrap" style={{ height: 'auto', minHeight: 'var(--toolbar-height)', padding: 'var(--gutter) var(--gutter)' }}>
          <div className="toolbar-group">
            <h2 className="toolbar-label">Season {league?.seasonYear ?? ''}</h2>
            <span className="toolbar-context">Day {currentDay} of 162</span>
          </div>
          <div className="toolbar-spacer" />
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
        </div>
      )}

      {/* Setup phase panels */}
      {league?.status === 'setup' && (
        <div className="mt-gutter-lg">
          <h2 className="toolbar-label mb-gutter">Season {league?.seasonYear ?? ''}</h2>
          {league.seasonYear > 1 ? (
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
          )}
        </div>
      )}

      {/* Drafting banner */}
      {league?.status === 'drafting' && (
        <div className="broadcast-bar mt-gutter-lg flex items-center gap-4">
          <div className="flex-1">
            <span className="broadcast-badge">Live</span>
            <h3 className="broadcast-team text-type-3 mt-1">
              Draft In Progress
            </h3>
            <p className="broadcast-label mt-0.5">
              The league draft is underway. Head to the Draft Board to make your picks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('../draft')}
            className="btn-vintage btn-vintage-primary"
          >
            Go to Draft Board
          </button>
        </div>
      )}

      {/* Schedule / Playoffs */}
      {isInSeason && (
        <div className="panel mt-gutter-lg">
          <div className="panel-header">
            {leagueStatus === 'playoffs' && playoffBracket ? (
              <span>Playoffs</span>
            ) : (
              <span>Schedule</span>
            )}
          </div>
          <div className="panel-body">
            {leagueStatus === 'playoffs' && playoffBracket ? (
              <PlayoffStatusPanel
                playoffBracket={playoffBracket}
                teams={teams}
                lastGameResult={lastPlayoffResult}
              />
            ) : (
              <SeasonScheduleView
                schedule={schedule}
                teams={teams}
                currentDay={currentDay}
                onGameClick={(gameId) => navigate(`../game/${gameId}`)}
              />
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}

export default DashboardPage;
