/**
 * Manager Explanation Prompt Builder Tests
 */

import type { ManagerExplanationRequest } from '../../../../../src/lib/types/ai';
import { buildManagerExplanationPrompt } from '../../../../../api/_lib/prompts/manager-explanation-prompt';

function makeRequest(overrides: Partial<ManagerExplanationRequest> = {}): ManagerExplanationRequest {
  return {
    managerName: 'Duke Robinson',
    managerStyle: 'aggressive',
    decision: 'steal',
    inning: 7,
    outs: 1,
    scoreDiff: -1,
    gameContext: '',
    ...overrides,
  };
}

describe('buildManagerExplanationPrompt', () => {
  it('includes manager name in system prompt', () => {
    const result = buildManagerExplanationPrompt(makeRequest());
    expect(result.system).toContain('Duke Robinson');
  });

  it('includes decision label in prompt', () => {
    const result = buildManagerExplanationPrompt(makeRequest({ decision: 'bunt' }));
    expect(result.prompt).toContain('sacrifice bunt');
  });

  it('includes score context', () => {
    const result = buildManagerExplanationPrompt(makeRequest({ scoreDiff: -2 }));
    expect(result.prompt).toContain('trailing by 2');
  });

  it('includes game context when provided', () => {
    const result = buildManagerExplanationPrompt(makeRequest({ gameContext: 'runner at second' }));
    expect(result.prompt).toContain('runner at second');
  });

  it('sets maxTokens to 120', () => {
    const result = buildManagerExplanationPrompt(makeRequest());
    expect(result.maxTokens).toBe(120);
  });
});
