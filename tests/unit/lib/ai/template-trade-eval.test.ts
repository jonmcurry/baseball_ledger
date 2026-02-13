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
    // Use teamNeeds: [] so needs bonus doesn't apply
    const result = evaluateTradeTemplate(makeRequest({
      playersOffered: [{ name: 'A', position: 'LF', value: 100 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 100 }],
      teamNeeds: [],
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
      teamNeeds: [],
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
      teamNeeds: [],
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

  it('includes per-player breakdowns in response', () => {
    const result = evaluateTradeTemplate(makeRequest({
      playersOffered: [
        { name: 'Player A', position: 'LF', value: 50 },
        { name: 'Player B', position: '1B', value: 40 },
      ],
      playersRequested: [
        { name: 'Player C', position: 'RF', value: 55 },
      ],
    }));

    expect(result.playerBreakdowns).toBeDefined();
    expect(result.playerBreakdowns).toHaveLength(3);

    const offeredPlayers = result.playerBreakdowns!.filter((p) => p.side === 'offered');
    const requestedPlayers = result.playerBreakdowns!.filter((p) => p.side === 'requested');
    expect(offeredPlayers).toHaveLength(2);
    expect(requestedPlayers).toHaveLength(1);
    expect(offeredPlayers[0].name).toBe('Player A');
    expect(offeredPlayers[0].rawValue).toBe(50);
  });

  it('applies team needs bonus to incoming players that fill needs', () => {
    // Balanced threshold = +5%, but the player fills a team need (RF)
    // Without needs bonus: (50-50)/50 = 0% -> counter
    // With 10% needs bonus on RF: requestedValue = 50*1.10 = 55, diff = +10% -> accept
    const result = evaluateTradeTemplate(makeRequest({
      managerStyle: 'balanced',
      playersOffered: [{ name: 'A', position: 'LF', value: 50 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 50 }],
      teamNeeds: ['RF'],
    }));
    expect(result.recommendation).toBe('accept');
  });

  it('does not apply team needs bonus to positions not in teamNeeds', () => {
    const result = evaluateTradeTemplate(makeRequest({
      managerStyle: 'balanced',
      playersOffered: [{ name: 'A', position: 'LF', value: 50 }],
      playersRequested: [{ name: 'B', position: 'LF', value: 50 }],
      teamNeeds: ['SP'],
    }));
    // No needs bonus, so 0% diff < 5% threshold -> counter
    expect(result.recommendation).toBe('counter');
  });

  it('breakdown shows adjusted values with needs bonus applied', () => {
    const result = evaluateTradeTemplate(makeRequest({
      playersOffered: [{ name: 'A', position: 'LF', value: 50 }],
      playersRequested: [{ name: 'B', position: 'RF', value: 50 }],
      teamNeeds: ['RF'],
    }));

    const requested = result.playerBreakdowns!.find((p) => p.name === 'B');
    expect(requested).toBeDefined();
    expect(requested!.rawValue).toBe(50);
    expect(requested!.adjustedValue).toBeCloseTo(55, 0); // 50 * 1.10 needs bonus
    expect(requested!.needsBonus).toBe(true);
  });
});
