/**
 * Game State Machine / Engine Module
 *
 * REQ-SIM-001: Game state machine (inning flow, half-inning transitions).
 * REQ-SIM-002: Game state object management.
 * REQ-SIM-015: Extra innings (play until winner determined).
 *
 * Provides state machine utility functions for managing game flow:
 * creating initial state, advancing half-innings, checking game
 * completion, identifying batting/fielding teams, and cycling
 * through the batting order.
 *
 * The full simulate() function orchestrates all simulation modules
 * (plate-appearance, outcome-resolver, baserunner, defense, pitching)
 * into a complete game. That integration is built on these primitives.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { GameState, TeamState } from '../types/game';

/** Number of slots in a batting order */
const LINEUP_SIZE = 9;

/** Minimum innings before game can end */
const REGULATION_INNINGS = 9;

/**
 * Configuration for initializing a new game.
 */
export interface GameConfig {
  gameId: string;
  homeTeam: TeamState;
  awayTeam: TeamState;
  seed: number;
}

/**
 * Create the initial game state from a game configuration.
 *
 * Per REQ-SIM-002: initializes all game state fields to starting values.
 */
export function createInitialGameState(config: GameConfig): GameState {
  return {
    homeTeam: config.homeTeam,
    awayTeam: config.awayTeam,
    inning: 1,
    halfInning: 'top',
    outs: 0,
    bases: { first: null, second: null, third: null },
    homeScore: 0,
    awayScore: 0,
    isComplete: false,
    playByPlay: [],
    currentBatterIndex: 0,
    pitcherFatigue: 0,
    baseSituation: 0,
    consecutiveHitsWalks: 0,
  };
}

/**
 * Advance to the next half-inning.
 *
 * Per REQ-SIM-001:
 * - Top -> Bottom of same inning
 * - Bottom -> Top of next inning
 * - Resets outs, bases, and consecutive hit/walk counter
 *
 * Returns a new state object (does not mutate input).
 */
export function advanceHalfInning(state: GameState): GameState {
  if (state.halfInning === 'top') {
    return {
      ...state,
      halfInning: 'bottom',
      outs: 0,
      bases: { first: null, second: null, third: null },
      consecutiveHitsWalks: 0,
    };
  }

  return {
    ...state,
    inning: state.inning + 1,
    halfInning: 'top',
    outs: 0,
    bases: { first: null, second: null, third: null },
    consecutiveHitsWalks: 0,
  };
}

/**
 * Check whether the game is over.
 *
 * Per REQ-SIM-001 and REQ-SIM-015:
 * - Game ends after bottom of 9th+ if scores differ (3 outs recorded)
 * - Game ends mid-inning in bottom half if home team takes the lead (walk-off)
 * - Game continues if tied after any complete inning (extra innings)
 * - Game never ends during the top half
 */
export function isGameOver(state: GameState): boolean {
  // Walk-off: home team leads during bottom of 9th or later
  if (
    state.halfInning === 'bottom' &&
    state.inning >= REGULATION_INNINGS &&
    state.homeScore > state.awayScore
  ) {
    return true;
  }

  // Regular end: bottom of 9th+ complete (3 outs) with a leader
  if (
    state.halfInning === 'bottom' &&
    state.outs >= 3 &&
    state.inning >= REGULATION_INNINGS &&
    state.homeScore !== state.awayScore
  ) {
    return true;
  }

  return false;
}

/**
 * Check whether to skip the bottom half of the inning.
 *
 * Per REQ-SIM-001: Home team doesn't bat in bottom of 9th+
 * if already winning after the top half.
 */
export function shouldSkipBottomHalf(
  inning: number,
  homeScore: number,
  awayScore: number,
): boolean {
  return inning >= REGULATION_INNINGS && homeScore > awayScore;
}

/**
 * Get the currently batting team.
 *
 * Per REQ-SIM-001: Away team bats in top half, home team in bottom.
 */
export function getBattingTeam(state: GameState): TeamState {
  return state.halfInning === 'top' ? state.awayTeam : state.homeTeam;
}

/**
 * Get the currently fielding team.
 */
export function getFieldingTeam(state: GameState): TeamState {
  return state.halfInning === 'top' ? state.homeTeam : state.awayTeam;
}

/**
 * Advance to the next batter in the lineup.
 *
 * Per REQ-SIM-002: 9-slot batting order cycles 0-8, then back to 0.
 */
export function advanceBatterIndex(current: number): number {
  return (current + 1) % LINEUP_SIZE;
}
