import {
  generateDraftOrder,
  getPickingTeam,
  getNextPick,
  isSnakeReversed,
  TOTAL_ROUNDS,
} from '@lib/draft/draft-order';
import { SeededRNG } from '@lib/rng/seeded-rng';

const TEAM_IDS = ['t1', 't2', 't3', 't4'];

// ---------------------------------------------------------------------------
// isSnakeReversed
// ---------------------------------------------------------------------------
describe('isSnakeReversed', () => {
  it('round 1 is not reversed (forward order)', () => {
    expect(isSnakeReversed(1)).toBe(false);
  });

  it('round 2 is reversed', () => {
    expect(isSnakeReversed(2)).toBe(true);
  });

  it('round 3 is not reversed', () => {
    expect(isSnakeReversed(3)).toBe(false);
  });

  it('round 21 is not reversed (odd)', () => {
    expect(isSnakeReversed(21)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateDraftOrder
// ---------------------------------------------------------------------------
describe('generateDraftOrder (REQ-DFT-002)', () => {
  it('returns same number of teams as input', () => {
    const order = generateDraftOrder(TEAM_IDS, new SeededRNG(42));
    expect(order).toHaveLength(4);
  });

  it('contains all input team IDs', () => {
    const order = generateDraftOrder(TEAM_IDS, new SeededRNG(42));
    expect(order.sort()).toEqual([...TEAM_IDS].sort());
  });

  it('is deterministic with same seed', () => {
    const order1 = generateDraftOrder(TEAM_IDS, new SeededRNG(42));
    const order2 = generateDraftOrder(TEAM_IDS, new SeededRNG(42));
    expect(order1).toEqual(order2);
  });

  it('produces different order with different seed', () => {
    const order1 = generateDraftOrder(TEAM_IDS, new SeededRNG(1));
    const order2 = generateDraftOrder(TEAM_IDS, new SeededRNG(999));
    // With only 4 teams, there's a 1/24 chance of same order -- test with 8
    const eightTeams = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const o1 = generateDraftOrder(eightTeams, new SeededRNG(1));
    const o2 = generateDraftOrder(eightTeams, new SeededRNG(2));
    expect(o1).not.toEqual(o2);
  });
});

// ---------------------------------------------------------------------------
// getPickingTeam
// ---------------------------------------------------------------------------
describe('getPickingTeam (REQ-DFT-002)', () => {
  const order = ['t1', 't2', 't3', 't4'];

  it('round 1 follows forward order', () => {
    expect(getPickingTeam(1, 1, order)).toBe('t1');
    expect(getPickingTeam(1, 2, order)).toBe('t2');
    expect(getPickingTeam(1, 3, order)).toBe('t3');
    expect(getPickingTeam(1, 4, order)).toBe('t4');
  });

  it('round 2 follows reversed order (snake)', () => {
    expect(getPickingTeam(2, 1, order)).toBe('t4');
    expect(getPickingTeam(2, 2, order)).toBe('t3');
    expect(getPickingTeam(2, 3, order)).toBe('t2');
    expect(getPickingTeam(2, 4, order)).toBe('t1');
  });

  it('round 3 follows forward order again', () => {
    expect(getPickingTeam(3, 1, order)).toBe('t1');
    expect(getPickingTeam(3, 4, order)).toBe('t4');
  });

  it('handles 8-team snake correctly', () => {
    const eightTeam = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(getPickingTeam(1, 1, eightTeam)).toBe('a');
    expect(getPickingTeam(1, 8, eightTeam)).toBe('h');
    expect(getPickingTeam(2, 1, eightTeam)).toBe('h');
    expect(getPickingTeam(2, 8, eightTeam)).toBe('a');
  });
});

// ---------------------------------------------------------------------------
// getNextPick
// ---------------------------------------------------------------------------
describe('getNextPick', () => {
  const teamCount = 4;

  it('advances to next pick in same round', () => {
    const next = getNextPick(1, 1, TOTAL_ROUNDS, teamCount);
    expect(next).toEqual({ round: 1, pick: 2 });
  });

  it('advances to next round when round is complete', () => {
    const next = getNextPick(1, 4, TOTAL_ROUNDS, teamCount);
    expect(next).toEqual({ round: 2, pick: 1 });
  });

  it('returns null when draft is complete', () => {
    const next = getNextPick(TOTAL_ROUNDS, teamCount, TOTAL_ROUNDS, teamCount);
    expect(next).toBeNull();
  });

  it('handles mid-draft progression', () => {
    const next = getNextPick(10, 3, TOTAL_ROUNDS, teamCount);
    expect(next).toEqual({ round: 10, pick: 4 });
  });

  it('handles last round correctly', () => {
    const next = getNextPick(TOTAL_ROUNDS, 1, TOTAL_ROUNDS, teamCount);
    expect(next).toEqual({ round: TOTAL_ROUNDS, pick: 2 });
  });
});

// ---------------------------------------------------------------------------
// TOTAL_ROUNDS constant
// ---------------------------------------------------------------------------
describe('TOTAL_ROUNDS', () => {
  it('is 21 per REQ-DFT-001', () => {
    expect(TOTAL_ROUNDS).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// Full draft walkthrough
// ---------------------------------------------------------------------------
describe('full draft walkthrough', () => {
  it('visits every team exactly TOTAL_ROUNDS times', () => {
    const order = ['t1', 't2', 't3', 't4'];
    const pickCounts = new Map<string, number>();

    let current: { round: number; pick: number } | null = { round: 1, pick: 1 };
    while (current !== null) {
      const team = getPickingTeam(current.round, current.pick, order);
      pickCounts.set(team, (pickCounts.get(team) ?? 0) + 1);
      current = getNextPick(current.round, current.pick, TOTAL_ROUNDS, order.length);
    }

    for (const teamId of order) {
      expect(pickCounts.get(teamId)).toBe(TOTAL_ROUNDS);
    }
  });

  it('total picks = teamCount * TOTAL_ROUNDS', () => {
    const order = ['a', 'b', 'c', 'd', 'e', 'f'];
    let count = 0;
    let current: { round: number; pick: number } | null = { round: 1, pick: 1 };
    while (current !== null) {
      count++;
      current = getNextPick(current.round, current.pick, TOTAL_ROUNDS, order.length);
    }
    expect(count).toBe(order.length * TOTAL_ROUNDS);
  });
});
