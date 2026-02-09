/**
 * StatColumnConfigs
 *
 * Column configurations for batting and pitching stat tables.
 */

import type { StatColumn } from '@components/data-display/StatTable';
import type { BattingLeaderEntry, PitchingLeaderEntry } from '@lib/stats/leaders';

export const BATTING_COLUMNS: StatColumn<BattingLeaderEntry>[] = [
  { key: 'name', header: 'Player', getValue: (r) => r.playerId },
  { key: 'team', header: 'Team', getValue: (r) => r.teamId },
  { key: 'G', header: 'G', getValue: (r) => r.stats.G, numeric: true },
  { key: 'AB', header: 'AB', getValue: (r) => r.stats.AB, numeric: true },
  { key: 'R', header: 'R', getValue: (r) => r.stats.R, numeric: true },
  { key: 'H', header: 'H', getValue: (r) => r.stats.H, numeric: true },
  { key: 'doubles', header: '2B', getValue: (r) => r.stats.doubles, numeric: true },
  { key: 'triples', header: '3B', getValue: (r) => r.stats.triples, numeric: true },
  { key: 'HR', header: 'HR', getValue: (r) => r.stats.HR, numeric: true },
  { key: 'RBI', header: 'RBI', getValue: (r) => r.stats.RBI, numeric: true },
  { key: 'SB', header: 'SB', getValue: (r) => r.stats.SB, numeric: true },
  { key: 'BB', header: 'BB', getValue: (r) => r.stats.BB, numeric: true },
  { key: 'SO', header: 'SO', getValue: (r) => r.stats.SO, numeric: true },
  { key: 'BA', header: 'AVG', getValue: (r) => r.stats.BA.toFixed(3), numeric: true },
  { key: 'OBP', header: 'OBP', getValue: (r) => r.stats.OBP.toFixed(3), numeric: true },
  { key: 'SLG', header: 'SLG', getValue: (r) => r.stats.SLG.toFixed(3), numeric: true },
  { key: 'OPS', header: 'OPS', getValue: (r) => r.stats.OPS.toFixed(3), numeric: true },
];

export const PITCHING_COLUMNS: StatColumn<PitchingLeaderEntry>[] = [
  { key: 'name', header: 'Player', getValue: (r) => r.playerId },
  { key: 'team', header: 'Team', getValue: (r) => r.teamId },
  { key: 'W', header: 'W', getValue: (r) => r.stats.W, numeric: true },
  { key: 'L', header: 'L', getValue: (r) => r.stats.L, numeric: true },
  { key: 'ERA', header: 'ERA', getValue: (r) => r.stats.ERA.toFixed(2), numeric: true },
  { key: 'G', header: 'G', getValue: (r) => r.stats.G, numeric: true },
  { key: 'GS', header: 'GS', getValue: (r) => r.stats.GS, numeric: true },
  { key: 'SV', header: 'SV', getValue: (r) => r.stats.SV, numeric: true },
  { key: 'IP', header: 'IP', getValue: (r) => r.stats.IP, numeric: true },
  { key: 'H', header: 'H', getValue: (r) => r.stats.H, numeric: true },
  { key: 'BB', header: 'BB', getValue: (r) => r.stats.BB, numeric: true },
  { key: 'SO', header: 'SO', getValue: (r) => r.stats.SO, numeric: true },
  { key: 'WHIP', header: 'WHIP', getValue: (r) => r.stats.WHIP.toFixed(2), numeric: true },
  { key: 'CG', header: 'CG', getValue: (r) => r.stats.CG, numeric: true },
  { key: 'SHO', header: 'SHO', getValue: (r) => r.stats.SHO, numeric: true },
];
