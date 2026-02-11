import {
  computeEffectiveGrade,
  shouldRemoveStarter,
  selectReliever,
  shouldBringInCloser,
  getNextStarter,
  type PitcherGameState,
} from '@lib/simulation/pitching';
import type { PlayerCard, PitcherAttributes } from '@lib/types';

// ---------------------------------------------------------------------------
// Helpers to create test pitcher cards
// ---------------------------------------------------------------------------
function makePitcher(overrides: Partial<PitcherAttributes> & { id?: string } = {}): PlayerCard {
  const { id = 'p1', ...pitcherOverrides } = overrides;
  return {
    playerId: id,
    playerName: `Pitcher ${id}`,
    teamId: 'team1',
    season: 2024,
    primaryPosition: pitcherOverrides.role === 'CL' ? 'CL' : pitcherOverrides.role === 'RP' ? 'RP' : 'SP',
    eligiblePositions: [pitcherOverrides.role === 'CL' ? 'CL' : pitcherOverrides.role === 'RP' ? 'RP' : 'SP'],
    isPitcher: true,
    batting: {
      hand: 'R' as const,
      avg: 0.100,
      obp: 0.130,
      slg: 0.120,
    },
    pitching: {
      role: 'SP',
      grade: 12,
      stamina: 7,
      era: 3.50,
      whip: 1.20,
      k9: 8.0,
      bb9: 3.0,
      hr9: 1.0,
      usageFlags: [],
      isReliever: false,
      ...pitcherOverrides,
    },
    cardValues: new Array(35).fill(7),
    archetype: { byte33: 7, byte34: 0 },
    powerRating: 13,
    speed: 0.3,
    defense: {},
  } as unknown as PlayerCard;
}

function makePitcherState(overrides: Partial<PitcherGameState> = {}): PitcherGameState {
  return {
    inningsPitched: 0,
    earnedRuns: 0,
    consecutiveHitsWalks: 0,
    currentInning: 1,
    isShutout: false,
    isNoHitter: false,
    runDeficit: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeEffectiveGrade (REQ-SIM-010)
// ---------------------------------------------------------------------------
describe('computeEffectiveGrade (REQ-SIM-010)', () => {
  it('returns full grade within stamina innings (starter)', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    expect(computeEffectiveGrade(pitcher, 5)).toBe(14);
  });

  it('returns full grade at exactly stamina innings (starter)', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    expect(computeEffectiveGrade(pitcher, 7)).toBe(14);
  });

  it('degrades by 2 per inning beyond stamina (starter)', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    expect(computeEffectiveGrade(pitcher, 8)).toBe(12); // 14 - 2*1
    expect(computeEffectiveGrade(pitcher, 9)).toBe(10); // 14 - 2*2
    expect(computeEffectiveGrade(pitcher, 10)).toBe(8); // 14 - 2*3
  });

  it('minimum effective grade is 1', () => {
    const pitcher = makePitcher({ grade: 5, stamina: 3 });
    expect(computeEffectiveGrade(pitcher, 10)).toBe(1); // 5 - 2*7 = -9, clamped to 1
  });

  it('relief pitcher degrades by 3 per inning beyond stamina', () => {
    const pitcher = makePitcher({ role: 'RP', grade: 10, stamina: 2, isReliever: true });
    expect(computeEffectiveGrade(pitcher, 2)).toBe(10); // within stamina
    expect(computeEffectiveGrade(pitcher, 3)).toBe(7);  // 10 - 3*1
    expect(computeEffectiveGrade(pitcher, 4)).toBe(4);  // 10 - 3*2
  });

  it('reliever minimum effective grade is 1', () => {
    const pitcher = makePitcher({ role: 'RP', grade: 6, stamina: 1, isReliever: true });
    expect(computeEffectiveGrade(pitcher, 5)).toBe(1); // 6 - 3*4 = -6, clamped to 1
  });
});

// ---------------------------------------------------------------------------
// shouldRemoveStarter (REQ-SIM-011)
// ---------------------------------------------------------------------------
describe('shouldRemoveStarter (REQ-SIM-011)', () => {
  it('triggers when effective grade <= 50% of starting grade', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 4 });
    // At inning 9: 14 - 2*5 = 4, which is < 7 (50% of 14)
    const state = makePitcherState({ inningsPitched: 9 });
    expect(shouldRemoveStarter(pitcher, state)).toBe(true);
  });

  it('does not trigger when grade still above 50%', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({ inningsPitched: 7 });
    expect(shouldRemoveStarter(pitcher, state)).toBe(false);
  });

  it('triggers when 4+ ER and 4+ IP', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({ inningsPitched: 5, earnedRuns: 4 });
    expect(shouldRemoveStarter(pitcher, state)).toBe(true);
  });

  it('does not trigger when 4+ ER but < 4 IP', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({ inningsPitched: 3, earnedRuns: 5 });
    expect(shouldRemoveStarter(pitcher, state)).toBe(false);
  });

  it('does not trigger when 4+ IP but < 4 ER', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({ inningsPitched: 6, earnedRuns: 3 });
    expect(shouldRemoveStarter(pitcher, state)).toBe(false);
  });

  it('triggers when 3 consecutive hits/walks after 5th inning', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({
      inningsPitched: 6,
      consecutiveHitsWalks: 3,
      currentInning: 6,
    });
    expect(shouldRemoveStarter(pitcher, state)).toBe(true);
  });

  it('does not trigger for 3 consecutive H/W in 5th or earlier', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({
      inningsPitched: 5,
      consecutiveHitsWalks: 3,
      currentInning: 5,
    });
    expect(shouldRemoveStarter(pitcher, state)).toBe(false);
  });

  it('does not trigger for < 3 consecutive H/W after 5th', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({
      inningsPitched: 6,
      consecutiveHitsWalks: 2,
      currentInning: 6,
    });
    expect(shouldRemoveStarter(pitcher, state)).toBe(false);
  });

  it('triggers when losing by 5+ runs after the 6th inning (trigger #4)', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({
      inningsPitched: 6,
      currentInning: 7,
      runDeficit: 5,
    });
    expect(shouldRemoveStarter(pitcher, state)).toBe(true);
  });

  it('triggers when losing by more than 5 runs after the 6th', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({
      inningsPitched: 7,
      currentInning: 8,
      runDeficit: 8,
    });
    expect(shouldRemoveStarter(pitcher, state)).toBe(true);
  });

  it('does not trigger for 5+ deficit in the 6th inning or earlier', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({
      inningsPitched: 5,
      currentInning: 6,
      runDeficit: 7,
    });
    expect(shouldRemoveStarter(pitcher, state)).toBe(false);
  });

  it('does not trigger for < 5 run deficit after the 6th', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 7 });
    const state = makePitcherState({
      inningsPitched: 6,
      currentInning: 7,
      runDeficit: 4,
    });
    expect(shouldRemoveStarter(pitcher, state)).toBe(false);
  });

  it('does not trigger when shutout in progress regardless of fatigue', () => {
    // Per REQ-SIM-013 exception: do not pull if shutout/no-hitter
    const pitcher = makePitcher({ grade: 14, stamina: 4 });
    const state = makePitcherState({
      inningsPitched: 9,
      isShutout: true,
      isNoHitter: true,
    });
    expect(shouldRemoveStarter(pitcher, state)).toBe(false);
  });

  it('does not trigger when no-hitter in progress regardless of fatigue', () => {
    const pitcher = makePitcher({ grade: 14, stamina: 4 });
    const state = makePitcherState({
      inningsPitched: 9,
      isShutout: false,
      isNoHitter: true,
    });
    expect(shouldRemoveStarter(pitcher, state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectReliever (REQ-SIM-012)
// ---------------------------------------------------------------------------
describe('selectReliever (REQ-SIM-012)', () => {
  it('selects the reliever with the highest grade', () => {
    const bullpen = [
      makePitcher({ id: 'rp1', role: 'RP', grade: 8, isReliever: true }),
      makePitcher({ id: 'rp2', role: 'RP', grade: 11, isReliever: true }),
      makePitcher({ id: 'rp3', role: 'RP', grade: 6, isReliever: true }),
    ];
    const selected = selectReliever(bullpen);
    expect(selected?.playerId).toBe('rp2');
  });

  it('returns null when bullpen is empty', () => {
    expect(selectReliever([])).toBeNull();
  });

  it('excludes closer from reliever selection', () => {
    const bullpen = [
      makePitcher({ id: 'rp1', role: 'RP', grade: 8, isReliever: true }),
      makePitcher({ id: 'cl1', role: 'CL', grade: 13, isReliever: true }),
    ];
    const selected = selectReliever(bullpen);
    expect(selected?.playerId).toBe('rp1');
  });

  it('returns null when only closer remains in bullpen', () => {
    const bullpen = [
      makePitcher({ id: 'cl1', role: 'CL', grade: 13, isReliever: true }),
    ];
    expect(selectReliever(bullpen)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// shouldBringInCloser (REQ-SIM-013)
// ---------------------------------------------------------------------------
describe('shouldBringInCloser (REQ-SIM-013)', () => {
  it('brings in closer when winning by <= 3 in 9th inning', () => {
    expect(shouldBringInCloser(5, 3, 9, 0)).toBe(true);  // up by 2
    expect(shouldBringInCloser(4, 3, 9, 1)).toBe(true);  // up by 1, 1 runner
  });

  it('brings in closer when winning by exactly 3', () => {
    expect(shouldBringInCloser(6, 3, 9, 0)).toBe(true);
  });

  it('does not bring in closer when winning by > 3', () => {
    expect(shouldBringInCloser(7, 3, 9, 0)).toBe(false);
  });

  it('does not bring in closer when not winning', () => {
    expect(shouldBringInCloser(3, 5, 9, 0)).toBe(false);
    expect(shouldBringInCloser(3, 3, 9, 0)).toBe(false); // tied
  });

  it('does not bring in closer before 9th inning', () => {
    expect(shouldBringInCloser(5, 3, 8, 0)).toBe(false);
  });

  it('brings in closer in extra innings (10+)', () => {
    expect(shouldBringInCloser(5, 3, 10, 0)).toBe(true);
    expect(shouldBringInCloser(5, 3, 12, 1)).toBe(true);
  });

  it('does not bring in closer with > 2 runners on base', () => {
    expect(shouldBringInCloser(5, 3, 9, 3)).toBe(false);
  });

  it('allows closer with exactly 2 runners on base', () => {
    expect(shouldBringInCloser(5, 3, 9, 2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getNextStarter (REQ-SIM-014)
// ---------------------------------------------------------------------------
describe('getNextStarter (REQ-SIM-014)', () => {
  const rotation = [
    makePitcher({ id: 'sp1' }),
    makePitcher({ id: 'sp2' }),
    makePitcher({ id: 'sp3' }),
    makePitcher({ id: 'sp4' }),
  ];

  it('cycles through 4-man rotation sequentially', () => {
    expect(getNextStarter(rotation, 0).playerId).toBe('sp1');
    expect(getNextStarter(rotation, 1).playerId).toBe('sp2');
    expect(getNextStarter(rotation, 2).playerId).toBe('sp3');
    expect(getNextStarter(rotation, 3).playerId).toBe('sp4');
  });

  it('wraps around after 4th starter', () => {
    expect(getNextStarter(rotation, 4).playerId).toBe('sp1');
    expect(getNextStarter(rotation, 5).playerId).toBe('sp2');
  });

  it('handles large game numbers', () => {
    expect(getNextStarter(rotation, 100).playerId).toBe('sp1'); // 100 % 4 = 0
    expect(getNextStarter(rotation, 101).playerId).toBe('sp2');
  });
});
