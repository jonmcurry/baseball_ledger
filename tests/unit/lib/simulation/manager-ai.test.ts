import {
  evaluateStealDecision,
  evaluateBuntDecision,
  evaluateIntentionalWalkDecision,
  evaluatePitcherPullDecision,
  computeDecisionScore,
  getInningMultiplier,
  type GameSituation,
} from '@lib/simulation/manager-ai';
import { MANAGER_PROFILES } from '@lib/simulation/manager-profiles';
import { SeededRNG } from '@lib/rng/seeded-rng';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function baseSituation(overrides: Partial<GameSituation> = {}): GameSituation {
  return {
    inning: 5,
    outs: 0,
    runnerOnFirst: true,
    runnerOnSecond: false,
    runnerOnThird: false,
    scoreDiff: 0,     // Tied
    batterContactRate: 0.8,
    batterOpsRank: 0.5,
    runnerSpeed: 0.7,
    pitcherEffectiveGradePct: 0.8,
    firstBaseOpen: false,
    runnerInScoringPosition: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getInningMultiplier
// ---------------------------------------------------------------------------
describe('getInningMultiplier (REQ-AI-002)', () => {
  const profile = MANAGER_PROFILES.balanced;

  it('returns 1.0 for innings 1-6', () => {
    expect(getInningMultiplier(profile, 1)).toBe(1.0);
    expect(getInningMultiplier(profile, 6)).toBe(1.0);
  });

  it('returns lateInningMultiplier for innings 7-9', () => {
    expect(getInningMultiplier(profile, 7)).toBe(profile.lateInningMultiplier);
    expect(getInningMultiplier(profile, 9)).toBe(profile.lateInningMultiplier);
  });

  it('returns extraInningMultiplier for innings 10+', () => {
    expect(getInningMultiplier(profile, 10)).toBe(profile.extraInningMultiplier);
    expect(getInningMultiplier(profile, 12)).toBe(profile.extraInningMultiplier);
  });
});

// ---------------------------------------------------------------------------
// computeDecisionScore
// ---------------------------------------------------------------------------
describe('computeDecisionScore (REQ-AI-002)', () => {
  it('multiplies baseFactors * threshold * multiplier', () => {
    const score = computeDecisionScore(0.5, 0.6, 1.3);
    expect(score).toBeCloseTo(0.5 * 0.6 * 1.3, 4);
  });

  it('returns 0 when any factor is 0', () => {
    expect(computeDecisionScore(0, 0.5, 1.0)).toBe(0);
    expect(computeDecisionScore(0.5, 0, 1.0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// evaluateStealDecision (REQ-AI-004)
// ---------------------------------------------------------------------------
describe('evaluateStealDecision (REQ-AI-004)', () => {
  const profile = MANAGER_PROFILES.aggressive;

  it('never steals without runner on 1B or 2B', () => {
    const sit = baseSituation({ runnerOnFirst: false, runnerOnSecond: false });
    for (let i = 0; i < 50; i++) {
      expect(evaluateStealDecision(profile, sit, new SeededRNG(i))).toBe(false);
    }
  });

  it('never steals with 2 outs', () => {
    const sit = baseSituation({ outs: 2 });
    for (let i = 0; i < 50; i++) {
      expect(evaluateStealDecision(profile, sit, new SeededRNG(i))).toBe(false);
    }
  });

  it('never steals when up or down by 4+ runs', () => {
    const sit1 = baseSituation({ scoreDiff: 4 });
    const sit2 = baseSituation({ scoreDiff: -4 });
    for (let i = 0; i < 50; i++) {
      expect(evaluateStealDecision(profile, sit1, new SeededRNG(i))).toBe(false);
      expect(evaluateStealDecision(profile, sit2, new SeededRNG(i))).toBe(false);
    }
  });

  it('aggressive manager steals more often than conservative', () => {
    const sit = baseSituation({ inning: 7, runnerSpeed: 0.8, scoreDiff: 0 });
    let aggCount = 0;
    let conCount = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      if (evaluateStealDecision(MANAGER_PROFILES.aggressive, sit, new SeededRNG(i))) aggCount++;
      if (evaluateStealDecision(MANAGER_PROFILES.conservative, sit, new SeededRNG(i))) conCount++;
    }

    expect(aggCount).toBeGreaterThan(conCount);
  });

  it('steals more in late innings due to multiplier', () => {
    const early = baseSituation({ inning: 3, runnerSpeed: 0.7, scoreDiff: 0 });
    const late = baseSituation({ inning: 8, runnerSpeed: 0.7, scoreDiff: 0 });
    let earlyCount = 0;
    let lateCount = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      const rng1 = new SeededRNG(i);
      const rng2 = new SeededRNG(i);
      if (evaluateStealDecision(MANAGER_PROFILES.balanced, early, rng1)) earlyCount++;
      if (evaluateStealDecision(MANAGER_PROFILES.balanced, late, rng2)) lateCount++;
    }

    expect(lateCount).toBeGreaterThanOrEqual(earlyCount);
  });
});

// ---------------------------------------------------------------------------
// evaluateBuntDecision (REQ-AI-002)
// ---------------------------------------------------------------------------
describe('evaluateBuntDecision (REQ-AI-002)', () => {
  it('never bunts without runner on base', () => {
    const sit = baseSituation({ runnerOnFirst: false, runnerOnSecond: false });
    for (let i = 0; i < 50; i++) {
      expect(evaluateBuntDecision(MANAGER_PROFILES.conservative, sit, new SeededRNG(i))).toBe(false);
    }
  });

  it('never bunts with 2 outs', () => {
    const sit = baseSituation({ outs: 2 });
    for (let i = 0; i < 50; i++) {
      expect(evaluateBuntDecision(MANAGER_PROFILES.conservative, sit, new SeededRNG(i))).toBe(false);
    }
  });

  it('conservative manager bunts more than aggressive', () => {
    const sit = baseSituation({
      outs: 0, scoreDiff: 1, batterContactRate: 0.5,
      runnerOnFirst: true,
    });
    let conCount = 0;
    let aggCount = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      if (evaluateBuntDecision(MANAGER_PROFILES.conservative, sit, new SeededRNG(i))) conCount++;
      if (evaluateBuntDecision(MANAGER_PROFILES.aggressive, sit, new SeededRNG(i))) aggCount++;
    }

    expect(conCount).toBeGreaterThan(aggCount);
  });

  it('never bunts when game not within 2 runs', () => {
    const sit = baseSituation({ scoreDiff: 3 });
    for (let i = 0; i < 50; i++) {
      expect(evaluateBuntDecision(MANAGER_PROFILES.conservative, sit, new SeededRNG(i))).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// evaluateIntentionalWalkDecision (REQ-AI-002)
// ---------------------------------------------------------------------------
describe('evaluateIntentionalWalkDecision (REQ-AI-002)', () => {
  it('never walks if first base is not open', () => {
    const sit = baseSituation({ firstBaseOpen: false, batterOpsRank: 1.0 });
    for (let i = 0; i < 50; i++) {
      expect(evaluateIntentionalWalkDecision(MANAGER_PROFILES.conservative, sit, new SeededRNG(i))).toBe(false);
    }
  });

  it('more likely to walk high-OPS batters', () => {
    const sitHigh = baseSituation({
      firstBaseOpen: true, batterOpsRank: 0.95,
      runnerInScoringPosition: true,
    });
    const sitLow = baseSituation({
      firstBaseOpen: true, batterOpsRank: 0.3,
      runnerInScoringPosition: true,
    });
    let highCount = 0;
    let lowCount = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      if (evaluateIntentionalWalkDecision(MANAGER_PROFILES.conservative, sitHigh, new SeededRNG(i))) highCount++;
      if (evaluateIntentionalWalkDecision(MANAGER_PROFILES.conservative, sitLow, new SeededRNG(i))) lowCount++;
    }

    expect(highCount).toBeGreaterThan(lowCount);
  });
});

// ---------------------------------------------------------------------------
// evaluatePitcherPullDecision (REQ-AI-002)
// ---------------------------------------------------------------------------
describe('evaluatePitcherPullDecision (REQ-AI-002)', () => {
  it('more likely to pull when effective grade is low', () => {
    const sitTired = baseSituation({ pitcherEffectiveGradePct: 0.3 });
    const sitFresh = baseSituation({ pitcherEffectiveGradePct: 0.9 });
    let tiredPulls = 0;
    let freshPulls = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      if (evaluatePitcherPullDecision(MANAGER_PROFILES.balanced, sitTired, new SeededRNG(i))) tiredPulls++;
      if (evaluatePitcherPullDecision(MANAGER_PROFILES.balanced, sitFresh, new SeededRNG(i))) freshPulls++;
    }

    expect(tiredPulls).toBeGreaterThan(freshPulls);
  });

  it('aggressive manager pulls sooner than conservative', () => {
    const sit = baseSituation({ pitcherEffectiveGradePct: 0.6 });
    let aggPulls = 0;
    let conPulls = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      if (evaluatePitcherPullDecision(MANAGER_PROFILES.aggressive, sit, new SeededRNG(i))) aggPulls++;
      if (evaluatePitcherPullDecision(MANAGER_PROFILES.conservative, sit, new SeededRNG(i))) conPulls++;
    }

    expect(aggPulls).toBeGreaterThan(conPulls);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------
describe('manager-ai: determinism', () => {
  it('same seed produces identical decisions', () => {
    const profile = MANAGER_PROFILES.balanced;
    const sit = baseSituation({ inning: 8, runnerSpeed: 0.75, scoreDiff: 0 });
    const results1: boolean[] = [];
    const results2: boolean[] = [];

    for (let i = 0; i < 50; i++) {
      results1.push(evaluateStealDecision(profile, sit, new SeededRNG(42 + i)));
      results2.push(evaluateStealDecision(profile, sit, new SeededRNG(42 + i)));
    }

    expect(results1).toEqual(results2);
  });
});
