/**
 * BoxScoreDisplay
 *
 * Full box score with line score, batting lines, and pitching lines.
 * Composes LineScore component.
 * Feature-scoped sub-component. No store imports.
 */

import { LineScore } from '@components/baseball/LineScore';
import type { InningScore, LineScoreTotals } from '@components/baseball/LineScore';
import type { BoxScore, BattingLine, PitchingLine } from '@lib/types/game';

export interface BoxScoreDisplayProps {
  readonly boxScore: BoxScore;
  readonly battingLines: readonly BattingLine[];
  readonly pitchingLines: readonly PitchingLine[];
  readonly homeTeam: string;
  readonly awayTeam: string;
}

export function BoxScoreDisplay({
  boxScore,
  battingLines,
  pitchingLines,
  homeTeam,
  awayTeam,
}: BoxScoreDisplayProps) {
  const maxInnings = Math.max(boxScore.lineScore.away.length, boxScore.lineScore.home.length);
  const innings: InningScore[] = Array.from({ length: maxInnings }, (_, i) => ({
    away: boxScore.lineScore.away[i] ?? null,
    home: boxScore.lineScore.home[i] ?? null,
  }));

  const awayTotal: LineScoreTotals = {
    R: boxScore.lineScore.away.reduce((s, v) => s + v, 0),
    H: boxScore.awayHits,
    E: boxScore.awayErrors,
  };

  const homeTotal: LineScoreTotals = {
    R: boxScore.lineScore.home.reduce((s, v) => s + v, 0),
    H: boxScore.homeHits,
    E: boxScore.homeErrors,
  };

  return (
    <div className="space-y-4">
      <h3 className="font-headline text-sm font-bold text-ballpark">Box Score</h3>

      <LineScore
        awayTeamName={awayTeam}
        homeTeamName={homeTeam}
        innings={innings}
        awayTotal={awayTotal}
        homeTotal={homeTotal}
      />

      <div className="grid gap-gutter lg:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">Batting</p>
          <table className="w-full font-stat text-xs" role="table">
            <thead>
              <tr className="border-b border-sandstone text-muted">
                <th className="py-0.5 text-left font-medium">Player</th>
                <th className="py-0.5 text-center font-medium">AB</th>
                <th className="py-0.5 text-center font-medium">R</th>
                <th className="py-0.5 text-center font-medium">H</th>
                <th className="py-0.5 text-center font-medium">RBI</th>
                <th className="py-0.5 text-center font-medium">BB</th>
                <th className="py-0.5 text-center font-medium">SO</th>
              </tr>
            </thead>
            <tbody>
              {battingLines.map((line) => (
                <tr key={line.playerId} className="border-b border-sandstone/30">
                  <td className="py-0.5 text-ink">{line.playerId}</td>
                  <td className="py-0.5 text-center">{line.AB}</td>
                  <td className="py-0.5 text-center">{line.R}</td>
                  <td className="py-0.5 text-center">{line.H}</td>
                  <td className="py-0.5 text-center">{line.RBI}</td>
                  <td className="py-0.5 text-center">{line.BB}</td>
                  <td className="py-0.5 text-center">{line.SO}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">Pitching</p>
          <table className="w-full font-stat text-xs" role="table">
            <thead>
              <tr className="border-b border-sandstone text-muted">
                <th className="py-0.5 text-left font-medium">Pitcher</th>
                <th className="py-0.5 text-center font-medium">IP</th>
                <th className="py-0.5 text-center font-medium">H</th>
                <th className="py-0.5 text-center font-medium">ER</th>
                <th className="py-0.5 text-center font-medium">BB</th>
                <th className="py-0.5 text-center font-medium">SO</th>
                <th className="py-0.5 text-center font-medium">Dec</th>
              </tr>
            </thead>
            <tbody>
              {pitchingLines.map((line) => (
                <tr key={line.playerId} className="border-b border-sandstone/30">
                  <td className="py-0.5 text-ink">{line.playerId}</td>
                  <td className="py-0.5 text-center">{line.IP}</td>
                  <td className="py-0.5 text-center">{line.H}</td>
                  <td className="py-0.5 text-center">{line.ER}</td>
                  <td className="py-0.5 text-center">{line.BB}</td>
                  <td className="py-0.5 text-center">{line.SO}</td>
                  <td className="py-0.5 text-center font-bold">
                    {line.decision ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BoxScoreDisplay;
