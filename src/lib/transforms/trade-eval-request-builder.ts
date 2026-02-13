/**
 * Trade Evaluation Request Builder
 *
 * REQ-RST-005, REQ-AI-006: Builds a TradeEvaluationRequest from roster data
 * and team metadata. Reusable by both the API (server-side CPU eval)
 * and the client (preview panel).
 *
 * Layer 1: Pure logic, no I/O, no side effects.
 */

import type { TradeEvaluationRequest } from '../types/ai';
import type { ManagerStyle } from '../simulation/manager-profiles';
import type { PlayerCard } from '../types/player';
import type { RosterEntry } from '../types/roster';

/** Core positions that define team needs. */
const CORE_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP'] as const;

/**
 * Compute player value using real MLB stats when available, falling back to
 * raw APBA card byte sum. Aligns with draft valuation formula (migration 00022).
 *
 * Batters: OPS * 100 + SB * 0.5 + fieldingPct * 20
 * Pitchers: (4.50 - ERA) * 30 + K9 * 5
 * Fallback: sum of all 35 card bytes
 */
function playerValue(card: PlayerCard): number {
  // Pitcher with real stats
  if (card.isPitcher && card.pitching) {
    return Math.max(0, (4.50 - card.pitching.era) * 30 + card.pitching.k9 * 5);
  }

  // Batter with real MLB stats
  if (!card.isPitcher && card.mlbBattingStats) {
    return card.mlbBattingStats.OPS * 100
      + card.mlbBattingStats.SB * 0.5
      + card.fieldingPct * 20;
  }

  // Fallback: raw APBA card byte sum
  if (!card.card || card.card.length === 0) return 0;
  return card.card.reduce((sum, v) => sum + v, 0);
}

/**
 * Find a roster entry by player ID.
 */
function findEntry(roster: readonly RosterEntry[], playerId: string): RosterEntry | undefined {
  return roster.find((r) => r.playerId === playerId);
}

/**
 * Map a player ID to { name, position, value } using roster data.
 */
function mapPlayer(
  roster: readonly RosterEntry[],
  playerId: string,
): { name: string; position: string; value: number } {
  const entry = findEntry(roster, playerId);
  if (!entry) {
    return { name: playerId, position: 'UT', value: 0 };
  }
  const card = entry.playerCard;
  return {
    name: `${card.nameFirst} ${card.nameLast}`,
    position: card.eligiblePositions?.[0] ?? 'UT',
    value: playerValue(card),
  };
}

/**
 * Compute positions where the target team has no coverage.
 */
function computeTeamNeeds(roster: readonly RosterEntry[]): string[] {
  const coveredPositions = new Set<string>();
  for (const entry of roster) {
    if (entry.playerCard.eligiblePositions) {
      for (const pos of entry.playerCard.eligiblePositions) {
        coveredPositions.add(pos);
      }
    }
  }
  return CORE_POSITIONS.filter((pos) => !coveredPositions.has(pos));
}

/**
 * Build a TradeEvaluationRequest from roster data and team metadata.
 */
export function buildTradeEvalRequest(opts: {
  managerStyle: ManagerStyle;
  managerName: string;
  teamName: string;
  rosterA: readonly RosterEntry[];
  rosterB: readonly RosterEntry[];
  playersFromA: readonly string[];
  playersFromB: readonly string[];
}): TradeEvaluationRequest {
  const playersOffered = opts.playersFromA.map((pid) => mapPlayer(opts.rosterA, pid));
  const playersRequested = opts.playersFromB.map((pid) => mapPlayer(opts.rosterB, pid));
  const teamNeeds = computeTeamNeeds(opts.rosterB);

  return {
    managerStyle: opts.managerStyle,
    managerName: opts.managerName,
    teamName: opts.teamName,
    playersOffered,
    playersRequested,
    teamNeeds,
  };
}
