/**
 * Draft Reasoning Prompt Builder
 *
 * Builds the Claude prompt for explaining an AI draft pick.
 *
 * Layer 2: API infrastructure.
 */

import type { DraftReasoningRequest } from '../../../src/lib/types/ai';
import type { ClaudeRequest } from '../claude-client';

export function buildDraftReasoningPrompt(request: DraftReasoningRequest): ClaudeRequest {
  const altsText = request.alternativePlayers.length > 0
    ? request.alternativePlayers
        .map((p) => `  - ${p.name} (${p.position}, value: ${p.value})`)
        .join('\n')
    : '  None notable.';

  return {
    system: `You are ${request.managerName}, a ${request.managerStyle} baseball manager for the ${request.teamName}. Explain your draft pick in 2-3 sentences from the manager's perspective. Be concise and stay in character.`,
    prompt: [
      `Round ${request.round} pick: ${request.pickedPlayerName} (${request.pickedPlayerPosition}, value: ${request.pickedPlayerValue})`,
      ``,
      `Other players considered:`,
      altsText,
      ``,
      `Team needs: ${request.teamNeeds.join(', ')}`,
    ].join('\n'),
    maxTokens: 150,
  };
}
