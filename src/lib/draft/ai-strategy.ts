/**
 * AI Draft Strategy
 *
 * REQ-DFT-006: CPU-controlled teams draft using a round-aware priority
 * system. Early rounds favor elite players, mid rounds fill rotation and
 * premium positions, late rounds grab relievers and bench depth.
 *
 * Strategy:
 *  - Early (1-3): Best available SP or elite position player. No CL/RP.
 *  - Mid (4-8): Fill rotation to 4 SP. Premium positions (C, SS, CF).
 *  - Late (9+): Relievers, closer, bench, defensive specialists.
 *
 * In mid/late rounds, the AI targets specific position needs first,
 * then falls back to best available.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { PlayerCard, Position } from '../types/player';
import type { SeededRNG } from '../rng/seeded-rng';
import { calculatePlayerValue } from './ai-valuation';

/** A player available for drafting, with raw stats for valuation. */
export interface DraftablePlayer {
  card: PlayerCard;
  ops: number;   // Raw OPS for batter valuation
  sb: number;    // Raw SB count for batter valuation
}

/** A roster need with priority weighting. */
export interface PositionNeed {
  position: Position;
  slot: 'starter' | 'bench' | 'rotation' | 'bullpen' | 'closer';
  priority: number; // Higher = more urgent
}

/** Required roster composition per REQ-DFT-008. */
const ROSTER_REQUIREMENTS: Array<{ position: Position; slot: string; count: number }> = [
  { position: 'C', slot: 'starter', count: 1 },
  { position: '1B', slot: 'starter', count: 1 },
  { position: '2B', slot: 'starter', count: 1 },
  { position: 'SS', slot: 'starter', count: 1 },
  { position: '3B', slot: 'starter', count: 1 },
  { position: 'LF', slot: 'starter', count: 1 },
  { position: 'CF', slot: 'starter', count: 1 },
  { position: 'RF', slot: 'starter', count: 1 },
  { position: 'DH', slot: 'starter', count: 1 },
  { position: 'SP', slot: 'rotation', count: 4 },
  { position: 'RP', slot: 'bullpen', count: 3 },
  { position: 'CL', slot: 'closer', count: 1 },
];

const BENCH_SIZE = 4;
const EARLY_ROUND_END = 3;
const MID_ROUND_END = 8;
const PREMIUM_POSITIONS: Position[] = ['C', 'SS', 'CF'];

/**
 * Analyze the current roster to determine what positions still need filling.
 */
export function getRosterNeeds(roster: DraftablePlayer[]): PositionNeed[] {
  const needs: PositionNeed[] = [];
  const positionCounts = new Map<string, number>();
  let benchCount = 0;

  for (const entry of roster) {
    const card = entry.card;
    if (card.isPitcher && card.pitching) {
      const key = `${card.pitching.role}_pitch`;
      positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1);
    } else {
      const key = `${card.primaryPosition}_starter`;
      const current = positionCounts.get(key) ?? 0;
      const req = ROSTER_REQUIREMENTS.find(
        (r) => r.position === card.primaryPosition && r.slot === 'starter',
      );
      if (req && current < req.count) {
        positionCounts.set(key, current + 1);
      } else {
        benchCount++;
      }
    }
  }

  for (const req of ROSTER_REQUIREMENTS) {
    const key = (req.slot === 'rotation' || req.slot === 'bullpen' || req.slot === 'closer')
      ? `${req.position}_pitch`
      : `${req.position}_starter`;
    const have = positionCounts.get(key) ?? 0;
    const needed = req.count - have;
    for (let i = 0; i < needed; i++) {
      needs.push({
        position: req.position,
        slot: req.slot as PositionNeed['slot'],
        priority: req.slot === 'starter' ? 10 : req.slot === 'rotation' ? 8 : 6,
      });
    }
  }

  const benchNeeded = BENCH_SIZE - benchCount;
  for (let i = 0; i < benchNeeded; i++) {
    needs.push({ position: 'DH', slot: 'bench', priority: 3 });
  }

  return needs;
}

/**
 * Filter available players to exclude those already on the roster.
 */
function filterAvailable(
  pool: DraftablePlayer[],
  roster: DraftablePlayer[],
): DraftablePlayer[] {
  const rosterIds = new Set(roster.map((r) => r.card.playerId));
  return pool.filter((p) => !rosterIds.has(p.card.playerId));
}

/**
 * Get a player's effective position for matching against needs.
 */
function getPlayerPosition(player: DraftablePlayer): string {
  if (player.card.isPitcher && player.card.pitching) {
    return player.card.pitching.role;
  }
  return player.card.primaryPosition;
}

/**
 * Get player value for sorting.
 */
function getPlayerValue(player: DraftablePlayer): number {
  return calculatePlayerValue(player.card, { ops: player.ops, sb: player.sb });
}

/**
 * Sort players by value descending with RNG tiebreaking.
 */
function sortByValue(players: DraftablePlayer[], rng: SeededRNG): DraftablePlayer[] {
  return [...players].sort((a, b) => {
    const diff = getPlayerValue(b) - getPlayerValue(a);
    if (Math.abs(diff) < 0.01) return rng.nextFloat() - 0.5;
    return diff;
  });
}

/**
 * Find best available player matching any of the given positions.
 */
function bestAtPositions(
  available: DraftablePlayer[],
  positions: Position[],
  rng: SeededRNG,
): DraftablePlayer | null {
  const candidates = available.filter((p) => {
    const pos = getPlayerPosition(p);
    return positions.includes(pos as Position);
  });
  if (candidates.length === 0) return null;
  return sortByValue(candidates, rng)[0];
}

/**
 * Select the AI's draft pick for a given round.
 *
 * @param round - Current draft round (1-based)
 * @param roster - Current team roster (picks made so far)
 * @param pool - All available players
 * @param rng - Seeded RNG for tiebreaking
 * @returns The selected player
 */
export function selectAIPick(
  round: number,
  roster: DraftablePlayer[],
  pool: DraftablePlayer[],
  rng: SeededRNG,
): DraftablePlayer {
  const available = filterAvailable(pool, roster);
  const needs = getRosterNeeds(roster);
  const sorted = sortByValue(available, rng);

  if (sorted.length === 0) {
    return available[0];
  }

  // -----------------------------------------------------------------------
  // Early rounds (1-3): Best SP or elite position player, no CL/RP
  // -----------------------------------------------------------------------
  if (round <= EARLY_ROUND_END) {
    const eligible = sorted.filter((p) => {
      const pos = getPlayerPosition(p);
      return pos !== 'CL' && pos !== 'RP';
    });
    return eligible.length > 0 ? eligible[0] : sorted[0];
  }

  // -----------------------------------------------------------------------
  // Mid rounds (4-8): Fill rotation, then premium positions, then best
  // -----------------------------------------------------------------------
  if (round <= MID_ROUND_END) {
    // Priority 1: Fill SP rotation if needed
    const spNeeds = needs.filter((n) => n.position === 'SP');
    if (spNeeds.length > 0) {
      const sp = bestAtPositions(available, ['SP'], rng);
      if (sp) return sp;
    }

    // Priority 2: Premium position gaps
    const premiumNeeds = needs.filter(
      (n) => PREMIUM_POSITIONS.includes(n.position) && n.slot === 'starter',
    );
    if (premiumNeeds.length > 0) {
      const positions = premiumNeeds.map((n) => n.position);
      const premium = bestAtPositions(available, positions, rng);
      if (premium) return premium;
    }

    // Priority 3: Any unfilled starter position
    const starterNeeds = needs.filter((n) => n.slot === 'starter');
    if (starterNeeds.length > 0) {
      const positions = starterNeeds.map((n) => n.position);
      const starter = bestAtPositions(available, positions, rng);
      if (starter) return starter;
    }

    // Fallback: best available
    return sorted[0];
  }

  // -----------------------------------------------------------------------
  // Late rounds (9+): RP, CL, bench, defensive specialists
  // -----------------------------------------------------------------------

  // Priority 1: Closer if needed
  const clNeeds = needs.filter((n) => n.position === 'CL');
  if (clNeeds.length > 0) {
    const cl = bestAtPositions(available, ['CL'], rng);
    if (cl) return cl;
  }

  // Priority 2: Relief pitchers if needed
  const rpNeeds = needs.filter((n) => n.position === 'RP');
  if (rpNeeds.length > 0) {
    const rp = bestAtPositions(available, ['RP'], rng);
    if (rp) return rp;
  }

  // Priority 3: Any remaining starter positions
  const starterNeeds = needs.filter((n) => n.slot === 'starter');
  if (starterNeeds.length > 0) {
    const positions = starterNeeds.map((n) => n.position);
    const starter = bestAtPositions(available, positions, rng);
    if (starter) return starter;
  }

  // Priority 4: SP if still needed
  const spNeeds = needs.filter((n) => n.position === 'SP');
  if (spNeeds.length > 0) {
    const sp = bestAtPositions(available, ['SP'], rng);
    if (sp) return sp;
  }

  // Fallback: best available (fills bench)
  return sorted[0];
}
