/**
 * BoxScoreDisplay
 *
 * Full box score with line score, batting lines, and pitching lines.
 * Splits batting and pitching by team (away/home) when teamSide data
 * is available. Falls back to combined view for legacy game data.
 * ESPN-style column layout with TEAM totals rows and detail sections.
 * Composes LineScore component.
 * Feature-scoped sub-component. No store imports.
 */

import { useMemo } from 'react';
import { LineScore } from '@components/baseball/LineScore';
import type { InningScore, LineScoreTotals } from '@components/baseball/LineScore';
import type { BoxScore, BattingLine, PitchingLine, PlayByPlayEntry, BaseState } from '@lib/types/game';
import { OutcomeCategory } from '@lib/types/game';
import { computeBA, computeOBP, computeSLG, computeERA, addIP } from '@lib/stats/derived';

// ---- Season stats types ----

export interface SeasonBattingSnapshot {
  AB: number;
  H: number;
  doubles: number;
  triples: number;
  HR: number;
  BB: number;
  HBP: number;
  SF: number;
}

export interface SeasonStatsMap {
  [playerId: string]: { batting?: SeasonBattingSnapshot };
}

export interface BoxScoreDisplayProps {
  readonly boxScore: BoxScore | null;
  readonly battingLines: readonly BattingLine[];
  readonly pitchingLines: readonly PitchingLine[];
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly playByPlay?: readonly PlayByPlayEntry[];
  readonly seasonStats?: SeasonStatsMap;
}

// ---- Rate stat formatting ----

/** Format a rate stat as .XXX (strip leading zero when < 1). */
function formatRate(value: number): string {
  const str = value.toFixed(3);
  return value < 1 && value >= 0 ? str.replace(/^0/, '') : str;
}

/** Compute cumulative AVG/OBP/SLG from season snapshot + this game's line. */
function cumulativeRates(
  game: BattingLine,
  season?: SeasonBattingSnapshot,
) {
  const ab = (season?.AB ?? 0) + game.AB;
  const h = (season?.H ?? 0) + game.H;
  const doubles = (season?.doubles ?? 0) + game.doubles;
  const triples = (season?.triples ?? 0) + game.triples;
  const hr = (season?.HR ?? 0) + game.HR;
  const bb = (season?.BB ?? 0) + game.BB;
  const hbp = (season?.HBP ?? 0) + game.HBP;
  const sf = (season?.SF ?? 0) + game.SF;
  return {
    avg: computeBA(h, ab),
    obp: computeOBP(h, bb, hbp, ab, sf),
    slg: computeSLG(h, doubles, triples, hr, ab),
  };
}

// ---- Table sub-components ----

const TH = 'py-0.5 text-center font-medium';
const TD = 'py-0.5 text-center';

function BattingTable({
  lines,
  label,
  seasonStats,
}: {
  lines: readonly BattingLine[];
  label: string;
  seasonStats?: SeasonStatsMap;
}) {
  const teamTotals = useMemo(() => ({
    AB: lines.reduce((s, l) => s + l.AB, 0),
    R: lines.reduce((s, l) => s + l.R, 0),
    H: lines.reduce((s, l) => s + l.H, 0),
    RBI: lines.reduce((s, l) => s + l.RBI, 0),
    HR: lines.reduce((s, l) => s + l.HR, 0),
    BB: lines.reduce((s, l) => s + l.BB, 0),
    K: lines.reduce((s, l) => s + l.SO, 0),
  }), [lines]);

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="overflow-x-auto">
        <table className="w-full font-stat text-xs" role="table">
          <thead>
            <tr className="border-b border-sandstone text-muted">
              <th className="py-0.5 text-left font-medium">Hitters</th>
              <th className={TH}>AB</th>
              <th className={TH}>R</th>
              <th className={TH}>H</th>
              <th className={TH}>RBI</th>
              <th className={TH}>HR</th>
              <th className={TH}>BB</th>
              <th className={TH}>K</th>
              <th className={TH}>AVG</th>
              <th className={TH}>OBP</th>
              <th className={TH}>SLG</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const rates = cumulativeRates(line, seasonStats?.[line.playerId]?.batting);
              const name = line.playerName ?? line.playerId;
              const pos = line.position;
              return (
                <tr key={line.playerId} className="border-b border-sandstone/30">
                  <td className="py-0.5 text-ink">
                    {name}{pos ? <span className="ml-1 text-muted">{pos}</span> : null}
                  </td>
                  <td className={TD}>{line.AB}</td>
                  <td className={TD}>{line.R}</td>
                  <td className={TD}>{line.H}</td>
                  <td className={TD}>{line.RBI}</td>
                  <td className={TD}>{line.HR}</td>
                  <td className={TD}>{line.BB}</td>
                  <td className={TD}>{line.SO}</td>
                  <td className={TD}>{formatRate(rates.avg)}</td>
                  <td className={TD}>{formatRate(rates.obp)}</td>
                  <td className={TD}>{formatRate(rates.slg)}</td>
                </tr>
              );
            })}
            {lines.length > 0 && (
              <tr className="border-t border-sandstone font-bold">
                <td className="py-0.5 text-ink">TEAM</td>
                <td className={TD}>{teamTotals.AB}</td>
                <td className={TD}>{teamTotals.R}</td>
                <td className={TD}>{teamTotals.H}</td>
                <td className={TD}>{teamTotals.RBI}</td>
                <td className={TD}>{teamTotals.HR}</td>
                <td className={TD}>{teamTotals.BB}</td>
                <td className={TD}>{teamTotals.K}</td>
                <td className={TD} />
                <td className={TD} />
                <td className={TD} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PitchingTable({ lines, label }: { lines: readonly PitchingLine[]; label: string }) {
  const teamTotals = useMemo(() => {
    let totalIP = 0;
    for (const l of lines) {
      totalIP = addIP(totalIP, l.IP);
    }
    return {
      IP: totalIP,
      H: lines.reduce((s, l) => s + l.H, 0),
      R: lines.reduce((s, l) => s + l.R, 0),
      ER: lines.reduce((s, l) => s + l.ER, 0),
      BB: lines.reduce((s, l) => s + l.BB, 0),
      K: lines.reduce((s, l) => s + l.SO, 0),
      HR: lines.reduce((s, l) => s + l.HR, 0),
    };
  }, [lines]);

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="overflow-x-auto">
        <table className="w-full font-stat text-xs" role="table">
          <thead>
            <tr className="border-b border-sandstone text-muted">
              <th className="py-0.5 text-left font-medium">Pitchers</th>
              <th className={TH}>IP</th>
              <th className={TH}>H</th>
              <th className={TH}>R</th>
              <th className={TH}>ER</th>
              <th className={TH}>BB</th>
              <th className={TH}>K</th>
              <th className={TH}>HR</th>
              <th className={TH}>ERA</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const name = line.playerName ?? line.playerId;
              const era = line.IP > 0 ? computeERA(line.ER, line.IP).toFixed(2) : '-';
              return (
                <tr key={line.playerId} className="border-b border-sandstone/30">
                  <td className="py-0.5 text-ink">
                    {line.decision
                      ? <>{name} <span className="font-bold">({line.decision})</span></>
                      : name}
                  </td>
                  <td className={TD}>{line.IP}</td>
                  <td className={TD}>{line.H}</td>
                  <td className={TD}>{line.R}</td>
                  <td className={TD}>{line.ER}</td>
                  <td className={TD}>{line.BB}</td>
                  <td className={TD}>{line.SO}</td>
                  <td className={TD}>{line.HR}</td>
                  <td className={TD}>{era}</td>
                </tr>
              );
            })}
            {lines.length > 0 && (
              <tr className="border-t border-sandstone font-bold">
                <td className="py-0.5 text-ink">TEAM</td>
                <td className={TD}>{teamTotals.IP}</td>
                <td className={TD}>{teamTotals.H}</td>
                <td className={TD}>{teamTotals.R}</td>
                <td className={TD}>{teamTotals.ER}</td>
                <td className={TD}>{teamTotals.BB}</td>
                <td className={TD}>{teamTotals.K}</td>
                <td className={TD}>{teamTotals.HR}</td>
                <td className={TD}>
                  {teamTotals.IP > 0 ? computeERA(teamTotals.ER, teamTotals.IP).toFixed(2) : '-'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- ESPN-style detail section helpers ----

const HIT_OUTCOMES = new Set([
  OutcomeCategory.SINGLE_CLEAN,
  OutcomeCategory.SINGLE_ADVANCE,
  OutcomeCategory.DOUBLE,
  OutcomeCategory.TRIPLE,
  OutcomeCategory.HOME_RUN,
  OutcomeCategory.HOME_RUN_VARIANT,
]);

const NON_AB_OUTCOMES = new Set([
  OutcomeCategory.WALK,
  OutcomeCategory.WALK_INTENTIONAL,
  OutcomeCategory.HIT_BY_PITCH,
  OutcomeCategory.SACRIFICE,
  OutcomeCategory.STOLEN_BASE_OPP,
  OutcomeCategory.WILD_PITCH,
  OutcomeCategory.BALK,
  OutcomeCategory.PASSED_BALL,
  OutcomeCategory.SPECIAL_EVENT,
]);

/** Format "Name (count), Name (count)" for a numeric batting stat. */
function formatStatPlayers(
  lines: readonly BattingLine[],
  field: keyof BattingLine,
): string | null {
  const entries = lines
    .filter((l) => (l[field] as number) > 0)
    .map((l) => {
      const name = l.playerName ?? l.playerId;
      return `${name} (${l[field] as number})`;
    });
  return entries.length > 0 ? entries.join(', ') : null;
}

/** Count runners left on base at the end of each half-inning. */
function computeTeamLOB(
  plays: readonly PlayByPlayEntry[],
  battingSide: 'top' | 'bottom',
): number {
  const sidePlays = plays.filter((p) => p.halfInning === battingSide);
  if (sidePlays.length === 0) return 0;

  const byInning = new Map<number, PlayByPlayEntry[]>();
  for (const play of sidePlays) {
    const arr = byInning.get(play.inning) ?? [];
    arr.push(play);
    byInning.set(play.inning, arr);
  }

  let lob = 0;
  for (const inningPlays of byInning.values()) {
    const last = inningPlays[inningPlays.length - 1];
    if (last.basesAfter.first !== null) lob++;
    if (last.basesAfter.second !== null) lob++;
    if (last.basesAfter.third !== null) lob++;
  }
  return lob;
}

/** Compute RISP {hits, atBats} for a team's batting side. */
function computeTeamRISP(
  plays: readonly PlayByPlayEntry[],
  battingSide: 'top' | 'bottom',
): { hits: number; atBats: number } {
  const sidePlays = plays.filter((p) => p.halfInning === battingSide);
  let hits = 0;
  let atBats = 0;

  for (let i = 0; i < sidePlays.length; i++) {
    const play = sidePlays[i];
    // Bases before play: empty at half-inning start, else previous basesAfter
    let basesBefore: BaseState;
    if (i === 0 || sidePlays[i - 1].inning !== play.inning) {
      basesBefore = { first: null, second: null, third: null };
    } else {
      basesBefore = sidePlays[i - 1].basesAfter;
    }

    if (basesBefore.second !== null || basesBefore.third !== null) {
      if (!NON_AB_OUTCOMES.has(play.outcome)) {
        atBats++;
        if (HIT_OUTCOMES.has(play.outcome)) hits++;
      }
    }
  }

  return { hits, atBats };
}

/** Compute 2-out RBI batters from play-by-play. */
function compute2OutRBI(
  plays: readonly PlayByPlayEntry[],
  battingSide: 'top' | 'bottom',
  battingLines: readonly BattingLine[],
): string | null {
  const sidePlays = plays.filter((p) => p.halfInning === battingSide);
  const scoreKey = battingSide === 'top' ? 'away' as const : 'home' as const;
  const rbiByBatter = new Map<string, number>();

  for (let i = 0; i < sidePlays.length; i++) {
    const play = sidePlays[i];
    if (play.outs !== 2) continue;

    const prevScore = i > 0 ? sidePlays[i - 1].scoreAfter[scoreKey] : 0;
    const runsScored = play.scoreAfter[scoreKey] - prevScore;

    if (runsScored > 0) {
      rbiByBatter.set(play.batterId, (rbiByBatter.get(play.batterId) ?? 0) + runsScored);
    }
  }

  if (rbiByBatter.size === 0) return null;

  const nameMap = new Map(battingLines.map((l) => [l.playerId, l.playerName ?? l.playerId]));
  return Array.from(rbiByBatter)
    .map(([id, count]) => `${nameMap.get(id) ?? id} (${count})`)
    .join(', ');
}

/** Count double plays turned by a team (fielding stat). */
function computeDP(
  plays: readonly PlayByPlayEntry[],
  battingSide: 'top' | 'bottom',
): number {
  // Team fields in the opposite half-inning from when they bat
  const fieldingHalf = battingSide === 'top' ? 'bottom' : 'top';
  return plays.filter(
    (p) =>
      p.halfInning === fieldingHalf &&
      (p.outcome === OutcomeCategory.DOUBLE_PLAY ||
        p.outcome === OutcomeCategory.DOUBLE_PLAY_LINE),
  ).length;
}

function TeamDetailSection({
  battingLines,
  battingSide,
  playByPlay,
}: {
  battingLines: readonly BattingLine[];
  battingSide: 'top' | 'bottom';
  playByPlay: readonly PlayByPlayEntry[];
}) {
  const doubles = formatStatPlayers(battingLines, 'doubles');
  const triples = formatStatPlayers(battingLines, 'triples');
  const hr = formatStatPlayers(battingLines, 'HR');
  const rbi = formatStatPlayers(battingLines, 'RBI');
  const hbp = formatStatPlayers(battingLines, 'HBP');
  const sf = formatStatPlayers(battingLines, 'SF');
  const sb = formatStatPlayers(battingLines, 'SB');
  const cs = formatStatPlayers(battingLines, 'CS');
  const twoOutRBI = compute2OutRBI(playByPlay, battingSide, battingLines);
  const teamLOB = computeTeamLOB(playByPlay, battingSide);
  const risp = computeTeamRISP(playByPlay, battingSide);
  const dp = computeDP(playByPlay, battingSide);

  const battingItems: [string, string][] = [];
  if (doubles) battingItems.push(['2B', doubles]);
  if (triples) battingItems.push(['3B', triples]);
  if (hr) battingItems.push(['HR', hr]);
  if (rbi) battingItems.push(['RBI', rbi]);
  if (hbp) battingItems.push(['HBP', hbp]);
  if (sf) battingItems.push(['SF', sf]);
  if (twoOutRBI) battingItems.push(['2-Out RBI', twoOutRBI]);
  battingItems.push(['Team LOB', String(teamLOB)]);
  if (risp.atBats > 0) battingItems.push(['Team RISP', `${risp.hits}-${risp.atBats}`]);

  const baserunningItems: [string, string][] = [];
  if (sb) baserunningItems.push(['SB', sb]);
  if (cs) baserunningItems.push(['CS', cs]);

  const hasBatting = battingItems.length > 0;
  const hasBaserunning = baserunningItems.length > 0;
  const hasFielding = dp > 0;

  if (!hasBatting && !hasBaserunning && !hasFielding) return null;

  return (
    <div className="mt-2 space-y-2 border-t border-sandstone/30 pt-2">
      {hasBatting && (
        <div>
          <p className="font-stat text-[10px] font-bold uppercase tracking-wider text-muted">
            Batting
          </p>
          {battingItems.map(([label, value]) => (
            <p key={label} className="font-stat text-xs text-ink">
              <span className="font-bold">{label}:</span> {value}
            </p>
          ))}
        </div>
      )}
      {hasBaserunning && (
        <div>
          <p className="font-stat text-[10px] font-bold uppercase tracking-wider text-muted">
            Baserunning
          </p>
          {baserunningItems.map(([label, value]) => (
            <p key={label} className="font-stat text-xs text-ink">
              <span className="font-bold">{label}:</span> {value}
            </p>
          ))}
        </div>
      )}
      {hasFielding && (
        <div>
          <p className="font-stat text-[10px] font-bold uppercase tracking-wider text-muted">
            Fielding
          </p>
          <p className="font-stat text-xs text-ink">
            <span className="font-bold">DP:</span> {dp}
          </p>
        </div>
      )}
    </div>
  );
}

export function BoxScoreDisplay({
  boxScore,
  battingLines,
  pitchingLines,
  homeTeam,
  awayTeam,
  playByPlay,
  seasonStats,
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
            <div className="space-y-3">
              <BattingTable lines={awayBatting} label="Batting" seasonStats={seasonStats} />
              <PitchingTable lines={awayPitching} label="Pitching" />
            </div>
            {playByPlay && playByPlay.length > 0 && (
              <TeamDetailSection
                battingLines={awayBatting}
                battingSide="top"
                playByPlay={playByPlay}
              />
            )}
          </div>
          {/* Home team */}
          <div className="space-y-3">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              {homeTeam}
            </h4>
            <div className="space-y-3">
              <BattingTable lines={homeBatting} label="Batting" seasonStats={seasonStats} />
              <PitchingTable lines={homePitching} label="Pitching" />
            </div>
            {playByPlay && playByPlay.length > 0 && (
              <TeamDetailSection
                battingLines={homeBatting}
                battingSide="bottom"
                playByPlay={playByPlay}
              />
            )}
          </div>
        </>
      ) : (
        /* Legacy fallback: combined view when teamSide is unavailable */
        <div className="space-y-3">
          <BattingTable lines={awayBatting} label="Batting" seasonStats={seasonStats} />
          <PitchingTable lines={awayPitching} label="Pitching" />
        </div>
      )}
    </div>
  );
}

export default BoxScoreDisplay;
