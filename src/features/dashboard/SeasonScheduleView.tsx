/**
 * SeasonScheduleView
 *
 * Full season schedule displayed as a scrollable list of game days.
 * Current day is auto-scrolled into view and highlighted.
 * Completed games are clickable to view box scores.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useEffect, useRef, useMemo } from 'react';
import type { ScheduleDay } from '@lib/types/schedule';
import type { TeamSummary } from '@lib/types/league';

export interface SeasonScheduleViewProps {
  schedule: readonly ScheduleDay[];
  teams: readonly TeamSummary[];
  currentDay: number;
  onGameClick?: (gameId: string) => void;
}

export function SeasonScheduleView({ schedule, teams, currentDay, onGameClick }: SeasonScheduleViewProps) {
  const currentDayRef = useRef<HTMLDivElement>(null);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  useEffect(() => {
    currentDayRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [currentDay]);

  if (schedule.length === 0) {
    return (
      <div className="vintage-card text-center">
        <p className="font-stat text-sm text-[var(--color-muted)]">
          No schedule available
        </p>
      </div>
    );
  }

  return (
    <div className="vintage-card">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)]/20">
          <svg
            className="h-5 w-5 text-[var(--accent-primary)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-[var(--accent-primary)]">
            Season Schedule
          </h3>
          <p className="font-stat text-xs text-[var(--color-muted)]">
            Day {currentDay} of {schedule.length}
          </p>
        </div>
      </div>

      {/* Scrollable schedule */}
      <div className="max-h-[520px] overflow-y-auto pr-1 scrollbar-hide">
        <div className="space-y-1">
          {schedule.map((day) => {
            const isCurrent = day.dayNumber === currentDay;
            const isPlayed = day.games.every((g) => g.isComplete);
            const isFuture = day.dayNumber > currentDay;

            return (
              <div
                key={day.dayNumber}
                ref={isCurrent ? currentDayRef : undefined}
                className={`rounded border px-3 py-2 transition-colors ${
                  isCurrent
                    ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10'
                    : isPlayed
                      ? 'border-[var(--border-default)]/30 bg-transparent'
                      : 'border-[var(--border-default)]/20 bg-transparent opacity-50'
                }`}
              >
                {/* Day header */}
                <div className="mb-1 flex items-center gap-2">
                  <span className={`font-headline text-xs font-bold uppercase tracking-wider ${
                    isCurrent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
                  }`}>
                    Day {day.dayNumber}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-[var(--accent-primary)] px-1.5 py-px font-stat text-[8px] font-bold uppercase text-[#0C1B2A]">
                      Today
                    </span>
                  )}
                  {isPlayed && !isCurrent && (
                    <span className="font-stat text-[9px] text-[var(--text-tertiary)]">
                      Complete
                    </span>
                  )}
                  {isFuture && (
                    <span className="font-stat text-[9px] text-[var(--text-tertiary)]">
                      Upcoming
                    </span>
                  )}
                  <span className="ml-auto font-stat text-[9px] text-[var(--text-tertiary)]">
                    {day.games.length} game{day.games.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Games */}
                <div className="space-y-0.5">
                  {day.games.map((game) => {
                    const home = teamMap.get(game.homeTeamId);
                    const away = teamMap.get(game.awayTeamId);
                    const awayWon = game.isComplete && (game.awayScore ?? 0) > (game.homeScore ?? 0);
                    const homeWon = game.isComplete && (game.homeScore ?? 0) > (game.awayScore ?? 0);
                    const isClickable = game.isComplete && !!onGameClick;

                    return (
                      <div
                        key={game.id}
                        role={isClickable ? 'button' : undefined}
                        tabIndex={isClickable ? 0 : undefined}
                        onClick={isClickable ? () => onGameClick(game.id) : undefined}
                        onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') onGameClick(game.id); } : undefined}
                        className={`flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                          isClickable
                            ? 'cursor-pointer hover:bg-[var(--accent-primary)]/10'
                            : ''
                        }`}
                      >
                        {/* Away */}
                        <span className={`w-24 truncate font-stat ${
                          awayWon ? 'font-bold text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
                        }`}>
                          {away?.name ?? game.awayTeamId}
                        </span>

                        {/* Score or @ */}
                        {game.isComplete ? (
                          <span className="w-12 text-center font-scoreboard text-sm tabular-nums text-[var(--text-primary)]">
                            {game.awayScore}-{game.homeScore}
                          </span>
                        ) : (
                          <span className="w-12 text-center font-stat text-[var(--text-tertiary)]">@</span>
                        )}

                        {/* Home */}
                        <span className={`w-24 truncate font-stat ${
                          homeWon ? 'font-bold text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
                        }`}>
                          {home?.name ?? game.homeTeamId}
                        </span>

                        {/* Status */}
                        {game.isComplete ? (
                          <span className="ml-auto font-stat text-[8px] uppercase text-[var(--accent-primary)]">
                            F
                          </span>
                        ) : (
                          <span className="ml-auto font-stat text-[8px] uppercase text-[var(--text-tertiary)]">
                            --
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 border-t border-[var(--border-default)] pt-2">
        <p className="text-center font-stat text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
          Click completed games to view box scores
        </p>
      </div>
    </div>
  );
}

export default SeasonScheduleView;
