/**
 * Template Trade Evaluation Tests
 */

import type { TradeEvaluationRequest } from '../../../../src/lib/types/ai';
import { evaluateTradeTemplate } from '../../../../src/lib/ai/template-trade-eval';

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

describe('evaluateTradeTemplate', () => {
  it('returns source "template"', () => {
    const result = evaluateTradeTemplate(makeRequest());
    expect(result.source).toBe('template');
  });

  // Balanced: threshold +5%
  it('balanced manager accepts at +10% value surplus', () => {
    const result = evaluateTradeTemplate(makeRequest({
      playersOffered: [{ name: 'A', position: 'LF', value: 50 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 55 }],
    }));
    expect(result.recommendation).toBe('accept');
  });

  it('balanced manager rejects when value deficit is too large', () => {
    const result = evaluateTradeTemplate(makeRequest({
      playersOffered: [{ name: 'A', position: 'LF', value: 60 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 40 }],
    }));
    expect(result.recommendation).toBe('reject');
  });

  it('balanced manager counters when value is close to threshold', () => {
    // Close but slightly below +5% threshold -> counter
    const result = evaluateTradeTemplate(makeRequest({
      playersOffered: [{ name: 'A', position: 'LF', value: 100 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 100 }],
    }));
    expect(result.recommendation).toBe('counter');
  });

  // Conservative: threshold +15%
  it('conservative manager requires high value surplus', () => {
    const result = evaluateTradeTemplate(makeRequest({
      managerStyle: 'conservative',
      managerName: 'Cap Spalding',
      playersOffered: [{ name: 'A', position: 'LF', value: 50 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 55 }],
    }));
    // +10% doesn't meet conservative +15% threshold
    expect(result.recommendation).not.toBe('accept');
  });

  it('conservative manager accepts at +20% surplus', () => {
    const result = evaluateTradeTemplate(makeRequest({
      managerStyle: 'conservative',
      managerName: 'Cap Spalding',
      playersOffered: [{ name: 'A', position: 'LF', value: 50 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 60 }],
    }));
    expect(result.recommendation).toBe('accept');
  });

  // Aggressive: threshold -5% (most lenient)
  it('aggressive manager accepts at break-even', () => {
    const result = evaluateTradeTemplate(makeRequest({
      managerStyle: 'aggressive',
      managerName: 'Duke Robinson',
      playersOffered: [{ name: 'A', position: 'LF', value: 50 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 50 }],
    }));
    expect(result.recommendation).toBe('accept');
  });

  // Analytical: threshold +10% with positional premiums
  it('analytical manager applies positional premiums to incoming SP', () => {
    const result = evaluateTradeTemplate(makeRequest({
      managerStyle: 'analytical',
      managerName: 'Larry Pepper',
      playersOffered: [{ name: 'A', position: 'LF', value: 50 }],
      // SP gets 1.15x premium: 48 * 1.15 = 55.2, diff = (55.2-50)/50 = 10.4% -> accepts at 10% threshold
      playersRequested: [{ name: 'B', position: 'SP', value: 48 }],
    }));
    expect(result.recommendation).toBe('accept');
  });

  it('includes reasoning text', () => {
    const result = evaluateTradeTemplate(makeRequest());
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.reasoning).toContain('Johnny McCoy');
  });

  it('reasoning mentions player names', () => {
    const result = evaluateTradeTemplate(makeRequest({
      playersOffered: [{ name: 'Mike Trout', position: 'CF', value: 90 }],
      playersRequested: [{ name: 'Babe Ruth', position: 'RF', value: 100 }],
    }));
    expect(result.reasoning).toContain('Babe Ruth');
  });

  it('returns valueDiff as a rounded number', () => {
    const result = evaluateTradeTemplate(makeRequest({
      playersOffered: [{ name: 'A', position: 'LF', value: 100 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 133 }],
    }));
    expect(result.valueDiff).toBe(0.33);
  });

  it('handles zero offered value without error', () => {
    const result = evaluateTradeTemplate(makeRequest({
      playersOffered: [{ name: 'A', position: 'LF', value: 0 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 50 }],
    }));
    expect(result.valueDiff).toBe(0);
  });
});
