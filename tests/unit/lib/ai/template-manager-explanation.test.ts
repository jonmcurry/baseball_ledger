/**
 * Template Manager Explanation Tests
 */

import type { ManagerExplanationRequest, ManagerDecisionType } from '../../../../src/lib/types/ai';
import { generateManagerExplanationTemplate } from '../../../../src/lib/ai/template-manager-explanation';

function makeRequest(overrides: Partial<ManagerExplanationRequest> = {}): ManagerExplanationRequest {
  return {
    managerName: 'Johnny McCoy',
    managerStyle: 'balanced',
    decision: 'steal',
    inning: 7,
    outs: 1,
    scoreDiff: 0,
    gameContext: '',
    ...overrides,
  };
}

describe('generateManagerExplanationTemplate', () => {
  it('returns source "template"', () => {
    const result = generateManagerExplanationTemplate(makeRequest());
    expect(result.source).toBe('template');
  });

  it('includes the manager name', () => {
    const result = generateManagerExplanationTemplate(makeRequest());
    expect(result.explanation).toContain('Johnny McCoy');
  });

  // Test all 4 decision types
  const decisionTypes: ManagerDecisionType[] = ['steal', 'bunt', 'intentional_walk', 'pull_pitcher'];

  describe.each(decisionTypes)('decision type: %s', (decision) => {
    it('produces non-empty explanation', () => {
      const result = generateManagerExplanationTemplate(makeRequest({ decision }));
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  });

  // Test all 4 manager styles
  const styles = ['conservative', 'aggressive', 'balanced', 'analytical'] as const;

  describe.each(styles)('manager style: %s', (style) => {
    it('produces non-empty explanation', () => {
      const result = generateManagerExplanationTemplate(makeRequest({
        managerStyle: style,
        managerName: `Manager (${style})`,
      }));
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  });

  it('uses provided gameContext when present', () => {
    const result = generateManagerExplanationTemplate(makeRequest({
      gameContext: 'the bases loaded and nobody out',
    }));
    expect(result.explanation).toContain('the bases loaded and nobody out');
  });

  it('builds context string when gameContext is empty', () => {
    const result = generateManagerExplanationTemplate(makeRequest({
      gameContext: '',
      inning: 9,
      outs: 2,
      scoreDiff: 0,
    }));
    expect(result.explanation).toContain('late in the game');
    expect(result.explanation).toContain('score tied');
    expect(result.explanation).toContain('two down');
  });

  it('context mentions leading when scoreDiff > 0', () => {
    const result = generateManagerExplanationTemplate(makeRequest({
      gameContext: '',
      scoreDiff: 3,
    }));
    expect(result.explanation).toContain('3-run lead');
  });

  it('context mentions trailing when scoreDiff < 0', () => {
    const result = generateManagerExplanationTemplate(makeRequest({
      gameContext: '',
      scoreDiff: -2,
    }));
    expect(result.explanation).toContain('trailing by 2');
  });

  it('context says "early in the game" for inning < 5', () => {
    const result = generateManagerExplanationTemplate(makeRequest({
      gameContext: '',
      inning: 3,
    }));
    expect(result.explanation).toContain('early in the game');
  });

  it('context says "in the middle innings" for inning 5-7', () => {
    const result = generateManagerExplanationTemplate(makeRequest({
      gameContext: '',
      inning: 6,
    }));
    expect(result.explanation).toContain('middle innings');
  });

  it('conservative steal explanation mentions risk-reward', () => {
    const result = generateManagerExplanationTemplate(makeRequest({
      managerStyle: 'conservative',
      managerName: 'Cap Spalding',
      decision: 'steal',
      gameContext: 'a 2-1 lead in the 8th',
    }));
    expect(result.explanation).toContain('Cap Spalding');
    expect(result.explanation).toContain('risk-reward');
  });

  it('analytical pull_pitcher mentions times-through-the-order', () => {
    const result = generateManagerExplanationTemplate(makeRequest({
      managerStyle: 'analytical',
      managerName: 'Larry Pepper',
      decision: 'pull_pitcher',
      gameContext: 'the starter facing the lineup a third time',
    }));
    expect(result.explanation).toContain('times-through-the-order');
  });
});
