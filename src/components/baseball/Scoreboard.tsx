/**
 * Scoreboard
 *
 * Compact game state display showing score, inning, outs, and bases.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import type { BaseState } from '@lib/types/game';
import { BaseIndicator } from './BaseIndicator';

export interface ScoreboardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  inning: number;
  halfInning: 'top' | 'bottom';
  outs: number;
  bases: BaseState;
  isComplete?: boolean;
}

export function Scoreboard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  inning,
  halfInning,
  outs,
  bases,
  isComplete,
}: ScoreboardProps) {
  const inningLabel = isComplete
    ? 'Final'
    : `${halfInning === 'top' ? 'Top' : 'Bot'} ${inning}`;

  return (
    <div
      role="region"
      aria-label="Scoreboard"
      className="inline-flex items-center gap-gutter-lg rounded-card border border-sandstone bg-old-lace px-gutter py-2 shadow-card"
    >
      {/* Teams & scores */}
      <div className="space-y-1 text-right">
        <div className="flex items-center justify-between gap-gutter">
          <span className={`font-stat text-sm ${halfInning === 'top' ? 'font-bold text-ink' : 'text-muted'}`}>
            {awayTeam}
          </span>
          <span className="font-stat text-sm font-bold text-ink">{awayScore}</span>
        </div>
        <div className="flex items-center justify-between gap-gutter">
          <span className={`font-stat text-sm ${halfInning === 'bottom' ? 'font-bold text-ink' : 'text-muted'}`}>
            {homeTeam}
          </span>
          <span className="font-stat text-sm font-bold text-ink">{homeScore}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-sandstone" />

      {/* Game state */}
      <div className="flex items-center gap-gutter">
        <div className="text-center">
          <p className="text-[10px] text-muted">Inning</p>
          <p className="font-stat text-xs font-bold text-ink">{inningLabel}</p>
        </div>
        <BaseIndicator
          first={bases.first !== null}
          second={bases.second !== null}
          third={bases.third !== null}
          size="sm"
        />
        <div className="text-center">
          <p className="text-[10px] text-muted">Outs</p>
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`inline-block h-2.5 w-2.5 rounded-full ${i < outs ? 'bg-stitch-red' : 'bg-sandstone/50'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Scoreboard;
