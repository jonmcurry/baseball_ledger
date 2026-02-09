/**
 * ScheduleView
 *
 * Displays games for a given schedule day with scores.
 */

import type { ScheduleDay } from '@lib/types/schedule';
import type { TeamSummary } from '@lib/types/league';

export interface ScheduleViewProps {
  day: ScheduleDay | null;
  teams: readonly TeamSummary[];
}

export function ScheduleView({ day, teams }: ScheduleViewProps) {
  if (!day) {
    return <p className="text-muted text-sm">No games scheduled</p>;
  }

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="space-y-2">
      <h3 className="font-headline text-lg font-bold text-ballpark">
        Day {day.dayNumber}
      </h3>
      <div className="space-y-1">
        {day.games.map((game) => {
          const home = teamMap.get(game.homeTeamId);
          const away = teamMap.get(game.awayTeamId);
          return (
            <div
              key={game.id}
              className="flex items-center justify-between rounded-card border border-sandstone/50 px-3 py-2 font-stat text-sm"
            >
              <span className="w-28 text-right">{away?.name ?? game.awayTeamId}</span>
              <span className="mx-2 text-muted">@</span>
              <span className="w-28">{home?.name ?? game.homeTeamId}</span>
              {game.isComplete ? (
                <span className="ml-auto font-bold">
                  {game.awayScore} - {game.homeScore}
                </span>
              ) : (
                <span className="ml-auto text-xs text-muted">Scheduled</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
