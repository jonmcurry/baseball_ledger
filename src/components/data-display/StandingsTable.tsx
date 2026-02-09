/**
 * StandingsTable
 *
 * Division standings display with W, L, PCT, GB, RS, RA, DIFF columns.
 * Uses computeWinPct and computeGamesBehind from Layer 1.
 *
 * Layer 6: Presentational component. Imports from Layer 0/1 only.
 */

import type { DivisionStandings } from '@lib/types/league';
import { computeWinPct, computeGamesBehind } from '@lib/stats/standings';

export interface StandingsTableProps {
  standings: readonly DivisionStandings[];
  userTeamId: string;
  onTeamClick: (teamId: string) => void;
}

export function StandingsTable({
  standings,
  userTeamId,
  onTeamClick,
}: StandingsTableProps) {
  if (standings.length === 0) return null;

  return (
    <div className="space-y-gutter-lg">
      {standings.map((div) => {
        const leader = div.teams[0];
        return (
          <section key={`${div.leagueDivision}-${div.division}`}>
            <h3 className="mb-2 font-headline text-lg font-bold text-ballpark">
              {div.leagueDivision} {div.division}
            </h3>
            <table className="w-full font-stat text-sm" role="table">
              <thead>
                <tr className="border-b-2 border-sandstone text-ink">
                  <th className="px-2 py-1.5 text-left font-medium">Team</th>
                  <th className="px-2 py-1.5 text-right font-medium">W</th>
                  <th className="px-2 py-1.5 text-right font-medium">L</th>
                  <th className="px-2 py-1.5 text-right font-medium">PCT</th>
                  <th className="px-2 py-1.5 text-right font-medium">GB</th>
                  <th className="px-2 py-1.5 text-right font-medium">RS</th>
                  <th className="px-2 py-1.5 text-right font-medium">RA</th>
                  <th className="px-2 py-1.5 text-right font-medium">DIFF</th>
                </tr>
              </thead>
              <tbody>
                {div.teams.map((team, idx) => {
                  const isUser = team.id === userTeamId;
                  const pct = computeWinPct(team.wins, team.losses);
                  const gb =
                    idx === 0
                      ? '-'
                      : computeGamesBehind(
                          leader.wins,
                          leader.losses,
                          team.wins,
                          team.losses,
                        ).toFixed(1);
                  const diff = team.runsScored - team.runsAllowed;

                  return (
                    <tr
                      key={team.id}
                      onClick={() => onTeamClick(team.id)}
                      className={`cursor-pointer border-b border-sandstone/50 hover:bg-sandstone/20 ${
                        isUser ? 'bg-sandstone/30' : ''
                      }`}
                    >
                      <td className="px-2 py-1 text-left font-medium">
                        {team.name}
                      </td>
                      <td className="px-2 py-1 text-right">{team.wins}</td>
                      <td className="px-2 py-1 text-right">{team.losses}</td>
                      <td className="px-2 py-1 text-right">{pct.toFixed(3).slice(1)}</td>
                      <td className="px-2 py-1 text-right">{gb}</td>
                      <td className="px-2 py-1 text-right">{team.runsScored}</td>
                      <td className="px-2 py-1 text-right">{team.runsAllowed}</td>
                      <td className="px-2 py-1 text-right">
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
