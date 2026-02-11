/**
 * PlayoffStatusPanel
 *
 * Dashboard right-column panel during playoffs. Shows last game result,
 * active series summary, next game preview, and link to full bracket.
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
    <div data-testid="playoff-status-panel" className="space-y-3">
      <h3 className="font-headline text-lg font-bold text-ballpark">
        Playoff Status
      </h3>

      {lastGameResult && (
        <div
          data-testid="last-game-result"
          className="rounded-card border border-ballpark bg-ballpark/10 px-3 py-2"
        >
          <p className="text-[10px] font-medium text-muted">Last Result</p>
          <p className="font-stat text-sm font-bold text-ink">
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

      {activeSeries.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted">Active Series</p>
          {activeSeries.map((series) => (
            <div
              key={series.id}
              className="flex items-center justify-between rounded-card border border-sandstone/50 px-3 py-1.5 font-stat text-sm"
            >
              <span>{teamNameMap.get(series.higherSeed?.teamId ?? '') ?? '?'}</span>
              <span className="font-bold">{series.higherSeedWins}</span>
              <span className="text-muted">-</span>
              <span className="font-bold">{series.lowerSeedWins}</span>
              <span>{teamNameMap.get(series.lowerSeed?.teamId ?? '') ?? '?'}</span>
              <span className="ml-2 text-[10px] text-muted">
                {formatPlayoffRoundName(series.round)}
              </span>
            </div>
          ))}
        </div>
      )}

      {nextGame && (
        <div data-testid="next-game-preview" className="text-sm">
          <p className="text-[10px] font-medium text-muted">Up Next</p>
          <p className="font-stat text-ink">
            {formatPlayoffRoundName(nextGame.round)} Game {nextGame.gameNumber}:{' '}
            {teamFullNameMap.get(nextGame.awayTeamId) ?? nextGame.awayTeamId} at{' '}
            {teamFullNameMap.get(nextGame.homeTeamId) ?? nextGame.homeTeamId}
          </p>
        </div>
      )}

      <p className="text-xs text-muted">
        View full bracket on the Playoffs page.
      </p>
    </div>
  );
}

export default PlayoffStatusPanel;
