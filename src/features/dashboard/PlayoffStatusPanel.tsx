/**
 * PlayoffStatusPanel
 *
 * Vintage October baseball playoff status display.
 * Golden era aesthetic with championship bracket feel.
 *
 * REQ-LGE-009: Per-game playoff result display.
 *
 * Layer 7: Feature component. Presentational only.
 */

import type { FullPlayoffBracket, PlayoffSeries } from '@lib/types/schedule';
import type { TeamSummary } from '@lib/types/league';
import type { PlayoffGameResult } from '@stores/simulationStore';
import { formatPlayoffRoundName, buildPlayoffGameMessage } from '@lib/schedule/playoff-display';
import { getNextFullBracketGame } from '@lib/schedule/playoff-bracket';

export interface PlayoffStatusPanelProps {
  playoffBracket: FullPlayoffBracket;
  teams: readonly TeamSummary[];
  lastGameResult: PlayoffGameResult | null;
}

function collectActiveSeries(bracket: FullPlayoffBracket): PlayoffSeries[] {
  const active: PlayoffSeries[] = [];
  for (const round of bracket.al.rounds) {
    for (const series of round.series) {
      if (!series.isComplete && series.higherSeed && series.lowerSeed) {
        active.push(series);
      }
    }
  }
  for (const round of bracket.nl.rounds) {
    for (const series of round.series) {
      if (!series.isComplete && series.higherSeed && series.lowerSeed) {
        active.push(series);
      }
    }
  }
  if (!bracket.worldSeries.isComplete && bracket.worldSeries.higherSeed && bracket.worldSeries.lowerSeed) {
    active.push(bracket.worldSeries);
  }
  return active;
}

export function PlayoffStatusPanel({
  playoffBracket,
  teams,
  lastGameResult,
}: PlayoffStatusPanelProps) {
  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const teamFullNameMap = new Map(teams.map((t) => [t.id, `${t.city} ${t.name}`]));

  const activeSeries = collectActiveSeries(playoffBracket);
  const nextGame = getNextFullBracketGame(playoffBracket);

  return (
    <div data-testid="playoff-status-panel" className="vintage-card">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
            boxShadow: '0 0 8px rgba(196,145,21,0.3)',
          }}
        >
          <svg
            className="h-5 w-5 text-[var(--color-ink)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-[var(--accent-primary)]">
            Playoff Status
          </h3>
          <p className="font-stat text-xs text-[var(--color-muted)]">
            October baseball
          </p>
        </div>
      </div>

      {/* Last game result */}
      {lastGameResult && (
        <div
          data-testid="last-game-result"
          className="mb-4 rounded border border-[var(--color-gold)]/50 bg-[var(--color-gold)]/10 px-3 py-2"
        >
          <p className="mb-1 font-stat text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            Last Result
          </p>
          <p className="font-stat text-sm font-bold text-[var(--color-ink)]">
            {buildPlayoffGameMessage({
              round: lastGameResult.round,
              gameNumber: lastGameResult.gameNumber,
              homeTeamName: teamNameMap.get(lastGameResult.homeTeamId) ?? lastGameResult.homeTeamId,
              awayTeamName: teamNameMap.get(lastGameResult.awayTeamId) ?? lastGameResult.awayTeamId,
              homeScore: lastGameResult.homeScore,
              awayScore: lastGameResult.awayScore,
              isPlayoffsComplete: lastGameResult.isPlayoffsComplete,
            })}
          </p>
        </div>
      )}

      {/* Active series */}
      {activeSeries.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="font-stat text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Active Series
          </p>
          {activeSeries.map((series) => (
            <div
              key={series.id}
              className="flex items-center justify-between rounded border border-[var(--border-default)]/50 bg-[var(--border-default)]/10 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="font-stat text-sm font-medium text-[var(--color-ink)]">
                  {teamNameMap.get(series.higherSeed?.teamId ?? '') ?? '?'}
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-scoreboard text-lg text-[var(--accent-primary)]">
                    {series.higherSeedWins}
                  </span>
                  <span className="font-stat text-xs text-[var(--color-muted)]">-</span>
                  <span className="font-scoreboard text-lg text-[var(--accent-primary)]">
                    {series.lowerSeedWins}
                  </span>
                </div>
                <span className="font-stat text-sm font-medium text-[var(--color-ink)]">
                  {teamNameMap.get(series.lowerSeed?.teamId ?? '') ?? '?'}
                </span>
              </div>
              <span className="rounded bg-[var(--accent-primary)]/10 px-2 py-0.5 font-stat text-[10px] uppercase tracking-wider text-[var(--accent-primary)]">
                {formatPlayoffRoundName(series.round)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Next game preview */}
      {nextGame && (
        <div data-testid="next-game-preview" className="mb-4">
          <p className="mb-1 font-stat text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Up Next
          </p>
          <p className="font-stat text-sm text-[var(--color-ink)]">
            <span className="font-bold">{formatPlayoffRoundName(nextGame.round)}</span> Game {nextGame.gameNumber}
          </p>
          <p className="font-stat text-xs text-[var(--color-muted)]">
            {teamFullNameMap.get(nextGame.awayTeamId) ?? nextGame.awayTeamId} at{' '}
            {teamFullNameMap.get(nextGame.homeTeamId) ?? nextGame.homeTeamId}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[var(--border-default)] pt-2">
        <p className="text-center font-stat text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
          ★ View full bracket on Playoffs page ★
        </p>
      </div>
    </div>
  );
}

export default PlayoffStatusPanel;
