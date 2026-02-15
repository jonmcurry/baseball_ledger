/**
 * StandingsTable
 *
 * Division standings grouped by league (AL / NL) with vintage gazette styling.
 * Double-rule borders, diamond ornaments, streak coloring, run diff coloring.
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

/** Small rotated square used as a decorative gazette-style separator. */
function DiamondOrnament({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-2.5 w-2.5 ${className}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="0" width="6" height="6" transform="rotate(45 6 6)" />
    </svg>
  );
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

  // Group divisions by league
  const nlDivisions = standings.filter((d) => d.leagueDivision === 'NL');
  const alDivisions = standings.filter((d) => d.leagueDivision === 'AL');

  const leagueGroups = [
    { label: 'American League', abbr: 'AL', divisions: alDivisions },
    { label: 'National League', abbr: 'NL', divisions: nlDivisions },
  ].filter((g) => g.divisions.length > 0);

  return (
    <div className="space-y-10">
      {leagueGroups.map((league) => (
        <div key={league.abbr}>
          {/* League header with decorative double rules */}
          <div className="mb-6">
            <div aria-hidden="true">
              <div className="h-px bg-[var(--border-default)]" />
              <div className="mt-[2px] h-[2px] bg-[var(--accent-primary)] opacity-50" />
            </div>

            <div className="flex items-center justify-center gap-3 py-3">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <div className="h-px w-6 bg-[var(--border-default)] md:w-14" />
                <DiamondOrnament className="text-[var(--accent-primary)] opacity-40" />
                <div className="h-px w-3 bg-[var(--border-default)] md:w-6" />
                <DiamondOrnament className="text-[var(--accent-primary)] opacity-25 h-1.5 w-1.5" />
              </div>

              <h3
                className="font-display text-base tracking-[0.3em] uppercase text-[var(--accent-primary)] md:text-lg"
                style={{
                  textShadow: '1px 1px 0 rgba(255,255,255,0.6), -0.5px -0.5px 0 rgba(0,0,0,0.06)',
                }}
              >
                {league.label}
              </h3>

              <div className="flex items-center gap-1.5" aria-hidden="true">
                <DiamondOrnament className="text-[var(--accent-primary)] opacity-25 h-1.5 w-1.5" />
                <div className="h-px w-3 bg-[var(--border-default)] md:w-6" />
                <DiamondOrnament className="text-[var(--accent-primary)] opacity-40" />
                <div className="h-px w-6 bg-[var(--border-default)] md:w-14" />
              </div>
            </div>

            <div aria-hidden="true">
              <div className="h-[2px] bg-[var(--accent-primary)] opacity-50" />
              <div className="mt-[2px] h-px bg-[var(--border-default)]" />
            </div>
          </div>

          {/* Divisions within this league */}
          <div className="space-y-8">
            {league.divisions.map((div) => {
              const leader = div.teams[0];
              return (
                <section key={`${div.leagueDivision}-${div.division}`}>
                  {/* Division sub-header with accent bar */}
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="h-5 w-1 rounded-sm bg-[var(--accent-primary)] opacity-60"
                      aria-hidden="true"
                    />
                    <h4 className="font-headline text-base font-bold tracking-wide text-ballpark">
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
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.1)',
                    }}
                  >
                    <table className="w-full font-stat text-sm" role="table">
                      <thead>
                        <tr
                          className="text-[var(--text-secondary)]"
                          style={{
                            background: 'linear-gradient(180deg, var(--surface-overlay) 0%, var(--surface-highlight) 100%)',
                            borderBottom: '2px solid var(--border-default)',
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
                                <span className={`font-medium ${isUser ? 'text-[var(--accent-primary)]' : ''}`}>
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
