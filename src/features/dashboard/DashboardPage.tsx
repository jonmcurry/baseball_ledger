/**
 * DashboardPage
 *
 * Bento-grid dashboard with simulation controls, scores, and schedule.
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

  // HeadlineInterrupt: "STOP THE PRESSES" for championship events
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
    <div className="space-y-gutter-lg">
      {error && <ErrorBanner severity="error" message={error} />}

      {/* REQ-SCH-009: Championship headline interrupt */}
      <HeadlineInterrupt
        headline={headlineText}
        subheadline="A new champion is crowned"
        isVisible={showHeadline}
        onDismiss={() => setShowHeadline(false)}
      />

      {/* Page header */}
      <div className="page-header">
        <h2 className="page-header-title">Season {league?.seasonYear ?? ''}</h2>
        {isInSeason && (
          <span className="page-header-context">Day {currentDay} of 162</span>
        )}
      </div>

      {/* Setup phase panels (full-width, above bento grid) */}
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
          style={{ borderLeft: '3px solid var(--accent-secondary)' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="kicker">Breaking</p>
              <h3 className="font-headline text-type-4 font-bold text-[var(--text-primary)]">
                Draft In Progress
              </h3>
              <p className="font-body text-type-1 text-[var(--text-secondary)] mt-1">
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

      {/* Bento grid for in-season content */}
      {isInSeason && (
        <div className="bento-grid">
          {/* Simulation controls (2-col wide) */}
          <div className="bento-card bento-card--2x1">
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

          {/* Season progress (1x1) */}
          <div className="bento-card">
            <p className="bento-card-label">Season</p>
            <p className="font-stat text-3xl font-bold text-[var(--text-primary)] leading-none">
              Day {currentDay}
            </p>
            <p className="font-stat text-xs text-[var(--text-tertiary)] mt-1">of 162</p>
          </div>

          {/* Quick nav (1x1) */}
          <div className="bento-card">
            <p className="bento-card-label">League</p>
            <div className="space-y-1.5 mt-1">
              <button type="button" onClick={() => navigate('../standings')} className="block w-full text-left font-body text-sm text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] transition-colors">Standings</button>
              <button type="button" onClick={() => navigate('../stats')} className="block w-full text-left font-body text-sm text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] transition-colors">Leaders</button>
              <button type="button" onClick={() => navigate('../roster')} className="block w-full text-left font-body text-sm text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] transition-colors">Roster</button>
            </div>
          </div>

          {/* Latest scores (2-col wide) */}
          {recentResults.length > 0 && (
            <div className="bento-card bento-card--2x1">
              <p className="bento-card-label">Latest Scores</p>
              <ResultsTicker results={recentResults} onGameClick={(gameId) => navigate(`../game/${gameId}`)} />
            </div>
          )}

          {/* Schedule or Playoffs (full width) */}
          <div className="bento-card bento-card--full">
            {leagueStatus === 'playoffs' && playoffBracket ? (
              <>
                <p className="bento-card-label">Playoffs</p>
                <PlayoffStatusPanel
                  playoffBracket={playoffBracket}
                  teams={teams}
                  lastGameResult={lastPlayoffResult}
                />
              </>
            ) : (
              <>
                <p className="bento-card-label">Season Schedule</p>
                <SeasonScheduleView
                  schedule={schedule}
                  teams={teams}
                  currentDay={currentDay}
                  onGameClick={(gameId) => navigate(`../game/${gameId}`)}
                />
              </>
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
