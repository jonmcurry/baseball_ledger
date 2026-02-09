/**
 * Draft Reasoning Prompt Builder Tests
 */

import type { DraftReasoningRequest } from '../../../../../src/lib/types/ai';
import { buildDraftReasoningPrompt } from '../../../../../api/_lib/prompts/draft-reasoning-prompt';

function makeRequest(overrides: Partial<DraftReasoningRequest> = {}): DraftReasoningRequest {
  return {
    round: 1,
    managerStyle: 'analytical',
    managerName: 'Larry Pepper',
    teamName: 'Sluggers',
    pickedPlayerName: 'Ken Griffey Jr.',
    pickedPlayerPosition: 'CF',
    pickedPlayerValue: 92,
    alternativePlayers: [{ name: 'Barry Bonds', position: 'LF', value: 88 }],
    teamNeeds: ['CF', 'SP'],
    ...overrides,
  };
}

describe('buildDraftReasoningPrompt', () => {
  it('includes manager name and style in system prompt', () => {
    const result = buildDraftReasoningPrompt(makeRequest());
    expect(result.system).toContain('Larry Pepper');
    expect(result.system).toContain('analytical');
  });

  it('includes picked player and round in prompt', () => {
    const result = buildDraftReasoningPrompt(makeRequest());
    expect(result.prompt).toContain('Ken Griffey Jr.');
    expect(result.prompt).toContain('Round 1');
  });

  it('includes alternative players', () => {
    const result = buildDraftReasoningPrompt(makeRequest());
    expect(result.prompt).toContain('Barry Bonds');
  });

  it('sets maxTokens to 150', () => {
    const result = buildDraftReasoningPrompt(makeRequest());
    expect(result.maxTokens).toBe(150);
  });
});
