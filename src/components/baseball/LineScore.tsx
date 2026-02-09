/**
 * LineScore
 *
 * Classic baseball line score table: innings, R/H/E totals.
 * Null inning values render as empty (e.g. bottom 9 not played).
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export interface InningScore {
  away: number | null;
  home: number | null;
}

export interface LineScoreTotals {
  R: number;
  H: number;
  E: number;
}

export interface LineScoreProps {
  awayTeamName: string;
  homeTeamName: string;
  innings: readonly InningScore[];
  awayTotal: LineScoreTotals;
  homeTotal: LineScoreTotals;
}

export function LineScore({
  awayTeamName,
  homeTeamName,
  innings,
  awayTotal,
  homeTotal,
}: LineScoreProps) {
  return (
    <div className="overflow-x-auto">
      <table className="font-stat text-sm" role="table">
        <thead>
          <tr className="border-b-2 border-sandstone text-ink">
            <th className="px-2 py-1 text-left font-medium min-w-[80px]" />
            {innings.map((_, i) => (
              <th key={i} className="px-2 py-1 text-center font-medium min-w-[28px]">
                {i + 1}
              </th>
            ))}
            <th className="px-2 py-1 text-center font-bold min-w-[28px] border-l border-sandstone">
              R
            </th>
            <th className="px-2 py-1 text-center font-bold min-w-[28px]">H</th>
            <th className="px-2 py-1 text-center font-bold min-w-[28px]">E</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-sandstone/50">
            <td className="px-2 py-1 text-left font-medium">{awayTeamName}</td>
            {innings.map((inn, i) => (
              <td key={i} className="px-2 py-1 text-center">
                {inn.away ?? ''}
              </td>
            ))}
            <td className="px-2 py-1 text-center font-bold border-l border-sandstone">
              {awayTotal.R}
            </td>
            <td className="px-2 py-1 text-center font-bold">{awayTotal.H}</td>
            <td className="px-2 py-1 text-center font-bold">{awayTotal.E}</td>
          </tr>
          <tr className="border-b border-sandstone/50">
            <td className="px-2 py-1 text-left font-medium">{homeTeamName}</td>
            {innings.map((inn, i) => (
              <td key={i} className="px-2 py-1 text-center">
                {inn.home ?? ''}
              </td>
            ))}
            <td className="px-2 py-1 text-center font-bold border-l border-sandstone">
              {homeTotal.R}
            </td>
            <td className="px-2 py-1 text-center font-bold">{homeTotal.H}</td>
            <td className="px-2 py-1 text-center font-bold">{homeTotal.E}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
