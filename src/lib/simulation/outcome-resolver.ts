/**
 * Outcome Resolver Module
 *
 * REQ-SIM-005: Maps OutcomeCategory to concrete game state changes.
 * REQ-SIM-007: Runner advancement priorities (3B first, then 2B, then 1B, then batter).
 *
 * This module translates "what happened" (OutcomeCategory) into "how the game
 * state changes" (runner movements, outs, runs scored). Speed checks
 * (REQ-SIM-006) will be added in the Baserunner Engine (Task 9) as an overlay.
 * For now, speed-dependent outcomes use conservative defaults.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { BaseState } from '../types/game';
import { OutcomeCategory } from '../types/game';

/**
 * Result of resolving an outcome against the current base/out state.
 */
export interface OutcomeResolution {
  basesAfter: BaseState;
  outsAdded: number;
  runsScored: number;
  batterReachedBase: boolean;
  batterDestination: 'out' | '1B' | '2B' | '3B' | 'scored';
  isNoPA: boolean;
  sacrificeFly: boolean;
  rbiCredits: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Advance all runners by a given number of bases.
 * Runners that pass home plate score.
 * Resolves in priority order: 3B first, then 2B, then 1B (REQ-SIM-007).
 */
export function advanceAllRunners(
  bases: BaseState,
  numBases: number,
): { basesAfter: BaseState; runsScored: number } {
  let runs = 0;
  // Represent bases as array: index 0=1B, 1=2B, 2=3B
  const runners: (string | null)[] = [bases.first, bases.second, bases.third];
  const newRunners: (string | null)[] = [null, null, null];

  // Process in reverse order (3B first, then 2B, then 1B) per REQ-SIM-007
  for (let i = 2; i >= 0; i--) {
    if (runners[i] !== null) {
      const newPos = i + numBases;
      if (newPos >= 3) {
        runs++;
      } else {
        newRunners[newPos] = runners[i];
      }
    }
  }

  return {
    basesAfter: { first: newRunners[0], second: newRunners[1], third: newRunners[2] },
    runsScored: runs,
  };
}

/**
 * Force advancement for walk/HBP: runners advance only if forced by
 * the chain of occupied bases behind them.
 *
 * Walk logic: batter goes to 1B. If 1B occupied, that runner goes to 2B.
 * If 2B also occupied (AND was forced), that runner goes to 3B. Etc.
 */
export function forceAdvance(
  bases: BaseState,
  batterId: string,
): { basesAfter: BaseState; runsScored: number } {
  let runs = 0;
  const first: string | null = batterId;
  let second: string | null = bases.second;
  let third: string | null = bases.third;

  // Is 1B occupied? If so, runner forced to 2B.
  if (bases.first !== null) {
    const forcedFrom1B = bases.first;
    // Is 2B occupied AND being forced? 2B is forced only if 1B was occupied.
    if (bases.second !== null) {
      const forcedFrom2B = bases.second;
      // Is 3B occupied AND being forced? 3B is forced only if 1B+2B were occupied.
      if (bases.third !== null) {
        // 3B runner forced home
        runs++;
      }
      third = forcedFrom2B;
    }
    second = forcedFrom1B;
  }

  return {
    basesAfter: { first, second, third },
    runsScored: runs,
  };
}

/**
 * Remove the lead runner (runner closest to home plate).
 * Used for fielder's choice.
 */
export function removeLeadRunner(bases: BaseState): BaseState {
  if (bases.third !== null) {
    return { first: bases.first, second: bases.second, third: null };
  }
  if (bases.second !== null) {
    return { first: bases.first, second: null, third: bases.third };
  }
  if (bases.first !== null) {
    return { first: null, second: bases.second, third: bases.third };
  }
  return { first: null, second: null, third: null };
}

/**
 * Check if any runner is on base.
 */
function hasRunners(bases: BaseState): boolean {
  return bases.first !== null || bases.second !== null || bases.third !== null;
}

/**
 * Count runners on base.
 */
function countRunners(bases: BaseState): number {
  let count = 0;
  if (bases.first !== null) count++;
  if (bases.second !== null) count++;
  if (bases.third !== null) count++;
  return count;
}

// ---------------------------------------------------------------------------
// Default (no-change) resolution
// ---------------------------------------------------------------------------

function noChange(bases: BaseState): OutcomeResolution {
  return {
    basesAfter: { ...bases },
    outsAdded: 0,
    runsScored: 0,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: true,
    sacrificeFly: false,
    rbiCredits: 0,
  };
}

// ---------------------------------------------------------------------------
// Hit resolution helpers
// ---------------------------------------------------------------------------

function resolveSingleClean(bases: BaseState, batterId: string): OutcomeResolution {
  let runs = 0;
  const newFirst: string | null = batterId;
  let newSecond: string | null = null;
  const newThird: string | null = null;

  // REQ-SIM-007: resolve 3B first, then 2B, then 1B
  if (bases.third !== null) { runs++; }
  if (bases.second !== null) { runs++; }
  if (bases.first !== null) { newSecond = bases.first; }

  return {
    basesAfter: { first: newFirst, second: newSecond, third: newThird },
    outsAdded: 0,
    runsScored: runs,
    batterReachedBase: true,
    batterDestination: '1B',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: runs,
  };
}

function resolveDouble(bases: BaseState, batterId: string): OutcomeResolution {
  let runs = 0;

  // 3B scores
  if (bases.third !== null) { runs++; }
  // 2B scores (advances 2 bases = home)
  if (bases.second !== null) { runs++; }
  // 1B -> 3B (conservative; speed check would allow scoring)
  let newThird: string | null = null;
  if (bases.first !== null) { newThird = bases.first; }

  return {
    basesAfter: { first: null, second: batterId, third: newThird },
    outsAdded: 0,
    runsScored: runs,
    batterReachedBase: true,
    batterDestination: '2B',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: runs,
  };
}

function resolveTriple(bases: BaseState, batterId: string): OutcomeResolution {
  let runs = 0;
  if (bases.third !== null) runs++;
  if (bases.second !== null) runs++;
  if (bases.first !== null) runs++;

  return {
    basesAfter: { first: null, second: null, third: batterId },
    outsAdded: 0,
    runsScored: runs,
    batterReachedBase: true,
    batterDestination: '3B',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: runs,
  };
}

function resolveHomeRun(bases: BaseState): OutcomeResolution {
  const runnersOnBase = countRunners(bases);
  const totalRuns = runnersOnBase + 1; // all runners + batter

  return {
    basesAfter: { first: null, second: null, third: null },
    outsAdded: 0,
    runsScored: totalRuns,
    batterReachedBase: true,
    batterDestination: 'scored',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: totalRuns,
  };
}

// ---------------------------------------------------------------------------
// Walk/HBP
// ---------------------------------------------------------------------------

function resolveWalk(bases: BaseState, batterId: string): OutcomeResolution {
  const result = forceAdvance(bases, batterId);

  return {
    basesAfter: result.basesAfter,
    outsAdded: 0,
    runsScored: result.runsScored,
    batterReachedBase: true,
    batterDestination: '1B',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: result.runsScored,
  };
}

// ---------------------------------------------------------------------------
// Out resolution helpers
// ---------------------------------------------------------------------------

function resolveGroundOut(bases: BaseState, outs: number): OutcomeResolution {
  let runs = 0;
  const newBases: BaseState = { ...bases };

  // Runner on 3B scores if <2 outs (the out is the batter, so total outs after = outs+1)
  if (bases.third !== null && outs < 2) {
    runs++;
    newBases.third = null;
  }

  return {
    basesAfter: newBases,
    outsAdded: 1,
    runsScored: runs,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: runs,
  };
}

function resolveGroundOutAdvance(bases: BaseState): OutcomeResolution {
  const adv = advanceAllRunners(bases, 1);

  return {
    basesAfter: adv.basesAfter,
    outsAdded: 1,
    runsScored: adv.runsScored,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: adv.runsScored,
  };
}

function resolveFlyOut(bases: BaseState, outs: number): OutcomeResolution {
  let runs = 0;
  let sacFly = false;
  const newBases: BaseState = { ...bases };

  // Sac fly: runner on 3B scores if <2 outs
  if (bases.third !== null && outs < 2) {
    runs++;
    sacFly = true;
    newBases.third = null;
  }

  return {
    basesAfter: newBases,
    outsAdded: 1,
    runsScored: runs,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: false,
    sacrificeFly: sacFly,
    rbiCredits: runs,
  };
}

function resolveSimpleOut(bases: BaseState): OutcomeResolution {
  return {
    basesAfter: { ...bases },
    outsAdded: 1,
    runsScored: 0,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: 0,
  };
}

// ---------------------------------------------------------------------------
// Double Play
// ---------------------------------------------------------------------------

function resolveDoublePlay(bases: BaseState, outs: number): OutcomeResolution {
  // DP requires runner on base AND <2 outs; otherwise degrades to ground out
  if (!hasRunners(bases) || outs >= 2) {
    return resolveGroundOut(bases, outs);
  }

  // Ground DP: lead runner + batter are out
  const afterRemoval = removeLeadRunner(bases);

  // Remaining runners advance 1 base
  const adv = advanceAllRunners(afterRemoval, 1);

  return {
    basesAfter: adv.basesAfter,
    outsAdded: 2,
    runsScored: adv.runsScored,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: 0, // No RBI on DP
  };
}

function resolveDoublePlayLine(bases: BaseState, outs: number): OutcomeResolution {
  // Line DP requires runner on base AND <2 outs; otherwise degrades to line out
  if (!hasRunners(bases) || outs >= 2) {
    return resolveSimpleOut(bases);
  }

  // Line DP: batter out + runner nearest to home out
  // "Runner nearest to home" = same as lead runner
  const afterRemoval = removeLeadRunner(bases);

  return {
    basesAfter: afterRemoval,
    outsAdded: 2,
    runsScored: 0,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: 0,
  };
}

// ---------------------------------------------------------------------------
// Special Plays
// ---------------------------------------------------------------------------

function resolveSacrifice(bases: BaseState): OutcomeResolution {
  const adv = advanceAllRunners(bases, 1);

  return {
    basesAfter: adv.basesAfter,
    outsAdded: 1,
    runsScored: adv.runsScored,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: adv.runsScored,
  };
}

function resolveReachedOnError(bases: BaseState, batterId: string): OutcomeResolution {
  const adv = advanceAllRunners(bases, 1);

  return {
    basesAfter: { first: batterId, second: adv.basesAfter.second, third: adv.basesAfter.third },
    outsAdded: 0,
    runsScored: adv.runsScored,
    batterReachedBase: true,
    batterDestination: '1B',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: 0, // No RBI on error
  };
}

function resolveFieldersChoice(bases: BaseState, batterId: string): OutcomeResolution {
  // Lead runner is out, batter reaches 1B
  // If no runners, degrades to ground out
  if (!hasRunners(bases)) {
    return {
      basesAfter: { first: null, second: null, third: null },
      outsAdded: 1,
      runsScored: 0,
      batterReachedBase: false,
      batterDestination: 'out',
      isNoPA: false,
      sacrificeFly: false,
      rbiCredits: 0,
    };
  }

  const afterRemoval = removeLeadRunner(bases);

  return {
    basesAfter: { first: batterId, second: afterRemoval.second, third: afterRemoval.third },
    outsAdded: 1,
    runsScored: 0,
    batterReachedBase: true,
    batterDestination: '1B',
    isNoPA: false,
    sacrificeFly: false,
    rbiCredits: 0,
  };
}

// ---------------------------------------------------------------------------
// No-PA Events
// ---------------------------------------------------------------------------

function resolveWildPitchOrBalk(bases: BaseState): OutcomeResolution {
  const adv = advanceAllRunners(bases, 1);

  return {
    basesAfter: adv.basesAfter,
    outsAdded: 0,
    runsScored: adv.runsScored,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: true,
    sacrificeFly: false,
    rbiCredits: 0,
  };
}

function resolvePassedBall(bases: BaseState): OutcomeResolution {
  // Runner on 3B scores; others advance 1 base
  // This is the same as advanceAllRunners by 1
  const adv = advanceAllRunners(bases, 1);

  return {
    basesAfter: adv.basesAfter,
    outsAdded: 0,
    runsScored: adv.runsScored,
    batterReachedBase: false,
    batterDestination: 'out',
    isNoPA: true,
    sacrificeFly: false,
    rbiCredits: 0,
  };
}

// ---------------------------------------------------------------------------
// Main Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve an OutcomeCategory against the current base/out state.
 *
 * Returns the resulting game state changes: new bases, outs added,
 * runs scored, and metadata about the play.
 *
 * @param outcome - The outcome category from plate appearance resolution
 * @param bases - Current base occupants
 * @param outs - Current out count (0, 1, or 2)
 * @param batterId - The batter's player ID
 */
export function resolveOutcome(
  outcome: OutcomeCategory,
  bases: BaseState,
  outs: number,
  batterId: string,
): OutcomeResolution {
  switch (outcome) {
    // Hits
    case OutcomeCategory.SINGLE_CLEAN:
    case OutcomeCategory.SINGLE_ADVANCE:
      // SINGLE_ADVANCE is identical to SINGLE_CLEAN in conservative mode.
      // Task 9 (Baserunner Engine) will add speed check for extra-base taking.
      return resolveSingleClean(bases, batterId);

    case OutcomeCategory.DOUBLE:
      return resolveDouble(bases, batterId);

    case OutcomeCategory.TRIPLE:
      return resolveTriple(bases, batterId);

    case OutcomeCategory.HOME_RUN:
    case OutcomeCategory.HOME_RUN_VARIANT:
      return resolveHomeRun(bases);

    // Outs
    case OutcomeCategory.GROUND_OUT:
      return resolveGroundOut(bases, outs);

    case OutcomeCategory.FLY_OUT:
      return resolveFlyOut(bases, outs);

    case OutcomeCategory.POP_OUT:
    case OutcomeCategory.LINE_OUT:
    case OutcomeCategory.STRIKEOUT_LOOKING:
    case OutcomeCategory.STRIKEOUT_SWINGING:
      return resolveSimpleOut(bases);

    case OutcomeCategory.GROUND_OUT_ADVANCE:
      return resolveGroundOutAdvance(bases);

    // Walk / HBP
    case OutcomeCategory.WALK:
    case OutcomeCategory.WALK_INTENTIONAL:
    case OutcomeCategory.HIT_BY_PITCH:
      return resolveWalk(bases, batterId);

    // Special plays
    case OutcomeCategory.SACRIFICE:
      return resolveSacrifice(bases);

    case OutcomeCategory.DOUBLE_PLAY:
      return resolveDoublePlay(bases, outs);

    case OutcomeCategory.DOUBLE_PLAY_LINE:
      return resolveDoublePlayLine(bases, outs);

    case OutcomeCategory.REACHED_ON_ERROR:
      return resolveReachedOnError(bases, batterId);

    case OutcomeCategory.FIELDERS_CHOICE:
      return resolveFieldersChoice(bases, batterId);

    // No-PA events
    case OutcomeCategory.STOLEN_BASE_OPP:
      return noChange(bases);

    case OutcomeCategory.WILD_PITCH:
    case OutcomeCategory.BALK:
      return resolveWildPitchOrBalk(bases);

    case OutcomeCategory.PASSED_BALL:
      return resolvePassedBall(bases);

    case OutcomeCategory.SPECIAL_EVENT:
      return noChange(bases);

    default:
      return noChange(bases);
  }
}
