/**
 * Manager Explanation Prompt Builder
 *
 * Builds the Claude prompt for explaining an in-game manager decision.
 *
 * Layer 2: API infrastructure.
 */

import type { ManagerExplanationRequest } from '../../../src/lib/types/ai';
import type { ClaudeRequest } from '../claude-client';

const DECISION_LABELS: Record<string, string> = {
  steal: 'called for a stolen base attempt',
  bunt: 'called for a sacrifice bunt',
  intentional_walk: 'issued an intentional walk',
  pull_pitcher: 'pulled the pitcher for a reliever',
};

const STYLE_PERSONA: Record<string, string> = {
  conservative: 'traditional and cautious',
  aggressive: 'bold and risk-taking',
  balanced: 'steady and adaptive',
  analytical: 'data-driven and calculated',
};

export function buildManagerExplanationPrompt(request: ManagerExplanationRequest): ClaudeRequest {
  const decisionLabel = DECISION_LABELS[request.decision] ?? 'made a strategic decision';
  const persona = STYLE_PERSONA[request.managerStyle] ?? 'balanced';

  const absDiff = Math.abs(request.scoreDiff);
  const scoreContext = request.scoreDiff === 0
    ? 'tied game'
    : request.scoreDiff > 0
      ? `leading by ${absDiff}`
      : `trailing by ${absDiff}`;

  return {
    system: `You are ${request.managerName}, a ${persona} baseball manager. Explain your in-game decision in 1-2 sentences from a first-person perspective. Stay in character and reference the game situation.`,
    prompt: [
      `Decision: ${request.managerName} ${decisionLabel}`,
      `Inning: ${request.inning} | Outs: ${request.outs} | Score: ${scoreContext}`,
      request.gameContext ? `Additional context: ${request.gameContext}` : '',
    ].filter(Boolean).join('\n'),
    maxTokens: 120,
  };
}
