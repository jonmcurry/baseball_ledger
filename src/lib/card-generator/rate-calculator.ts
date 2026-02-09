import type { BattingStats } from '@lib/types';

/**
 * Per-PA rates computed from a player's BattingStats (REQ-DATA-005 Step 1).
 * All rates are in the range [0, 1].
 */
export interface PlayerRates {
  PA: number;
  walkRate: number;
  strikeoutRate: number;
  homeRunRate: number;
  singleRate: number;
  doubleRate: number;
  tripleRate: number;
  sbRate: number;         // SB / (SB + CS), or 0 if no attempts
  iso: number;            // SLG - BA (isolated power)
  hbpRate: number;
  sfRate: number;
  shRate: number;
  gdpRate: number;
}

/**
 * Compute per-PA batting rates from BattingStats (REQ-DATA-005 Step 1).
 *
 * PA = AB + BB + HBP + SH + SF
 * Each rate = counting stat / PA.
 * ISO = SLG - BA (already derived in BattingStats).
 */
export function computePlayerRates(stats: BattingStats): PlayerRates {
  const PA = stats.AB + stats.BB + stats.HBP + stats.SH + stats.SF;

  if (PA === 0) {
    return {
      PA: 0,
      walkRate: 0,
      strikeoutRate: 0,
      homeRunRate: 0,
      singleRate: 0,
      doubleRate: 0,
      tripleRate: 0,
      sbRate: 0,
      iso: 0,
      hbpRate: 0,
      sfRate: 0,
      shRate: 0,
      gdpRate: 0,
    };
  }

  const singles = stats.H - stats.doubles - stats.triples - stats.HR;

  return {
    PA,
    walkRate: stats.BB / PA,
    strikeoutRate: stats.SO / PA,
    homeRunRate: stats.HR / PA,
    singleRate: Math.max(0, singles / PA),
    doubleRate: stats.doubles / PA,
    tripleRate: stats.triples / PA,
    sbRate: stats.SB + stats.CS > 0 ? stats.SB / (stats.SB + stats.CS) : 0,
    iso: stats.SLG - stats.BA,
    hbpRate: stats.HBP / PA,
    sfRate: stats.SF / PA,
    shRate: stats.SH / PA,
    gdpRate: stats.GIDP / PA,
  };
}
