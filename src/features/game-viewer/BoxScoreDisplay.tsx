/**
 * BoxScoreDisplay
 *
 * Full box score with line score, batting lines, and pitching lines.
 * Splits batting and pitching by team (away/home) when teamSide data
 * is available. Falls back to combined view for legacy game data.
 * Composes LineScore component.
 * Feature-scoped sub-component. No store imports.
 */

import { useMemo } from 'react';
import { LineScore } from '@components/baseball/LineScore';
import type { InningScore, LineScoreTotals } from '@components/baseball/LineScore';
import type { BoxScore, BattingLine, PitchingLine } from '@lib/types/game';

export interface BoxScoreDisplayProps {
  readonly boxScore: BoxScore | null;
  readonly battingLines: readonly BattingLine[];
  readonly pitchingLines: readonly PitchingLine[];
  readonly homeTeam: string;
  readonly awayTeam: string;
}

function BattingTable({ lines, label }: { lines: readonly BattingLine[]; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted">{label}</p>
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
          {lines.map((line) => (
            <tr key={line.playerId} className="border-b border-sandstone/30">
              <td className="py-0.5 text-ink">{line.playerName ?? line.playerId}</td>
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
  );
}

function PitchingTable({ lines, label }: { lines: readonly PitchingLine[]; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted">{label}</p>
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
          {lines.map((line) => (
            <tr key={line.playerId} className="border-b border-sandstone/30">
              <td className="py-0.5 text-ink">{line.playerName ?? line.playerId}</td>
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
  );
}

export function BoxScoreDisplay({
  boxScore,
  battingLines,
  pitchingLines,
  homeTeam,
  awayTeam,
}: BoxScoreDisplayProps) {
  // Split lines by team when teamSide data is available
  const hasTeamSide = battingLines.length > 0 && battingLines[0].teamSide !== undefined;

  const { awayBatting, homeBatting, awayPitching, homePitching } = useMemo(() => {
    if (!hasTeamSide) {
      return {
        awayBatting: battingLines,
        homeBatting: [] as readonly BattingLine[],
        awayPitching: pitchingLines,
        homePitching: [] as readonly PitchingLine[],
      };
    }
    return {
      awayBatting: battingLines.filter((l) => l.teamSide === 'away'),
      homeBatting: battingLines.filter((l) => l.teamSide === 'home'),
      awayPitching: pitchingLines.filter((l) => l.teamSide === 'away'),
      homePitching: pitchingLines.filter((l) => l.teamSide === 'home'),
    };
  }, [battingLines, pitchingLines, hasTeamSide]);

  return (
    <div className="space-y-4">
      <h3 className="font-headline text-sm font-bold text-ballpark">Box Score</h3>

      {boxScore && (() => {
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
          <LineScore
            awayTeamName={awayTeam}
            homeTeamName={homeTeam}
            innings={innings}
            awayTotal={awayTotal}
            homeTotal={homeTotal}
          />
        );
      })()}

      {hasTeamSide ? (
        <>
          {/* Away team */}
          <div className="space-y-3">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              {awayTeam}
            </h4>
            <div className="grid gap-gutter lg:grid-cols-2">
              <BattingTable lines={awayBatting} label="Batting" />
              <PitchingTable lines={awayPitching} label="Pitching" />
            </div>
          </div>
          {/* Home team */}
          <div className="space-y-3">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              {homeTeam}
            </h4>
            <div className="grid gap-gutter lg:grid-cols-2">
              <BattingTable lines={homeBatting} label="Batting" />
              <PitchingTable lines={homePitching} label="Pitching" />
            </div>
          </div>
        </>
      ) : (
        /* Legacy fallback: combined view when teamSide is unavailable */
        <div className="grid gap-gutter lg:grid-cols-2">
          <BattingTable lines={awayBatting} label="Batting" />
          <PitchingTable lines={awayPitching} label="Pitching" />
        </div>
      )}
    </div>
  );
}

export default BoxScoreDisplay;
