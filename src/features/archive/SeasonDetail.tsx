/**
 * SeasonDetail
 *
 * Drill-down: standings + bracket + champion for an archived season.
 * Feature-scoped sub-component. No store imports.
 */

import type { DivisionStandings } from '@lib/types/league';

export interface SeasonDetailProps {
  readonly year: number;
  readonly champion: string;
  readonly standings: readonly DivisionStandings[];
}

export function SeasonDetail({ year, champion, standings }: SeasonDetailProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-headline text-sm font-bold text-ballpark">{year} Season</h3>

      <div className="rounded-card border border-ballpark bg-ballpark/10 px-gutter py-2 text-center">
        <p className="text-xs text-muted">Champion</p>
        <p className="font-headline text-lg font-bold text-ballpark">{champion}</p>
      </div>

      {standings.map((div) => (
        <div key={`${div.leagueDivision}-${div.division}`} className="space-y-1">
          <p className="text-xs font-medium text-muted">
            {div.leagueDivision} {div.division}
          </p>
          <table className="w-full font-stat text-xs">
            <thead>
              <tr className="border-b border-sandstone text-muted">
                <th className="py-0.5 text-left font-medium">Team</th>
                <th className="py-0.5 text-center font-medium">W</th>
                <th className="py-0.5 text-center font-medium">L</th>
              </tr>
            </thead>
            <tbody>
              {div.teams.map((team) => (
                <tr key={team.id} className="border-b border-sandstone/30">
                  <td className="py-0.5 text-ink">{team.city} {team.name}</td>
                  <td className="py-0.5 text-center">{team.wins}</td>
                  <td className="py-0.5 text-center">{team.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
