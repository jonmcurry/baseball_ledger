/**
 * StandingsTable
 *
 * Division standings grouped by league (AL / NL) with Pennant Race styling.
 * Blue league banners with star ornaments, red division flag bars,
 * streak coloring, run diff coloring.
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

/** Streak badge with W/L coloring. */
function StreakBadge({ streak }: { streak: string }) {
  if (!streak || streak === '-') {
    return <span className="text-[var(--text-tertiary)]">-</span>;
  }
  const isWin = streak.startsWith('W');
  const isLoss = streak.startsWith('L');
  return (
    <span
      className={`inline-block rounded-sm px-1.5 py-px text-[10px] font-bold tracking-wide ${
        isWin
          ? 'bg-[var(--semantic-success)]/12 text-[var(--semantic-success)]'
          : isLoss
            ? 'bg-[var(--semantic-danger)]/12 text-[var(--semantic-danger)]'
            : 'text-[var(--text-tertiary)]'
      }`}
    >
      {streak}
    </span>
  );
}

export function StandingsTable({
  standings,
  userTeamId,
  onTeamClick,
}: StandingsTableProps) {
  if (standings.length === 0) return null;

  // Group divisions by league, sorted East -> Central -> West
  const divisionOrder: Record<string, number> = { East: 0, Central: 1, West: 2 };
  const sortDivisions = (divs: DivisionStandings[]) =>
    [...divs].sort((a, b) => (divisionOrder[a.division] ?? 9) - (divisionOrder[b.division] ?? 9));

  const alDivisions = sortDivisions(standings.filter((d) => d.leagueDivision === 'AL'));
  const nlDivisions = sortDivisions(standings.filter((d) => d.leagueDivision === 'NL'));

  const leagueGroups = [
    { label: 'American League', abbr: 'AL', divisions: alDivisions },
    { label: 'National League', abbr: 'NL', divisions: nlDivisions },
  ].filter((g) => g.divisions.length > 0);

  return (
    <div className="space-y-10">
      {leagueGroups.map((league) => (
        <div key={league.abbr}>
          {/* League header banner -- blue with white text and red stars */}
          <div className="mb-6">
            <div
              className="flex items-center rounded-sm px-4 py-1.5"
              style={{ background: 'var(--accent-primary)' }}
            >
              <h3
                className="font-display text-lg tracking-[0.15em] uppercase md:text-xl"
                style={{ color: 'var(--cream-white)' }}
              >
                {league.label}
              </h3>
              <span
                className="ml-auto text-[10px] tracking-[4px]"
                style={{ color: 'var(--accent-secondary)' }}
                aria-hidden="true"
              >
                &#9733; &#9733; &#9733;
              </span>
            </div>
          </div>

          {/* Divisions within this league */}
          <div className="space-y-8">
            {league.divisions.map((div) => {
              const leader = div.teams[0];
              return (
                <section key={`${div.leagueDivision}-${div.division}`}>
                  {/* Division sub-header with red flag bar */}
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="h-5 w-1 rounded-sm"
                      style={{ background: 'var(--accent-secondary)' }}
                      aria-hidden="true"
                    />
                    <h4 className="font-headline text-base font-bold tracking-wide text-[var(--accent-primary)]">
                      {div.leagueDivision} {div.division}
                    </h4>
                    <div
                      className="h-px flex-1 bg-[var(--border-default)] opacity-60"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Division table */}
                  <div
                    className="overflow-x-auto rounded"
                    style={{
                      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <table className="w-full font-stat text-sm" role="table">
                      <thead>
                        <tr
                          style={{
                            background: 'var(--accent-primary)',
                            color: 'var(--cream-white)',
                          }}
                        >
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider">Team</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider">W</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider">L</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider">PCT</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider max-md:hidden">GB</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider max-md:hidden">HOME</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider max-md:hidden">AWAY</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider max-md:hidden">RS</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider max-md:hidden">RA</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider max-md:hidden">DIFF</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider max-lg:hidden">STRK</th>
                          <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider max-lg:hidden">L10</th>
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
                          const isEven = idx % 2 === 0;

                          return (
                            <tr
                              key={team.id}
                              onClick={() => onTeamClick(team.id)}
                              className={`cursor-pointer border-b border-sandstone/50 transition-colors hover:bg-sandstone/20 ${
                                isUser ? 'bg-sandstone/30' : isEven ? 'bg-[var(--surface-raised)]' : ''
                              }`}
                            >
                              <td className="px-3 py-1.5 text-left">
                                <span className={`font-medium ${isUser ? 'text-[var(--accent-secondary)]' : ''}`}>
                                  {team.name}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">{team.wins}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums">{team.losses}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums">{pct.toFixed(3).slice(1)}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums max-md:hidden">{gb}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums max-md:hidden">
                                {team.homeWins}-{team.homeLosses}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums max-md:hidden">
                                {team.awayWins}-{team.awayLosses}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums max-md:hidden">{team.runsScored}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums max-md:hidden">{team.runsAllowed}</td>
                              <td
                                className={`px-2 py-1.5 text-right tabular-nums max-md:hidden ${
                                  diff > 0
                                    ? 'text-[var(--semantic-success)]'
                                    : diff < 0
                                      ? 'text-[var(--semantic-danger)]'
                                      : ''
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </td>
                              <td className="px-2 py-1.5 text-right max-lg:hidden">
                                <StreakBadge streak={team.streak} />
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums max-lg:hidden">
                                {team.lastTenWins}-{team.lastTenLosses}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default StandingsTable;
