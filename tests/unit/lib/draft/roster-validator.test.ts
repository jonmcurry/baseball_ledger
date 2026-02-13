/**
 * Tests for Roster Validation (REQ-DFT-008, REQ-RST-001)
 *
 * Validates roster composition after the draft:
 * - 9 starters: C, 1B, 2B, SS, 3B, LF, CF, RF, DH
 * - 4 bench position players
 * - 4 SP (rotation)
 * - 4 RP/CL (bullpen)
 * Total: 21 players
 */

import type { PlayerCard, Position, PitcherAttributes } from '@lib/types/player';
import type { DraftablePlayer } from '@lib/draft/ai-strategy';
import {
  validateRoster,
  getRosterGaps,
  autoFillRoster,
  REQUIRED_ROSTER_SIZE,
} from '@lib/draft/roster-validator';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeBatter(
  id: string,
  position: Position,
  ops = 0.800,
  fieldingPct = 0.980,
): DraftablePlayer {
  const card: PlayerCard = {
    playerId: id,
    nameFirst: id.slice(0, 3),
    nameLast: id.slice(3),
    seasonYear: 2020,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: position,
    eligiblePositions: [position],
    isPitcher: false,
    card: Array(35).fill(7),
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0.150,
    discipline: 0.5,
    contactRate: 0.75,
    fieldingPct,
    range: 0.5,
    arm: 0.5,
  };
  return { card, ops, sb: 10 };
}

function makePitcher(
  id: string,
  role: 'SP' | 'RP' | 'CL',
  era = 3.50,
  k9 = 8.0,
): DraftablePlayer {
  const pitching: PitcherAttributes = {
    role,
    grade: 8,
    stamina: role === 'SP' ? 6.5 : 2.0,
    era,
    whip: 1.25,
    k9,
    bb9: 3.0,
    hr9: 1.0,
    usageFlags: [],
    isReliever: role !== 'SP',
  };
  const card: PlayerCard = {
    playerId: id,
    nameFirst: id.slice(0, 3),
    nameLast: id.slice(3),
    seasonYear: 2020,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: role,
    eligiblePositions: [role],
    isPitcher: true,
    card: Array(35).fill(7),
    powerRating: 13,
    archetype: { byte33: 0, byte34: 6 },
    speed: 0.1,
    power: 0.050,
    discipline: 0.3,
    contactRate: 0.4,
    fieldingPct: 0.970,
    range: 0.3,
    arm: 0.6,
    pitching,
  };
  return { card, ops: 0.400, sb: 0 };
}

/** Build a complete valid 21-player roster. */
function makeCompleteRoster(): DraftablePlayer[] {
  return [
    // 9 starters
    makeBatter('catcher01', 'C'),
    makeBatter('first01', '1B'),
    makeBatter('second01', '2B'),
    makeBatter('short01', 'SS'),
    makeBatter('third01', '3B'),
    makeBatter('left01', 'LF'),
    makeBatter('center01', 'CF'),
    makeBatter('right01', 'RF'),
    makeBatter('dh0001', 'DH'),
    // 4 bench
    makeBatter('bench01', '1B', 0.750),
    makeBatter('bench02', 'LF', 0.720),
    makeBatter('bench03', 'SS', 0.710),
    makeBatter('bench04', 'CF', 0.700),
    // 4 SP
    makePitcher('sp000001', 'SP', 3.20),
    makePitcher('sp000002', 'SP', 3.50),
    makePitcher('sp000003', 'SP', 3.80),
    makePitcher('sp000004', 'SP', 4.00),
    // 4 RP/CL (bullpen)
    makePitcher('rp000001', 'RP', 3.00),
    makePitcher('rp000002', 'RP', 3.20),
    makePitcher('cl000001', 'CL', 2.80),
    makePitcher('cl000002', 'CL', 3.10),
  ];
}

// ---------------------------------------------------------------------------
// validateRoster
// ---------------------------------------------------------------------------

describe('validateRoster', () => {
  it('returns valid for a complete 21-player roster', () => {
    const roster = makeCompleteRoster();
    const result = validateRoster(roster);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.gaps).toHaveLength(0);
  });

  it('detects missing catcher', () => {
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'catcher01',
    );
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('C'))).toBe(true);
  });

  it('detects missing shortstop', () => {
    // Build a roster with no SS player at all (bench03 is SS in makeCompleteRoster,
    // so replace it with a non-SS bench player first)
    const roster = makeCompleteRoster()
      .filter((p) => p.card.playerId !== 'short01')
      .map((p) => {
        if (p.card.playerId === 'bench03') {
          return makeBatter('bench03', '3B', 0.710);
        }
        return p;
      });
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('SS'))).toBe(true);
  });

  it('detects missing SP when rotation is short', () => {
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'sp000004',
    );
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('SP'))).toBe(true);
  });

  it('detects missing RP', () => {
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'rp000002',
    );
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RP') || e.includes('CL') || e.toLowerCase().includes('bullpen'))).toBe(true);
  });

  it('detects missing bullpen pitcher when CL removed', () => {
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'cl000001',
    );
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RP') || e.includes('CL') || e.toLowerCase().includes('bullpen'))).toBe(true);
  });

  it('detects multiple gaps simultaneously', () => {
    // Remove C, SS, one SP, one RP
    const removeIds = new Set(['catcher01', 'short01', 'sp000001', 'rp000001']);
    const roster = makeCompleteRoster().filter(
      (p) => !removeIds.has(p.card.playerId),
    );
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.gaps.length).toBeGreaterThanOrEqual(4);
  });

  it('detects wrong roster size', () => {
    const roster = makeCompleteRoster().slice(0, 15);
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('21'))).toBe(true);
  });

  it('detects insufficient bench players', () => {
    // Remove 2 bench players (only 2 bench instead of 4)
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'bench03' && p.card.playerId !== 'bench04',
    );
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('bench'))).toBe(true);
  });

  it('treats OF positions (LF, CF, RF) as interchangeable for starter slots', () => {
    // Replace LF starter with another CF -- should still satisfy 3 OF requirement
    const roster = makeCompleteRoster().map((p) => {
      if (p.card.playerId === 'left01') {
        return makeBatter('left01', 'CF');
      }
      return p;
    });
    const result = validateRoster(roster);
    // Still valid because we need 3 OF total (LF/CF/RF interchangeable)
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRosterGaps
// ---------------------------------------------------------------------------

describe('getRosterGaps', () => {
  it('returns empty array for a complete roster', () => {
    const roster = makeCompleteRoster();
    const gaps = getRosterGaps(roster);
    expect(gaps).toHaveLength(0);
  });

  it('identifies missing positions', () => {
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'catcher01' && p.card.playerId !== 'sp000001',
    );
    const gaps = getRosterGaps(roster);
    expect(gaps.some((g) => g.position === 'C')).toBe(true);
    expect(gaps.some((g) => g.position === 'SP')).toBe(true);
  });

  it('identifies bench shortage', () => {
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'bench01' && p.card.playerId !== 'bench02',
    );
    const gaps = getRosterGaps(roster);
    const benchGaps = gaps.filter((g) => g.slot === 'bench');
    expect(benchGaps).toHaveLength(2);
  });

  it('correctly counts SP needs', () => {
    // Remove 2 of 4 SP
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'sp000003' && p.card.playerId !== 'sp000004',
    );
    const gaps = getRosterGaps(roster);
    const spGaps = gaps.filter((g) => g.position === 'SP');
    expect(spGaps).toHaveLength(2);
  });

  it('returns gap for each unfilled position individually', () => {
    // Empty roster -- all positions are gaps
    const gaps = getRosterGaps([]);
    // 9 starters + 4 bench + 4 SP + 4 RP/CL = 21
    expect(gaps).toHaveLength(21);
  });
});

// ---------------------------------------------------------------------------
// autoFillRoster
// ---------------------------------------------------------------------------

describe('autoFillRoster', () => {
  it('returns original roster when already complete', () => {
    const roster = makeCompleteRoster();
    const pool: DraftablePlayer[] = [
      makeBatter('extra01', 'C'),
      makePitcher('extra02', 'SP'),
    ];
    const filled = autoFillRoster(roster, pool);
    expect(filled).toHaveLength(REQUIRED_ROSTER_SIZE);
    // No new players added
    const rosterIds = new Set(roster.map((p) => p.card.playerId));
    const filledIds = new Set(filled.map((p) => p.card.playerId));
    expect(filledIds).toEqual(rosterIds);
  });

  it('fills missing catcher from pool', () => {
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'catcher01',
    );
    const pool: DraftablePlayer[] = [
      makeBatter('poolC01', 'C', 0.750),
      makeBatter('poolC02', 'C', 0.720),
    ];
    const filled = autoFillRoster(roster, pool);
    const catchers = filled.filter(
      (p) => !p.card.isPitcher && p.card.primaryPosition === 'C',
    );
    expect(catchers.length).toBeGreaterThanOrEqual(1);
    expect(filled.some((p) => p.card.playerId === 'poolC01')).toBe(true);
  });

  it('fills missing SP from pool, picks best available', () => {
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'sp000004',
    );
    const pool: DraftablePlayer[] = [
      makePitcher('poolSP01', 'SP', 4.50, 6.0), // worse
      makePitcher('poolSP02', 'SP', 3.00, 9.0), // better
    ];
    const filled = autoFillRoster(roster, pool);
    // Should pick the better SP
    expect(filled.some((p) => p.card.playerId === 'poolSP02')).toBe(true);
  });

  it('fills multiple gaps at once', () => {
    // Remove two bullpen pitchers (one CL and one RP)
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'cl000001' && p.card.playerId !== 'rp000001',
    );
    const pool: DraftablePlayer[] = [
      makePitcher('poolCL01', 'CL', 2.50),
      makePitcher('poolRP01', 'RP', 3.10),
      makePitcher('poolRP02', 'RP', 3.80),
    ];
    const filled = autoFillRoster(roster, pool);
    expect(filled).toHaveLength(REQUIRED_ROSTER_SIZE);
    expect(filled.some((p) => p.card.playerId === 'poolCL01')).toBe(true);
    expect(filled.some((p) => p.card.playerId === 'poolRP01')).toBe(true);
  });

  it('does not use players already on the roster', () => {
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'catcher01',
    );
    // Pool contains a player already on roster (first01) and a new catcher
    const pool: DraftablePlayer[] = [
      makeBatter('first01', '1B'), // already on roster
      makeBatter('poolC01', 'C', 0.750),
    ];
    const filled = autoFillRoster(roster, pool);
    const first01Count = filled.filter(
      (p) => p.card.playerId === 'first01',
    ).length;
    expect(first01Count).toBe(1); // Only the original, not doubled
  });

  it('fills bench gaps with best available position players', () => {
    // Remove 2 bench players
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'bench03' && p.card.playerId !== 'bench04',
    );
    const pool: DraftablePlayer[] = [
      makeBatter('poolB01', '2B', 0.780),
      makeBatter('poolB02', 'RF', 0.760),
      makeBatter('poolB03', 'LF', 0.740),
    ];
    const filled = autoFillRoster(roster, pool);
    expect(filled).toHaveLength(REQUIRED_ROSTER_SIZE);
    // Should have added 2 bench players
    const benchPlayers = filled.filter(
      (p) =>
        p.card.playerId === 'poolB01' ||
        p.card.playerId === 'poolB02',
    );
    expect(benchPlayers).toHaveLength(2);
  });

  it('handles case when pool lacks needed position', () => {
    // Missing a bullpen pitcher (CL removed), but pool has no RP or CL
    const roster = makeCompleteRoster().filter(
      (p) => p.card.playerId !== 'cl000001',
    );
    const pool: DraftablePlayer[] = [
      makeBatter('poolX01', '1B'),
      makePitcher('poolSP99', 'SP', 3.00),
    ];
    const filled = autoFillRoster(roster, pool);
    // Should still return what it can, even if incomplete
    expect(filled.length).toBeLessThanOrEqual(REQUIRED_ROSTER_SIZE);
    // Bullpen gap remains unfilled (only 3 bullpen: rp000001, rp000002, cl000002)
    const bullpenPlayers = filled.filter(
      (p) => p.card.isPitcher && (p.card.pitching?.role === 'RP' || p.card.pitching?.role === 'CL'),
    );
    expect(bullpenPlayers).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// REQUIRED_ROSTER_SIZE constant
// ---------------------------------------------------------------------------

describe('REQUIRED_ROSTER_SIZE', () => {
  it('equals 21 per REQ-RST-001', () => {
    expect(REQUIRED_ROSTER_SIZE).toBe(21);
  });
});
