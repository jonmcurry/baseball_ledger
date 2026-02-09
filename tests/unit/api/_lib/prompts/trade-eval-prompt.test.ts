/**
 * Trade Evaluation Prompt Builder Tests
 */

import type { TradeEvaluationRequest } from '../../../../../src/lib/types/ai';
import { buildTradeEvalPrompt } from '../../../../../api/_lib/prompts/trade-eval-prompt';

function makeRequest(overrides: Partial<TradeEvaluationRequest> = {}): TradeEvaluationRequest {
  return {
    managerStyle: 'balanced',
    managerName: 'Johnny McCoy',
    teamName: 'Sluggers',
    playersOffered: [{ name: 'Player A', position: 'LF', value: 50 }],
    playersRequested: [{ name: 'Player B', position: 'RF', value: 55 }],
    teamNeeds: ['RF', 'SP'],
    ...overrides,
  };
}

describe('buildTradeEvalPrompt', () => {
  it('includes manager name and team in system prompt', () => {
    const result = buildTradeEvalPrompt(makeRequest());
    expect(result.system).toContain('Johnny McCoy');
    expect(result.system).toContain('Sluggers');
  });

  it('includes player names in prompt', () => {
    const result = buildTradeEvalPrompt(makeRequest());
    expect(result.prompt).toContain('Player A');
    expect(result.prompt).toContain('Player B');
  });

  it('includes team needs', () => {
    const result = buildTradeEvalPrompt(makeRequest());
    expect(result.prompt).toContain('RF');
    expect(result.prompt).toContain('SP');
  });

  it('sets maxTokens to 200', () => {
    const result = buildTradeEvalPrompt(makeRequest());
    expect(result.maxTokens).toBe(200);
  });
});
