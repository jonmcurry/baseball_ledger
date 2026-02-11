/**
 * SeasonDetail
 *
 * Drill-down: champion, playoff results, and league leaders for an archived season.
 * REQ-SCH-009: Display enriched archive data.
 *
 * Feature-scoped sub-component. No store imports.
 */

import type { ArchiveLeaderEntry } from '@lib/transforms/archive-builder';

export interface SeasonDetailProps {
  readonly year: number;
  readonly champion: string;
  readonly playoffResults: Record<string, unknown> | null;
  readonly leagueLeaders: {
    batting: Record<string, ArchiveLeaderEntry[]>;
    pitching: Record<string, ArchiveLeaderEntry[]>;
  } | null;
}

const BATTING_LABELS: Record<string, string> = {
  HR: 'Home Runs',
  RBI: 'RBI',
  BA: 'Batting Average',
  H: 'Hits',
  SB: 'Stolen Bases',
};

const PITCHING_LABELS: Record<string, string> = {
  W: 'Wins',
  SO: 'Strikeouts',
  ERA: 'ERA',
  SV: 'Saves',
  WHIP: 'WHIP',
};

const RATE_STATS = new Set(['BA', 'ERA', 'WHIP']);

function formatValue(category: string, value: number): string {
  if (RATE_STATS.has(category)) return value.toFixed(3);
  return String(value);
}

function LeaderTable({ title, leaders, category }: { title: string; leaders: ArchiveLeaderEntry[]; category: string }) {
  if (leaders.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted">{title}</p>
      <table className="w-full font-stat text-xs">
        <thead>
          <tr className="border-b border-sandstone text-muted">
            <th className="py-0.5 text-center font-medium w-8">#</th>
            <th className="py-0.5 text-left font-medium">Player</th>
            <th className="py-0.5 text-right font-medium">{category}</th>
          </tr>
        </thead>
        <tbody>
          {leaders.map((leader) => (
            <tr key={leader.playerId} className="border-b border-sandstone/30">
              <td className="py-0.5 text-center text-muted">{leader.rank}</td>
              <td className="py-0.5 text-ink">{leader.playerName}</td>
              <td className="py-0.5 text-right">{formatValue(category, leader.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SeasonDetail({ year, champion, playoffResults, leagueLeaders }: SeasonDetailProps) {
  const wsChampionId = playoffResults && typeof playoffResults === 'object'
    ? (playoffResults as Record<string, unknown>).worldSeriesChampionId as string | null
    : null;

  return (
    <div className="space-y-4">
      <h3 className="font-headline text-sm font-bold text-ballpark">{year} Season</h3>

      <div className="rounded-card border border-ballpark bg-ballpark/10 px-gutter py-2 text-center">
        <p className="text-xs text-muted">Champion</p>
        <p className="font-headline text-lg font-bold text-ballpark">{champion}</p>
      </div>

      {playoffResults && wsChampionId && (
        <div className="rounded-card border border-sandstone/50 px-gutter py-2">
          <p className="text-xs font-medium text-muted">World Series</p>
          <p className="text-sm text-ink">
            {(playoffResults as Record<string, unknown>).worldSeries
              ? 'Completed'
              : 'Results archived'}
          </p>
        </div>
      )}

      {leagueLeaders && (
        <div className="space-y-4">
          <h4 className="font-headline text-xs font-bold text-ballpark">Batting Leaders</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(BATTING_LABELS).map(([cat, label]) => {
              const leaders = leagueLeaders.batting[cat];
              if (!leaders || leaders.length === 0) return null;
              return <LeaderTable key={cat} title={label} leaders={leaders} category={cat} />;
            })}
          </div>

          <h4 className="font-headline text-xs font-bold text-ballpark">Pitching Leaders</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(PITCHING_LABELS).map(([cat, label]) => {
              const leaders = leagueLeaders.pitching[cat];
              if (!leaders || leaders.length === 0) return null;
              return <LeaderTable key={cat} title={label} leaders={leaders} category={cat} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SeasonDetail;
