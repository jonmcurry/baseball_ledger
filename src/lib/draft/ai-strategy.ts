/**
 * AI Draft Strategy
 *
 * REQ-DFT-006: CPU-controlled teams draft using a round-aware priority
 * system. Early rounds favor elite players, mid rounds fill rotation and
 * premium positions, late rounds grab relievers and bench depth.
 *
 * Strategy:
 *  - Early (1-3): Best available SP or elite position player. No CL/RP.
 *  - Mid (4-8): Fill rotation to 4 SP. Premium positions (C, SS).
 *  - Late (9+): Bullpen (RP/CL), bench, defensive specialists.
 *
 * Roster composition: 1C, 1 1B, 1 2B, 1 SS, 1 3B, 3 OF, 1 DH, 4 bench,
 * 4 SP, 4 RP (RP and CL interchangeable). Total = 21.
 *
 * Weighted random selection: AI picks from the top 3 candidates weighted
 * by valuation score, so different RNG seeds produce different drafts.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs + seed.
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
  slot: 'starter' | 'bench' | 'rotation' | 'bullpen';
  priority: number; // Higher = more urgent
}

/** Required roster composition per REQ-DFT-008. */
const ROSTER_REQUIREMENTS: Array<{ position: Position; slot: string; count: number }> = [
  { position: 'C', slot: 'starter', count: 1 },
  { position: '1B', slot: 'starter', count: 1 },
  { position: '2B', slot: 'starter', count: 1 },
  { position: 'SS', slot: 'starter', count: 1 },
  { position: '3B', slot: 'starter', count: 1 },
  { position: 'OF', slot: 'starter', count: 3 },   // Any LF/CF/RF/OF qualifies
  { position: 'DH', slot: 'starter', count: 1 },
  { position: 'SP', slot: 'rotation', count: 4 },
  { position: 'RP', slot: 'bullpen', count: 4 },    // RP and CL both qualify
];

const BENCH_SIZE = 4;
const EARLY_ROUND_END = 3;
const MID_ROUND_END = 8;
const PREMIUM_POSITIONS: Position[] = ['C', 'SS'];
/** Number of top candidates to consider for weighted random selection. */
const TOP_CANDIDATE_COUNT = 3;

/** Outfield positions that count toward the generic OF starter pool. */
const OUTFIELD_POSITIONS: Position[] = ['LF', 'CF', 'RF', 'OF'];
/** Relief pitcher roles that count toward the bullpen pool. */
const RELIEVER_POSITIONS: Position[] = ['RP', 'CL'];

/**
 * Filter out pitching positions that have already reached their roster cap.
 * Prevents drafting a 5th SP or 5th RP/CL when those slots are full.
 */
function excludeFullPitching(
  players: DraftablePlayer[],
  needs: PositionNeed[],
): DraftablePlayer[] {
  const needsSP = needs.some((n) => n.position === 'SP');
  const needsRP = needs.some((n) => n.position === 'RP');

  return players.filter((p) => {
    const pos = getPlayerPosition(p);
    if (pos === 'SP' && !needsSP) return false;
    if ((pos === 'RP' || pos === 'CL') && !needsRP) return false;
    return true;
  });
}

/**
 * Expand abstract position needs to concrete player positions.
 * 'OF' -> LF, CF, RF, OF; 'RP' -> RP, CL.
 */
function expandPositions(positions: Position[]): Position[] {
  const expanded = new Set<Position>();
  for (const pos of positions) {
    if (pos === 'OF') {
      for (const p of OUTFIELD_POSITIONS) expanded.add(p);
    } else if (pos === 'RP') {
      for (const p of RELIEVER_POSITIONS) expanded.add(p);
    } else {
      expanded.add(pos);
    }
  }
  return [...expanded];
}

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
      // RP and CL both count toward the shared bullpen pool
      const role = card.pitching.role === 'SP' ? 'SP' : 'RP';
      const key = `${role}_pitch`;
      positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1);
    } else {
      const pos = card.primaryPosition;
      // Outfielders (LF/CF/RF/OF) share a generic OF pool
      if (OUTFIELD_POSITIONS.includes(pos as Position)) {
        const key = 'OF_starter';
        const current = positionCounts.get(key) ?? 0;
        if (current < 3) {
          positionCounts.set(key, current + 1);
        } else {
          benchCount++;
        }
      } else {
        const key = `${pos}_starter`;
        const current = positionCounts.get(key) ?? 0;
        const req = ROSTER_REQUIREMENTS.find(
          (r) => r.position === pos && r.slot === 'starter',
        );
        if (req && current < req.count) {
          positionCounts.set(key, current + 1);
        } else {
          benchCount++;
        }
      }
    }
  }

  for (const req of ROSTER_REQUIREMENTS) {
    const key = (req.slot === 'rotation' || req.slot === 'bullpen')
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
 * Pick from the top K candidates with probability weighted by valuation.
 *
 * The #1 valued player is most likely to be selected, but #2 and #3 also
 * have a chance proportional to their value. This introduces meaningful
 * variation across different RNG seeds while still favoring better players.
 */
function pickFromTop(
  sorted: DraftablePlayer[],
  rng: SeededRNG,
  k: number = TOP_CANDIDATE_COUNT,
): DraftablePlayer {
  if (sorted.length <= 1) return sorted[0];
  const topK = sorted.slice(0, Math.min(k, sorted.length));
  const values = topK.map((p) => Math.max(getPlayerValue(p), 0.01));
  const total = values.reduce((s, v) => s + v, 0);
  let roll = rng.nextFloat() * total;
  for (let i = 0; i < topK.length; i++) {
    roll -= values[i];
    if (roll <= 0) return topK[i];
  }
  return topK[topK.length - 1];
}

/**
 * Find best available player matching any of the given positions.
 * Uses expanded position matching (OF -> LF/CF/RF, RP -> RP/CL).
 * Selects from top candidates with weighted random.
 */
function bestAtPositions(
  available: DraftablePlayer[],
  positions: Position[],
  rng: SeededRNG,
): DraftablePlayer | null {
  const expanded = expandPositions(positions);
  const candidates = available.filter((p) => {
    const pos = getPlayerPosition(p);
    return expanded.includes(pos as Position);
  });
  if (candidates.length === 0) return null;
  const sorted = sortByValue(candidates, rng);
  return pickFromTop(sorted, rng);
}

/**
 * Select the AI's draft pick for a given round.
 *
 * @param round - Current draft round (1-based)
 * @param roster - Current team roster (picks made so far)
 * @param pool - All available players
 * @param rng - Seeded RNG for weighted random selection
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
  // Hard guard: When remaining picks <= mandatory needs, MUST fill a
  // mandatory position. Prevents AI from wasting late picks on bench when
  // starters/rotation/bullpen are still incomplete.
  // -----------------------------------------------------------------------
  const totalRosterSize = 21;
  const remainingPicks = totalRosterSize - roster.length;
  const mandatoryNeeds = needs.filter((n) => n.slot !== 'bench');
  if (remainingPicks <= mandatoryNeeds.length && mandatoryNeeds.length > 0) {
    const mandatoryPositions = mandatoryNeeds.map((n) => n.position);
    const forced = bestAtPositions(available, mandatoryPositions, rng);
    if (forced) return forced;
  }

  // -----------------------------------------------------------------------
  // Early rounds (1-3): Best SP or elite position player, no CL/RP
  // -----------------------------------------------------------------------
  if (round <= EARLY_ROUND_END) {
    const eligible = excludeFullPitching(
      sorted.filter((p) => {
        const pos = getPlayerPosition(p);
        return pos !== 'CL' && pos !== 'RP';
      }),
      needs,
    );
    return eligible.length > 0 ? pickFromTop(eligible, rng) : pickFromTop(sorted, rng);
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

    // Priority 2: Premium position gaps (C, SS)
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

    // Fallback: best available (exclude capped pitching positions)
    const midFallback = excludeFullPitching(sorted, needs);
    return midFallback.length > 0 ? pickFromTop(midFallback, rng) : pickFromTop(sorted, rng);
  }

  // -----------------------------------------------------------------------
  // Late rounds (9+): Bullpen, bench, defensive specialists
  // -----------------------------------------------------------------------

  // Priority 1: Bullpen (RP and CL both qualify) if needed
  const bullpenNeeds = needs.filter((n) => n.position === 'RP');
  if (bullpenNeeds.length > 0) {
    const rp = bestAtPositions(available, ['RP'], rng);
    if (rp) return rp;
  }

  // Priority 2: Any remaining starter positions
  const starterNeeds = needs.filter((n) => n.slot === 'starter');
  if (starterNeeds.length > 0) {
    const positions = starterNeeds.map((n) => n.position);
    const starter = bestAtPositions(available, positions, rng);
    if (starter) return starter;
  }

  // Priority 3: SP if still needed
  const spNeeds = needs.filter((n) => n.position === 'SP');
  if (spNeeds.length > 0) {
    const sp = bestAtPositions(available, ['SP'], rng);
    if (sp) return sp;
  }

  // Fallback: best available (fills bench, exclude capped pitching positions)
  const lateFallback = excludeFullPitching(sorted, needs);
  return lateFallback.length > 0 ? pickFromTop(lateFallback, rng) : pickFromTop(sorted, rng);
}
