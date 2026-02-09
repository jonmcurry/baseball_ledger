import { determineArchetype, isEliteFielder } from '@lib/card-generator/archetype';
import type { BattingStats } from '@lib/types';

function makeBattingStats(overrides: Partial<BattingStats> = {}): BattingStats {
  return {
    G: 0, AB: 0, R: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0,
    SB: 0, CS: 0, BB: 0, SO: 0, IBB: 0, HBP: 0, SH: 0, SF: 0, GIDP: 0,
    BA: 0, OBP: 0, SLG: 0, OPS: 0,
    ...overrides,
  };
}

describe('determineArchetype (REQ-DATA-005 Step 5)', () => {
  it('returns (0, 6) for pitcher', () => {
    const stats = makeBattingStats();
    const result = determineArchetype(stats, 'R', true, 'SP', 0, false, 1);
    expect(result).toEqual({ byte33: 0, byte34: 6 });
  });

  it('returns (1, 0) for RH power hitter (HR >= 25)', () => {
    const stats = makeBattingStats({ HR: 30, BA: 0.270, SLG: 0.500 });
    const result = determineArchetype(stats, 'R', false, 'LF', 0, false, 1);
    expect(result).toEqual({ byte33: 1, byte34: 0 });
  });

  it('returns (1, 0) for RH power hitter (ISO >= 0.230)', () => {
    const stats = makeBattingStats({ HR: 20, BA: 0.250, SLG: 0.490 }); // ISO = 0.240
    const result = determineArchetype(stats, 'R', false, '1B', 0, false, 1);
    expect(result).toEqual({ byte33: 1, byte34: 0 });
  });

  it('returns (1, 1) for LH power hitter (power + platoon)', () => {
    const stats = makeBattingStats({ HR: 35, BA: 0.280, SLG: 0.550 });
    const result = determineArchetype(stats, 'L', false, 'LF', 0, false, 1);
    expect(result).toEqual({ byte33: 1, byte34: 1 });
  });

  it('returns (1, 1) for switch-hitting power hitter', () => {
    const stats = makeBattingStats({ HR: 28, BA: 0.260, SLG: 0.520 });
    const result = determineArchetype(stats, 'S', false, '1B', 0, false, 1);
    expect(result).toEqual({ byte33: 1, byte34: 1 });
  });

  it('returns (6, 0) for speed specialist (SB >= 20)', () => {
    const stats = makeBattingStats({ SB: 25, CS: 5, BA: 0.260, SLG: 0.350 });
    const result = determineArchetype(stats, 'R', false, 'CF', 0.833, false, 1);
    expect(result).toEqual({ byte33: 6, byte34: 0 });
  });

  it('returns (6, 0) for speed specialist (sbRate >= 0.75)', () => {
    const stats = makeBattingStats({ SB: 15, CS: 3, BA: 0.260, SLG: 0.350 });
    const result = determineArchetype(stats, 'R', false, 'CF', 0.833, false, 1);
    expect(result).toEqual({ byte33: 6, byte34: 0 });
  });

  it('returns (0, 2) for contact + speed (BA >= 0.280 and SB >= 10)', () => {
    const stats = makeBattingStats({ BA: 0.290, SB: 12, CS: 5, SLG: 0.400, HR: 8 });
    const result = determineArchetype(stats, 'R', false, '2B', 0.706, false, 1);
    expect(result).toEqual({ byte33: 0, byte34: 2 });
  });

  it('returns (8, 0) for elite defense at premium position', () => {
    const stats = makeBattingStats({ BA: 0.230, SLG: 0.310, HR: 3 });
    const result = determineArchetype(stats, 'R', false, 'SS', 0, true, 1);
    expect(result).toEqual({ byte33: 8, byte34: 0 });
  });

  it('does not assign elite defense for non-premium position', () => {
    const stats = makeBattingStats({ BA: 0.230, SLG: 0.310, HR: 3 });
    const result = determineArchetype(stats, 'R', false, 'LF', 0, true, 2);
    // LF is not premium, so falls through to default
    expect(result).toEqual({ byte33: 7, byte34: 0 });
  });

  it('returns (5, 0) for utility player (multi-position, low BA)', () => {
    const stats = makeBattingStats({ BA: 0.220, SLG: 0.300, HR: 4 });
    const result = determineArchetype(stats, 'R', false, '2B', 0, false, 3);
    expect(result).toEqual({ byte33: 5, byte34: 0 });
  });

  it('returns (0, 1) for standard LH batter', () => {
    const stats = makeBattingStats({ BA: 0.265, SLG: 0.380, HR: 10, SB: 3 });
    const result = determineArchetype(stats, 'L', false, '1B', 0.5, false, 1);
    expect(result).toEqual({ byte33: 0, byte34: 1 });
  });

  it('returns (0, 1) for standard switch batter', () => {
    const stats = makeBattingStats({ BA: 0.260, SLG: 0.370, HR: 8, SB: 5 });
    const result = determineArchetype(stats, 'S', false, 'C', 0.625, false, 1);
    expect(result).toEqual({ byte33: 0, byte34: 1 });
  });

  it('returns (7, 0) for standard RH batter', () => {
    const stats = makeBattingStats({ BA: 0.260, SLG: 0.380, HR: 12, SB: 4 });
    const result = determineArchetype(stats, 'R', false, '3B', 0.5, false, 2);
    expect(result).toEqual({ byte33: 7, byte34: 0 });
  });

  it('power takes priority over speed', () => {
    // Player qualifies for both power and speed
    const stats = makeBattingStats({ HR: 30, SB: 25, BA: 0.280, SLG: 0.550 });
    const result = determineArchetype(stats, 'R', false, 'RF', 0.833, false, 1);
    expect(result).toEqual({ byte33: 1, byte34: 0 }); // Power wins
  });

  it('pitcher takes priority over everything', () => {
    // Pitcher with power stats (like Shohei Ohtani as pitcher)
    const stats = makeBattingStats({ HR: 30, SB: 20, BA: 0.280, SLG: 0.550 });
    const result = determineArchetype(stats, 'R', true, 'SP', 0.8, true, 1);
    expect(result).toEqual({ byte33: 0, byte34: 6 }); // Pitcher wins
  });
});

describe('isEliteFielder', () => {
  it('returns true for high fielding pct at premium position', () => {
    expect(isEliteFielder(0.990, 'SS')).toBe(true);
    expect(isEliteFielder(0.985, 'C')).toBe(true);
    expect(isEliteFielder(0.995, '2B')).toBe(true);
  });

  it('returns false for below-threshold fielding', () => {
    expect(isEliteFielder(0.980, 'SS')).toBe(false);
    expect(isEliteFielder(0.970, 'C')).toBe(false);
  });

  it('returns false for non-premium positions regardless of pct', () => {
    expect(isEliteFielder(0.999, 'LF')).toBe(false);
    expect(isEliteFielder(0.999, 'RF')).toBe(false);
    expect(isEliteFielder(0.999, '1B')).toBe(false);
    expect(isEliteFielder(0.999, 'DH')).toBe(false);
  });

  it('returns true for CF with elite fielding', () => {
    expect(isEliteFielder(0.990, 'CF')).toBe(true);
  });

  it('returns true for 3B with elite fielding', () => {
    expect(isEliteFielder(0.985, '3B')).toBe(true);
  });
});
