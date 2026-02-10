/**
 * AI Drafter
 *
 * REQ-DFT-006: CPU-controlled team drafting with round-aware strategy.
 * REQ-DFT-007: AI player valuation for ranking picks.
 * REQ-AI-008: Round-aware draft pick reasoning.
 *
 * Composes ai-strategy (pick selection) + template-draft-reasoning
 * (narrative generation) to produce complete AI draft picks with
 * explanations for each selection.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import type { ManagerStyle } from '../simulation/manager-profiles';
import type { DraftReasoningResponse } from '../types/ai';
import type { DraftablePlayer } from './ai-strategy';
import { selectAIPick, getRosterNeeds } from './ai-strategy';
import { calculatePlayerValue } from './ai-valuation';
import { generateDraftReasoningTemplate } from '../ai/template-draft-reasoning';
import {
  getCurrentPickingTeam,
  getAvailablePool,
  submitDraftPick,
  isDraftComplete,
  type DraftEngineState,
  type DraftEnginePick,
} from './draft-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for an AI-controlled team. */
export interface AITeamConfig {
  readonly teamId: string;
  readonly teamName: string;
  readonly managerName: string;
  readonly managerStyle: ManagerStyle;
}

/** Result of a single AI draft pick. */
export interface AIDraftPickResult {
  readonly pick: DraftEnginePick;
  readonly reasoning: DraftReasoningResponse;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Make a single AI draft pick for the current picking team.
 *
 * Uses selectAIPick for player selection, then generates template-based
 * reasoning explaining the pick. The pick is submitted to the engine state.
 *
 * @param state - Current draft engine state (mutated by pick submission)
 * @param teamConfig - AI team configuration (name, manager style)
 * @param rng - Seeded RNG for deterministic pick selection
 * @returns The pick result with reasoning
 */
export function makeAIPick(
  state: DraftEngineState,
  teamConfig: AITeamConfig,
  rng: SeededRNG,
): AIDraftPickResult {
  const teamId = getCurrentPickingTeam(state);
  const roster = state.teamRosters.get(teamId) ?? [];
  const availablePool = getAvailablePool(state);

  // Select the best pick using AI strategy
  const selectedPlayer = selectAIPick(
    state.currentRound,
    roster,
    availablePool,
    rng,
  );

  // Build context for reasoning generation
  const needs = getRosterNeeds(roster);
  const needPositions = needs.map((n) => n.position);
  const pickedValue = calculatePlayerValue(selectedPlayer.card, {
    ops: selectedPlayer.ops,
    sb: selectedPlayer.sb,
  });

  // Get top alternative players for reasoning comparison
  const alternatives = getTopAlternatives(availablePool, selectedPlayer, 3);

  // Generate template-based reasoning
  const reasoning = generateDraftReasoningTemplate({
    round: state.currentRound,
    managerStyle: teamConfig.managerStyle,
    managerName: teamConfig.managerName,
    teamName: teamConfig.teamName,
    pickedPlayerName: `${selectedPlayer.card.nameFirst} ${selectedPlayer.card.nameLast}`,
    pickedPlayerPosition: selectedPlayer.card.primaryPosition,
    pickedPlayerValue: pickedValue,
    alternativePlayers: alternatives,
    teamNeeds: needPositions,
  });

  // Submit the pick to the engine
  const pick = submitDraftPick(state, teamId, selectedPlayer);

  return { pick, reasoning };
}

/**
 * Run a full AI draft, making picks for all AI-controlled teams.
 *
 * Iterates through the draft, making picks for teams that have an
 * AITeamConfig entry. Skips teams not in the aiTeams map (human teams).
 *
 * @param state - Draft engine state (mutated throughout)
 * @param aiTeams - Map of teamId -> AITeamConfig for AI-controlled teams
 * @param rng - Seeded RNG for deterministic picks
 * @returns Array of all AI pick results with reasoning
 */
export function runFullAIDraft(
  state: DraftEngineState,
  aiTeams: Map<string, AITeamConfig>,
  rng: SeededRNG,
): AIDraftPickResult[] {
  const results: AIDraftPickResult[] = [];

  while (!isDraftComplete(state)) {
    const currentTeam = getCurrentPickingTeam(state);
    const teamConfig = aiTeams.get(currentTeam);

    if (!teamConfig) {
      // Human team -- skip (they must submit picks through the API)
      break;
    }

    const result = makeAIPick(state, teamConfig, rng);
    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the top N alternative players by value, excluding the picked player.
 */
function getTopAlternatives(
  pool: DraftablePlayer[],
  picked: DraftablePlayer,
  count: number,
): Array<{ name: string; position: string; value: number }> {
  return pool
    .filter((p) => p.card.playerId !== picked.card.playerId)
    .map((p) => ({
      name: `${p.card.nameFirst} ${p.card.nameLast}`,
      position: p.card.primaryPosition,
      value: calculatePlayerValue(p.card, { ops: p.ops, sb: p.sb }),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}
