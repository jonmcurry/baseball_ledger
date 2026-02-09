/**
 * Trade Evaluation Prompt Builder
 *
 * Builds the Claude prompt for trade analysis with manager personality.
 *
 * Layer 2: API infrastructure.
 */

import type { TradeEvaluationRequest } from '@lib/types/ai';
import type { ClaudeRequest } from '../claude-client';

const STYLE_DESCRIPTIONS: Record<string, string> = {
  conservative: 'You are a cautious, traditional manager who demands clear value to make any deal.',
  aggressive: 'You are a risk-taking, bold manager who loves to shake things up with big trades.',
  balanced: 'You are a steady, balanced manager who evaluates trades fairly on merit.',
  analytical: 'You are a data-driven manager who evaluates trades purely on the numbers with emphasis on positional value.',
};

export function buildTradeEvalPrompt(request: TradeEvaluationRequest): ClaudeRequest {
  const styleDesc = STYLE_DESCRIPTIONS[request.managerStyle] ?? STYLE_DESCRIPTIONS.balanced;

  const offeredList = request.playersOffered
    .map((p) => `  - ${p.name} (${p.position}, value: ${p.value})`)
    .join('\n');

  const requestedList = request.playersRequested
    .map((p) => `  - ${p.name} (${p.position}, value: ${p.value})`)
    .join('\n');

  return {
    system: `You are ${request.managerName}, manager of the ${request.teamName}. ${styleDesc} Evaluate the proposed trade and respond with exactly THREE lines:\nLine 1: ACCEPT, REJECT, or COUNTER\nLine 2: A 1-2 sentence reasoning as the manager\nLine 3: The value differential as a decimal (e.g., 0.15 for 15% surplus)`,
    prompt: [
      `Proposed Trade:`,
      `Players you would give up:`,
      offeredList,
      `Players you would receive:`,
      requestedList,
      ``,
      `Team needs: ${request.teamNeeds.join(', ')}`,
    ].join('\n'),
    maxTokens: 200,
  };
}
