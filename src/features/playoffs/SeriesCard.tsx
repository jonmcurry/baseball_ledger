/**
 * SeriesCard
 *
 * Individual playoff series card showing matchup and score.
 * Feature-scoped sub-component. No store imports.
 */

import type { PlayoffSeries } from '@lib/types/schedule';

export interface SeriesCardProps {
  readonly series: PlayoffSeries;
  readonly homeTeam: string;
  readonly awayTeam: string;
}

export function SeriesCard({ series, homeTeam, awayTeam }: SeriesCardProps) {
  const winsNeeded = Math.ceil(series.bestOf / 2);

  return (
    <div
      className={`rounded-card border px-3 py-2 shadow-card ${
        series.isComplete ? 'border-ballpark bg-ballpark/5' : 'border-sandstone bg-old-lace'
      }`}
    >
      <p className="text-[10px] font-bold text-muted">
        {series.round.replace(/([A-Z])/g, ' $1').trim()} - Best of {series.bestOf}
      </p>

      <div className="mt-1 space-y-0.5">
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${
            series.winnerId === series.higherSeed?.teamId ? 'text-ballpark font-bold' : 'text-ink'
          }`}>
            {homeTeam}
          </span>
          <span className="font-stat font-bold text-ink">{series.higherSeedWins}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${
            series.winnerId === series.lowerSeed?.teamId ? 'text-ballpark font-bold' : 'text-ink'
          }`}>
            {awayTeam}
          </span>
          <span className="font-stat font-bold text-ink">{series.lowerSeedWins}</span>
        </div>
      </div>

      {series.isComplete && series.winnerId && (
        <p className="mt-1 text-[10px] font-bold text-ballpark">
          Winner advances ({winsNeeded} wins)
        </p>
      )}
    </div>
  );
}
