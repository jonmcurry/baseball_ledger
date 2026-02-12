/**
 * ScheduleView
 *
 * Vintage scorecard-style game schedule display.
 * Golden era aesthetic with box score formatting.
 */

import type { ScheduleDay } from '@lib/types/schedule';
import type { TeamSummary } from '@lib/types/league';

export interface ScheduleViewProps {
  day: ScheduleDay | null;
  teams: readonly TeamSummary[];
}

export function ScheduleView({ day, teams }: ScheduleViewProps) {
  if (!day) {
    return (
      <div className="vintage-card text-center">
        <p className="font-stat text-sm text-[var(--color-muted)]">
          No games scheduled
        </p>
      </div>
    );
  }

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="vintage-card">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ballpark)]/20">
          <svg
            className="h-5 w-5 text-[var(--color-ballpark)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-[var(--color-ballpark)]">
            Day {day.dayNumber}
          </h3>
          <p className="font-stat text-xs text-[var(--color-muted)]">
            {day.games.length} game{day.games.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Games list */}
      <div className="space-y-2">
        {day.games.map((game) => {
          const home = teamMap.get(game.homeTeamId);
          const away = teamMap.get(game.awayTeamId);
          const awayWon = game.isComplete && (game.awayScore ?? 0) > (game.homeScore ?? 0);
          const homeWon = game.isComplete && (game.homeScore ?? 0) > (game.awayScore ?? 0);

          return (
            <div
              key={game.id}
              className="flex items-center justify-between rounded border border-[var(--color-sandstone)]/50 bg-[var(--color-sandstone)]/10 px-3 py-2 transition-colors hover:bg-[var(--color-sandstone)]/20"
            >
              {/* Away team */}
              <div className="flex w-32 items-center justify-end gap-2">
                <span
                  className={`font-stat text-sm ${
                    awayWon
                      ? 'font-bold text-[var(--color-ballpark)]'
                      : 'text-[var(--color-ink)]'
                  }`}
                >
                  {away?.name ?? game.awayTeamId}
                </span>
                {game.isComplete && (
                  <span
                    className={`font-scoreboard text-lg ${
                      awayWon ? 'text-[var(--color-ballpark)]' : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {game.awayScore}
                  </span>
                )}
              </div>

              {/* Separator */}
              <div className="flex items-center gap-2 px-3">
                <span className="font-stat text-xs text-[var(--color-muted)]">@</span>
              </div>

              {/* Home team */}
              <div className="flex w-32 items-center gap-2">
                {game.isComplete && (
                  <span
                    className={`font-scoreboard text-lg ${
                      homeWon ? 'text-[var(--color-ballpark)]' : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {game.homeScore}
                  </span>
                )}
                <span
                  className={`font-stat text-sm ${
                    homeWon
                      ? 'font-bold text-[var(--color-ballpark)]'
                      : 'text-[var(--color-ink)]'
                  }`}
                >
                  {home?.name ?? game.homeTeamId}
                </span>
              </div>

              {/* Status */}
              <div className="ml-auto">
                {game.isComplete ? (
                  <span className="rounded bg-[var(--color-ballpark)]/10 px-2 py-0.5 font-stat text-[10px] uppercase tracking-wider text-[var(--color-ballpark)]">
                    Final
                  </span>
                ) : (
                  <span className="rounded bg-[var(--color-sandstone)] px-2 py-0.5 font-stat text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    Scheduled
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-[var(--color-sandstone)] pt-2">
        <p className="text-center font-stat text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
          ★ Today's Schedule ★
        </p>
      </div>
    </div>
  );
}

export default ScheduleView;
