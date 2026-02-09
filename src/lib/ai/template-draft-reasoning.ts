/**
 * Template Draft Reasoning
 *
 * Generates round-aware draft pick reasoning using templates (REQ-AI-008).
 * Matches the ai-strategy.ts round tiers: early (1-3), mid (4-8), late (9+).
 *
 * Layer 1: Pure logic, no I/O, no side effects.
 */

import type { DraftReasoningRequest, DraftReasoningResponse } from '../types/ai';

type RoundTier = 'early' | 'mid' | 'late';

function getRoundTier(round: number): RoundTier {
  if (round <= 3) return 'early';
  if (round <= 8) return 'mid';
  return 'late';
}

/**
 * Build reasoning text for the draft pick.
 */
function buildReasoning(request: DraftReasoningRequest): string {
  const {
    round,
    managerName,
    managerStyle,
    teamName,
    pickedPlayerName,
    pickedPlayerPosition,
    pickedPlayerValue,
    alternativePlayers,
    teamNeeds,
  } = request;

  const tier = getRoundTier(round);
  const parts: string[] = [];
  const fillsNeed = teamNeeds.includes(pickedPlayerPosition);

  // Opening: round context
  if (tier === 'early') {
    parts.push(
      `With the round ${round} pick, ${managerName} and the ${teamName} select ${pickedPlayerName} (${pickedPlayerPosition}).`,
    );
    parts.push('In the early rounds, the focus is on securing elite talent.');
  } else if (tier === 'mid') {
    parts.push(
      `In round ${round}, the ${teamName} take ${pickedPlayerName} (${pickedPlayerPosition}).`,
    );
    parts.push('The mid-round strategy shifts to filling rotation and premium positions.');
  } else {
    parts.push(
      `Round ${round}: the ${teamName} select ${pickedPlayerName} (${pickedPlayerPosition}).`,
    );
    parts.push('Late-round picks target relievers, bench depth, and defensive specialists.');
  }

  // Positional need
  if (fillsNeed) {
    parts.push(
      `This pick addresses a team need at ${pickedPlayerPosition}.`,
    );
  } else {
    parts.push(
      `While ${pickedPlayerPosition} was not the top need, the value was too good to pass up.`,
    );
  }

  // Value comparison
  if (alternativePlayers.length > 0) {
    const topAlt = alternativePlayers[0];
    const valueDiff = pickedPlayerValue - topAlt.value;
    if (valueDiff > 0) {
      parts.push(
        `${pickedPlayerName} rated ${valueDiff.toFixed(1)} points above the next best option, ${topAlt.name}.`,
      );
    } else if (valueDiff < -2) {
      parts.push(
        `${topAlt.name} rated higher overall, but the positional fit of ${pickedPlayerName} won out.`,
      );
    }
  }

  // Manager personality flavor
  switch (managerStyle) {
    case 'conservative':
      parts.push('A safe, reliable choice in keeping with a traditional approach.');
      break;
    case 'aggressive':
      parts.push('A bold pick that could pay big dividends.');
      break;
    case 'balanced':
      parts.push('A well-rounded selection that balances talent and team fit.');
      break;
    case 'analytical':
      parts.push('The numbers clearly favored this pick.');
      break;
  }

  return parts.join(' ');
}

/**
 * Generate template-based draft pick reasoning.
 */
export function generateDraftReasoningTemplate(
  request: DraftReasoningRequest,
): DraftReasoningResponse {
  return {
    reasoning: buildReasoning(request),
    source: 'template',
  };
}
