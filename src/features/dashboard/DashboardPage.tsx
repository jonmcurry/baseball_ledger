/**
 * DashboardPage -- "The Morning Edition"
 *
 * Broadsheet front page layout with above-the-fold simulation controls
 * and below-the-fold schedule/navigation.
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
import { SectionOpener } from '@components/typography/SectionOpener';
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

/** Table of Contents navigation entries for in-season state. */
const TOC_ENTRIES = [
  { label: 'Roster', path: '../roster', numeral: 'III' },
  { label: 'Statistics', path: '../stats', numeral: 'IV' },
  { label: 'Standings', path: '../standings', numeral: 'V' },
  { label: 'Transactions', path: '../transactions', numeral: 'VII' },
  { label: 'Archive', path: '../archive', numeral: 'VIII' },
] as const;

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
  const dateline = league
    ? `Season ${league.seasonYear} -- Day ${currentDay} of 162`
    : undefined;

  return (
    <div className="space-y-0">
      {error && <ErrorBanner severity="error" message={error} />}

      {/* REQ-SCH-009: Championship headline interrupt */}
      <HeadlineInterrupt
        headline={headlineText}
        subheadline="A new champion is crowned"
        isVisible={showHeadline}
        onDismiss={() => setShowHeadline(false)}
      />

      {/* Section opener */}
      <SectionOpener
        kicker="The Morning Edition"
        headline={`Season ${league?.seasonYear ?? ''}`}
        deck={isInSeason ? `Day ${currentDay} of the ${league?.seasonYear} campaign` : undefined}
        dateline={dateline}
      />

      {/* ============================================================
         ABOVE THE FOLD -- Primary actions + quick scores
         ============================================================ */}
      <div className="grid gap-gutter-lg md:grid-cols-12">
        {/* Lead story: Controls / setup */}
        <div className="md:col-span-8 space-y-gutter-lg">
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
        </div>

        {/* Sidebar column: Quick scores + TOC */}
        <div className="md:col-span-4 space-y-gutter-lg">
          {/* Results as stacked score cards */}
          {recentResults.length > 0 && (
            <div>
              <p className="section-flag mb-2">Latest Scores</p>
              <ResultsTicker results={recentResults} onGameClick={(gameId) => navigate(`../game/${gameId}`)} />
            </div>
          )}

          {/* Table of Contents navigation -- in-season only */}
          {isInSeason && (
            <nav aria-label="Season navigation">
              <p className="section-flag mb-2">Sections</p>
              <ul className="space-y-1 stagger-children">
                {TOC_ENTRIES.map((entry) => (
                  <li key={entry.path}>
                    <button
                      type="button"
                      onClick={() => navigate(entry.path)}
                      className="leader-line w-full text-left"
                    >
                      <span className="leader-line-label">{entry.label}</span>
                      <span className="leader-line-dots" />
                      <span className="leader-line-value">{entry.numeral}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* ============================================================
         BELOW THE FOLD -- Schedule / Playoffs
         ============================================================ */}
      {league?.status !== 'setup' && (
        <>
          <hr className="rule-double" />

          {leagueStatus === 'playoffs' && playoffBracket ? (
            <div>
              <p className="kicker mb-2">Special Report</p>
              <PlayoffStatusPanel
                playoffBracket={playoffBracket}
                teams={teams}
                lastGameResult={lastPlayoffResult}
              />
            </div>
          ) : (
            <div>
              <p className="section-flag mb-2">Season Calendar</p>
              <SeasonScheduleView
                schedule={schedule}
                teams={teams}
                currentDay={currentDay}
                onGameClick={(gameId) => navigate(`../game/${gameId}`)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;
