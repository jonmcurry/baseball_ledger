/**
 * Commentary Prompt Builder Tests
 */

import { OutcomeCategory } from '../../../../../src/lib/types/game';
import type { CommentaryRequest } from '../../../../../src/lib/types/ai';
import { buildCommentaryPrompt } from '../../../../../api/_lib/prompts/commentary-prompt';

function makeRequest(overrides: Partial<CommentaryRequest> = {}): CommentaryRequest {
  return {
    batterId: 'p1',
    batterName: 'Mike Trout',
    pitcherId: 'p2',
    pitcherName: 'Greg Maddux',
    outcome: OutcomeCategory.HOME_RUN,
    inning: 5,
    halfInning: 'bottom',
    outs: 1,
    scoreDiff: 2,
    runnersOn: 1,
    style: 'newspaper',
    ...overrides,
  };
}

describe('buildCommentaryPrompt', () => {
  it('returns a ClaudeRequest with system and prompt', () => {
    const result = buildCommentaryPrompt(makeRequest());
    expect(result.system).toContain('commentator');
    expect(result.prompt).toContain('Mike Trout');
    expect(result.prompt).toContain('Greg Maddux');
  });

  it('includes outcome label in prompt', () => {
    const result = buildCommentaryPrompt(makeRequest({ outcome: OutcomeCategory.DOUBLE }));
    expect(result.prompt).toContain('double');
  });

  it('includes newspaper style instruction', () => {
    const result = buildCommentaryPrompt(makeRequest({ style: 'newspaper' }));
    expect(result.system).toContain('newspaper');
  });

  it('includes radio style instruction', () => {
    const result = buildCommentaryPrompt(makeRequest({ style: 'radio' }));
    expect(result.system).toContain('radio');
  });

  it('includes modern style instruction', () => {
    const result = buildCommentaryPrompt(makeRequest({ style: 'modern' }));
    expect(result.system).toContain('analytics');
  });

  it('sets maxTokens to 100', () => {
    const result = buildCommentaryPrompt(makeRequest());
    expect(result.maxTokens).toBe(100);
  });

  it('includes inning and half inning', () => {
    const result = buildCommentaryPrompt(makeRequest({ inning: 9, halfInning: 'top' }));
    expect(result.prompt).toContain('Top');
    expect(result.prompt).toContain('9');
  });
});
