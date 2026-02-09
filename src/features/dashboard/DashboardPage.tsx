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

export function DashboardPage() {
  const { league, teams, standings, schedule, currentDay, isLoading, error } = useLeague();
  const { isRunning, progressPct } = useSimulation();

  if (isLoading) {
    return <LoadingLedger message="Loading league data..." />;
  }

  const todaySchedule = schedule.find((d) => d.dayNumber === currentDay) ?? null;

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

      <SimulationControls
        isRunning={isRunning}
        progressPct={progressPct}
        onSimulate={() => {}}
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
