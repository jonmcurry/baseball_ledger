/**
 * Draft Engine
 *
 * REQ-DFT-001: 21-round snake draft orchestration.
 * REQ-DFT-002: Randomized order, reverses each round.
 * REQ-DFT-008: Post-draft roster composition validation.
 *
 * State machine composing draft-order, ai-strategy, and roster-validator
 * into a complete draft orchestrator. Manages turn order, player pool,
 * team rosters, and draft completion.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import type { DraftablePlayer } from './ai-strategy';
import type { RosterValidationResult } from './roster-validator';
import {
  TOTAL_ROUNDS,
  generateDraftOrder,
  getPickingTeam,
  getNextPick,
} from './draft-order';
import { validateRoster, autoFillRoster } from './roster-validator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single completed draft pick. */
export interface DraftEnginePick {
  readonly round: number;
  readonly pick: number;
  readonly teamId: string;
  readonly player: DraftablePlayer;
}

/** Configuration to initialize a new draft. */
export interface DraftEngineConfig {
  readonly teamIds: string[];
  readonly playerPool: DraftablePlayer[];
  readonly totalRounds?: number;
}

/** Mutable draft state managed by the engine. */
export interface DraftEngineState {
  status: 'not_started' | 'in_progress' | 'completed';
  draftOrder: string[];
  currentRound: number;
  currentPick: number;
  totalRounds: number;
  picks: DraftEnginePick[];
  playerPool: DraftablePlayer[];
  draftedPlayerIds: Set<string>;
  teamRosters: Map<string, DraftablePlayer[]>;
}

/** Result of post-draft completion per team. */
export interface DraftCompletionResult {
  roster: DraftablePlayer[];
  validation: RosterValidationResult;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Initialize a new draft.
 *
 * Generates a randomized draft order using Fisher-Yates shuffle,
 * sets up empty team rosters, and prepares the full player pool.
 */
export function initializeDraft(
  config: DraftEngineConfig,
  rng: SeededRNG,
): DraftEngineState {
  const draftOrder = generateDraftOrder(config.teamIds, rng);
  const teamRosters = new Map<string, DraftablePlayer[]>();
  for (const teamId of config.teamIds) {
    teamRosters.set(teamId, []);
  }

  return {
    status: 'in_progress',
    draftOrder,
    currentRound: 1,
    currentPick: 1,
    totalRounds: config.totalRounds ?? TOTAL_ROUNDS,
    picks: [],
    playerPool: config.playerPool,
    draftedPlayerIds: new Set(),
    teamRosters,
  };
}

/**
 * Get the team that should pick at the current position.
 *
 * Delegates to draft-order's getPickingTeam for snake-draft logic.
 */
export function getCurrentPickingTeam(state: DraftEngineState): string {
  return getPickingTeam(state.currentRound, state.currentPick, state.draftOrder);
}

/**
 * Get all players still available in the pool (not yet drafted).
 */
export function getAvailablePool(state: DraftEngineState): DraftablePlayer[] {
  return state.playerPool.filter(
    (p) => !state.draftedPlayerIds.has(p.card.playerId),
  );
}

/**
 * Submit a draft pick.
 *
 * Validates the pick (correct team, player available), records it,
 * adds the player to the team's roster, and advances to the next pick.
 * Marks the draft as completed if this was the final pick.
 *
 * @throws Error if it is not the team's turn
 * @throws Error if the player has already been drafted
 * @throws Error if the draft is already completed
 */
export function submitDraftPick(
  state: DraftEngineState,
  teamId: string,
  player: DraftablePlayer,
): DraftEnginePick {
  if (state.status === 'completed') {
    throw new Error('Draft is already complete. No more picks allowed.');
  }

  const expectedTeam = getCurrentPickingTeam(state);
  if (teamId !== expectedTeam) {
    throw new Error(
      `It is not ${teamId}'s turn to pick. Expected: ${expectedTeam}`,
    );
  }

  if (state.draftedPlayerIds.has(player.card.playerId)) {
    throw new Error(
      `Player ${player.card.playerId} has already been drafted.`,
    );
  }

  // Record the pick
  const pick: DraftEnginePick = {
    round: state.currentRound,
    pick: state.currentPick,
    teamId,
    player,
  };
  state.picks.push(pick);

  // Add to team roster and mark as drafted
  state.teamRosters.get(teamId)!.push(player);
  state.draftedPlayerIds.add(player.card.playerId);

  // Advance to next pick or mark complete
  const next = getNextPick(
    state.currentRound,
    state.currentPick,
    state.totalRounds,
    state.draftOrder.length,
  );

  if (next === null) {
    state.status = 'completed';
  } else {
    state.currentRound = next.round;
    state.currentPick = next.pick;
  }

  return pick;
}

/**
 * Check if the draft is complete.
 */
export function isDraftComplete(state: DraftEngineState): boolean {
  return state.status === 'completed';
}

/**
 * Complete the draft by validating and auto-filling each team's roster.
 *
 * Per REQ-DFT-008: After the draft, validate roster composition and
 * auto-fill any gaps from the remaining player pool.
 *
 * @throws Error if the draft is not yet completed
 * @returns Map of teamId -> { roster, validation }
 */
export function completeDraft(
  state: DraftEngineState,
): Map<string, DraftCompletionResult> {
  if (state.status !== 'completed') {
    throw new Error('Draft is not complete. Cannot finalize rosters.');
  }

  const remainingPool = getAvailablePool(state);
  const results = new Map<string, DraftCompletionResult>();

  for (const [teamId, roster] of state.teamRosters) {
    // Auto-fill any gaps from remaining pool
    const filledRoster = autoFillRoster(roster, remainingPool);

    // Mark auto-filled players as drafted so other teams cannot use them
    for (const player of filledRoster) {
      if (!state.draftedPlayerIds.has(player.card.playerId)) {
        state.draftedPlayerIds.add(player.card.playerId);
      }
    }

    const validation = validateRoster(filledRoster);

    results.set(teamId, {
      roster: filledRoster,
      validation,
    });
  }

  return results;
}
