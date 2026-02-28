/**
 * AI Draft Strategy
 *
 * REQ-DFT-006: CPU-controlled teams draft using a round-aware priority
 * system. Early rounds favor elite players, mid rounds fill rotation and
 * premium positions, late rounds fill remaining starters and bullpen.
 *
 * Strategy: Unified need-weighted selection with progressive urgency and
 * manager style differentiation.
 *  - Each candidate's raw valuation is multiplied by a dynamic need multiplier:
 *    dynamicMult = baseMult + sqrt(categoryNeeds / remainingPicks) * urgencyScale * styleBias
 *  - The sqrt curve rises steeply at low fractions (earlier competitiveness) and
 *    flattens at high fractions (reduced late-round dominance), spreading picks
 *    more evenly instead of creating sharp tipping-point concentration peaks.
 *  - Manager style biases urgency scales: conservative managers prioritize rotation,
 *    aggressive managers prioritize bullpen, analytical managers use wider candidate pools.
 *  - Round 1 excludes RP/CL (too early for relievers).
 *  - Hard guard forces mandatory positions when remaining picks are tight.
 *  - Multi-position eligibility: players fill needs via any eligible position.
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
import type { ManagerStyle } from '../simulation/manager-profiles';
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
/** Number of top candidates to consider for weighted random selection. */
const TOP_CANDIDATE_COUNT = 4;

/** Base need multipliers: starting boost for each roster category. */
const BASE_MULT_STARTER = 1.20;
const BASE_MULT_ROTATION = 1.15;
const BASE_MULT_BULLPEN = 1.05;
const BASE_MULT_BENCH = 0.80;

/**
 * Urgency scales: how aggressively the multiplier ramps as unfilled needs
 * pile up relative to remaining picks.
 *
 * Formula: dynamicMult = baseMult + sqrt(categoryNeeds / remainingPicks) * urgencyScale
 *
 * The sqrt curve eliminates sharp tipping points that cause SP concentration
 * peaks. Scales are adjusted downward from linear equivalents because sqrt
 * provides earlier urgency rise.
 */
const URGENCY_SCALE_STARTER = 0.4;
const URGENCY_SCALE_ROTATION = 1.3;
const URGENCY_SCALE_BULLPEN = 1.8;

/**
 * Manager style bias for draft urgency.
 * Modifies the urgency scale multipliers to create team-to-team variation.
 * Conservative managers prioritize rotation; aggressive managers prioritize
 * bullpen; analytical managers use wider candidate pools.
 */
interface StyleDraftBias {
  rotationUrgency: number;
  bullpenUrgency: number;
  starterUrgency: number;
  topK: number;
}

const STYLE_DRAFT_BIAS: Record<ManagerStyle, StyleDraftBias> = {
  conservative: { rotationUrgency: 1.25, bullpenUrgency: 1.10, starterUrgency: 1.10, topK: 3 },
  aggressive:   { rotationUrgency: 0.85, bullpenUrgency: 1.35, starterUrgency: 0.90, topK: 4 },
  analytical:   { rotationUrgency: 1.00, bullpenUrgency: 1.00, starterUrgency: 1.00, topK: 5 },
  balanced:     { rotationUrgency: 1.00, bullpenUrgency: 1.00, starterUrgency: 1.00, topK: 4 },
};

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
    if (p.card.isPitcher && p.card.pitching) {
      return expanded.includes(p.card.pitching.role as Position);
    }
    // Check ALL eligible positions, not just primaryPosition
    return p.card.eligiblePositions.some(pos => expanded.includes(pos));
  });
  if (candidates.length === 0) return null;
  const sorted = sortByValue(candidates, rng);
  return pickFromTop(sorted, rng);
}

/**
 * Get the dynamic need multiplier for a player based on current roster needs
 * and how many picks remain.
 *
 * Formula: baseMult + sqrt(categoryNeeds / remainingPicks) * urgencyScale
 *
 * The sqrt curve rises steeply at low fractions (SP becomes competitive
 * earlier) and flattens at high fractions (less late-round dominance).
 * This eliminates the sharp linear tipping point that synchronized all
 * 30 teams into drafting SP at the same round.
 *
 * Position players check eligiblePositions (not just primaryPosition) so a
 * player who can play SS and 2B fills either need.
 */
function getNeedMultiplier(
  player: DraftablePlayer,
  needs: PositionNeed[],
  rosterSize: number,
  styleBias?: StyleDraftBias,
): number {
  const remainingPicks = Math.max(1, 21 - rosterSize);

  if (player.card.isPitcher && player.card.pitching) {
    const role = player.card.pitching.role;
    if (role === 'SP' && needs.some(n => n.position === 'SP')) {
      const rotationNeeds = needs.filter(n => n.slot === 'rotation').length;
      const fraction = rotationNeeds / remainingPicks;
      const urgencyScale = URGENCY_SCALE_ROTATION * (styleBias?.rotationUrgency ?? 1.0);
      return BASE_MULT_ROTATION + Math.sqrt(fraction) * urgencyScale;
    }
    if ((role === 'RP' || role === 'CL') && needs.some(n => n.position === 'RP')) {
      const bullpenNeeds = needs.filter(n => n.slot === 'bullpen').length;
      const fraction = bullpenNeeds / remainingPicks;
      const urgencyScale = URGENCY_SCALE_BULLPEN * (styleBias?.bullpenUrgency ?? 1.0);
      return BASE_MULT_BULLPEN + Math.sqrt(fraction) * urgencyScale;
    }
    return BASE_MULT_BENCH;
  }

  // Position player: check if ANY eligible position fills a starter need
  const starterNeeds = needs.filter(n => n.slot === 'starter');
  if (starterNeeds.length > 0) {
    const neededPositions = expandPositions(starterNeeds.map(n => n.position));
    const fillsNeed = player.card.eligiblePositions.some(
      pos => neededPositions.includes(pos),
    );
    if (fillsNeed) {
      const fraction = starterNeeds.length / remainingPicks;
      const urgencyScale = URGENCY_SCALE_STARTER * (styleBias?.starterUrgency ?? 1.0);
      return BASE_MULT_STARTER + Math.sqrt(fraction) * urgencyScale;
    }
  }

  return BASE_MULT_BENCH;
}

/**
 * Pick from the top K candidates weighted by pre-computed adjusted values.
 */
function pickFromTopAdjusted(
  adjusted: { player: DraftablePlayer; adjustedValue: number }[],
  rng: SeededRNG,
  k: number = TOP_CANDIDATE_COUNT,
): DraftablePlayer {
  if (adjusted.length <= 1) return adjusted[0].player;
  const topK = adjusted.slice(0, Math.min(k, adjusted.length));
  const values = topK.map(a => Math.max(a.adjustedValue, 0.01));
  const total = values.reduce((s, v) => s + v, 0);
  let roll = rng.nextFloat() * total;
  for (let i = 0; i < topK.length; i++) {
    roll -= values[i];
    if (roll <= 0) return topK[i].player;
  }
  return topK[topK.length - 1].player;
}

/**
 * Select the AI's draft pick for a given round.
 *
 * Uses a unified need-weighted approach with progressive urgency instead of
 * rigid round tiers. Each candidate's raw value is multiplied by a dynamic
 * need multiplier that increases as unfilled needs pile up, creating natural
 * interleaving of positions across rounds and desynchronizing teams.
 *
 * @param round - Current draft round (1-based)
 * @param roster - Current team roster (picks made so far)
 * @param pool - All available players
 * @param rng - Seeded RNG for weighted random selection
 * @param managerStyle - Optional manager style for urgency bias
 * @returns The selected player
 */
export function selectAIPick(
  round: number,
  roster: DraftablePlayer[],
  pool: DraftablePlayer[],
  rng: SeededRNG,
  managerStyle?: ManagerStyle,
): DraftablePlayer {
  const available = filterAvailable(pool, roster);
  const needs = getRosterNeeds(roster);

  if (available.length === 0) {
    return pool[0];
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
  // Exclude capped pitching positions (5th SP / 5th RP)
  // -----------------------------------------------------------------------
  const eligible = excludeFullPitching(available, needs);
  if (eligible.length === 0) {
    const sorted = sortByValue(available, rng);
    return pickFromTop(sorted, rng);
  }

  // -----------------------------------------------------------------------
  // Round 1: exclude RP/CL (too early for relievers)
  // -----------------------------------------------------------------------
  const candidates = round === 1
    ? eligible.filter(p => {
      const pos = getPlayerPosition(p);
      return pos !== 'CL' && pos !== 'RP';
    })
    : eligible;

  if (candidates.length === 0) {
    return pickFromTop(sortByValue(eligible, rng), rng);
  }

  // -----------------------------------------------------------------------
  // Unified need-weighted selection: value * needMultiplier
  // Manager style biases urgency scales and candidate pool size.
  // -----------------------------------------------------------------------
  const styleBias = managerStyle ? STYLE_DRAFT_BIAS[managerStyle] : undefined;
  const topK = styleBias?.topK ?? TOP_CANDIDATE_COUNT;

  const adjusted = candidates.map(p => ({
    player: p,
    adjustedValue: getPlayerValue(p) * getNeedMultiplier(p, needs, roster.length, styleBias),
  }));

  // Sort by adjusted value descending (RNG tiebreak for equal values)
  adjusted.sort((a, b) => {
    const diff = b.adjustedValue - a.adjustedValue;
    if (Math.abs(diff) < 0.01) return rng.nextFloat() - 0.5;
    return diff;
  });

  return pickFromTopAdjusted(adjusted, rng, topK);
}
