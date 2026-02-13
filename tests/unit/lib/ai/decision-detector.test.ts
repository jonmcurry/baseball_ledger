/**
 * Tests for decision-detector
 *
 * Detects notable manager decisions from play-by-play data.
 * Layer 1: Pure logic, no I/O.
 */

import { detectDecisions, type DetectedDecision } from '@lib/ai/decision-detector';
import type { PlayByPlayEntry } from '@lib/types/game';
import { OutcomeCategory } from '@lib/types/game';

function createPlay(overrides?: Partial<PlayByPlayEntry>): PlayByPlayEntry {
  return {
    inning: 1,
    halfInning: 'top',
    outs: 0,
    batterId: 'batter-1',
    pitcherId: 'pitcher-1',
    cardPosition: 7,
    cardValue: 8,
    outcomeTableRow: 15,
    outcome: OutcomeCategory.SINGLE_CLEAN,
    description: 'Smith: SINGLE_CLEAN',
    basesAfter: { first: 'batter-1', second: null, third: null },
    scoreAfter: { home: 0, away: 0 },
    ...overrides,
  };
}

describe('detectDecisions', () => {
  it('returns empty array for no plays', () => {
    expect(detectDecisions([])).toEqual([]);
  });

  it('detects intentional walk', () => {
    const plays = [
      createPlay({ outcome: OutcomeCategory.WALK_INTENTIONAL, inning: 7, outs: 1 }),
    ];

    const decisions = detectDecisions(plays);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].type).toBe('intentional_walk');
    expect(decisions[0].inning).toBe(7);
  });

  it('detects stolen base opportunity', () => {
    const plays = [
      createPlay({ outcome: OutcomeCategory.STOLEN_BASE_OPP, inning: 5 }),
    ];

    const decisions = detectDecisions(plays);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].type).toBe('steal');
  });

  it('detects sacrifice bunt', () => {
    const plays = [
      createPlay({ outcome: OutcomeCategory.SACRIFICE, inning: 3 }),
    ];

    const decisions = detectDecisions(plays);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].type).toBe('bunt');
  });

  it('detects pitcher change when pitcher ID changes between plays', () => {
    const plays = [
      createPlay({ pitcherId: 'pitcher-1', inning: 6 }),
      createPlay({ pitcherId: 'pitcher-2', inning: 6 }),
    ];

    const decisions = detectDecisions(plays);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].type).toBe('pull_pitcher');
    expect(decisions[0].playIndex).toBe(1);
  });

  it('does not detect pitcher change for first play', () => {
    const plays = [createPlay({ pitcherId: 'pitcher-1' })];

    const decisions = detectDecisions(plays);
    // First play cannot be a pitcher change
    expect(decisions.filter((d) => d.type === 'pull_pitcher')).toHaveLength(0);
  });

  it('detects multiple decisions in a game', () => {
    const plays = [
      createPlay({ outcome: OutcomeCategory.SACRIFICE, inning: 2, pitcherId: 'p-1' }),
      createPlay({ outcome: OutcomeCategory.SINGLE_CLEAN, inning: 3, pitcherId: 'p-1' }),
      createPlay({ outcome: OutcomeCategory.WALK_INTENTIONAL, inning: 5, pitcherId: 'p-2' }),
    ];

    const decisions = detectDecisions(plays);
    // bunt + pitcher change + IBB
    expect(decisions).toHaveLength(3);
  });

  it('includes outs, halfInning, and score diff in detected decision', () => {
    const plays = [
      createPlay({
        outcome: OutcomeCategory.WALK_INTENTIONAL,
        inning: 8,
        halfInning: 'bottom',
        outs: 2,
        scoreAfter: { home: 3, away: 5 },
      }),
    ];

    const decisions = detectDecisions(plays);
    expect(decisions[0].outs).toBe(2);
    expect(decisions[0].halfInning).toBe('bottom');
    expect(decisions[0].scoreDiff).toBe(-2);
  });

  it('does NOT flag pitcher change when half-inning switches (different team pitching)', () => {
    const plays = [
      createPlay({ pitcherId: 'home-pitcher', halfInning: 'top', inning: 1 }),
      createPlay({ pitcherId: 'away-pitcher', halfInning: 'bottom', inning: 1 }),
    ];

    const decisions = detectDecisions(plays);
    expect(decisions.filter((d) => d.type === 'pull_pitcher')).toHaveLength(0);
  });

  it('detects pitcher change between innings for the same team', () => {
    const plays = [
      createPlay({ pitcherId: 'pitcher-A', halfInning: 'top', inning: 5 }),
      createPlay({ pitcherId: 'away-p', halfInning: 'bottom', inning: 5 }),
      createPlay({ pitcherId: 'pitcher-B', halfInning: 'top', inning: 6 }),
    ];

    const decisions = detectDecisions(plays);
    const pitcherChanges = decisions.filter((d) => d.type === 'pull_pitcher');
    expect(pitcherChanges).toHaveLength(1);
    expect(pitcherChanges[0].playIndex).toBe(2);
    expect(pitcherChanges[0].inning).toBe(6);
  });
});
