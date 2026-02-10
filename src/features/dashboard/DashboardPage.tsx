/**
 * DashboardPage
 *
 * Main league dashboard with standings, today's schedule, and simulation controls.
 * Wires useLeague + useSimulation hooks to presentational components.
 */

import { useLeague } from '@hooks/useLeague';
import { useSimulation } from '@hooks/useSimulation';
import { StandingsTable } from '@components/data-display/StandingsTable';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { SimulationControls } from './SimulationControls';
import { ScheduleView } from './ScheduleView';
import { ResultsTicker } from './ResultsTicker';
import type { TickerResult } from './ResultsTicker';
import { InviteKeyDisplay } from '@features/league/InviteKeyDisplay';

const SCOPE_TO_DAYS: Record<string, number | 'season'> = {
  day: 1,
  week: 7,
  month: 30,
  season: 162,
};

export function DashboardPage() {
  const { league, teams, standings, schedule, currentDay, isLoading, error, leagueStatus } = useLeague();
  const { isRunning, progressPct, runSimulation } = useSimulation();

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

      {league?.status === 'setup' && league.inviteKey && (
        <InviteKeyDisplay inviteKey={league.inviteKey} />
      )}

      {recentResults.length > 0 && (
        <ResultsTicker results={recentResults} />
      )}

      <SimulationControls
        isRunning={isRunning}
        progressPct={progressPct}
        onSimulate={handleSimulate}
        leagueStatus={leagueStatus}
      />

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
          <ScheduleView day={todaySchedule} teams={teams} />
        </div>
      </div>
    </div>
  );
}
