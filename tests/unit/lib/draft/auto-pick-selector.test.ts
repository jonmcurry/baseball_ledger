/**
 * Tests for selectBestAvailable (REQ-DFT-004)
 *
 * Pure L1 tests -- no mocks required.
 */

import type { PlayerCard } from '@lib/types/player';
import { selectBestAvailable } from '@lib/draft/auto-pick-selector';

/** Minimal batter card factory for testing. */
function makeBatterCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'test01',
    nameFirst: 'Test',
    nameLast: 'Player',
    seasonYear: 1971,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: 'RF',
    eligiblePositions: ['RF'],
    isPitcher: false,
    card: Array(35).fill(14), // all strikeouts = low score
    powerRating: 13, // none
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0,
    discipline: 0.3,
    contactRate: 0.5,
    fieldingPct: 0.95,
    range: 0.5,
    arm: 0.5,
    ...overrides,
  };
}

/** Minimal pitcher card factory for testing. */
function makePitcherCard(grade: number, overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'pitch01',
    nameFirst: 'Test',
    nameLast: 'Pitcher',
    seasonYear: 1971,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: 'SP',
    eligiblePositions: ['SP'],
    isPitcher: true,
    card: Array(35).fill(0),
    powerRating: 13,
    archetype: { byte33: 0, byte34: 6 },
    speed: 0.3,
    power: 0,
    discipline: 0.1,
    contactRate: 0.2,
    fieldingPct: 0.9,
    range: 0.3,
    arm: 0.5,
    pitching: {
      role: 'SP',
      grade,
      stamina: 7,
      era: 3.5,
      whip: 1.2,
      k9: 8,
      bb9: 3,
      hr9: 1,
      usageFlags: [],
      isReliever: false,
    },
    ...overrides,
  };
}

describe('selectBestAvailable', () => {
  it('returns -1 for empty array', () => {
    expect(selectBestAvailable([])).toBe(-1);
  });

  it('returns 0 for single-player array', () => {
    const players = [{ playerCard: makeBatterCard() }];
    expect(selectBestAvailable(players)).toBe(0);
  });

  it('picks batter with more HR card values over one with fewer', () => {
    // Player A: card full of strikeouts (value 14) -- low score
    const playerA = { playerCard: makeBatterCard({ playerId: 'lowhr' }) };

    // Player B: card with HR values (value 1) -- high score
    const hrCard = Array(35).fill(14);
    hrCard[0] = 1; // HR
    hrCard[2] = 1; // HR
    hrCard[4] = 1; // HR
    const playerB = { playerCard: makeBatterCard({ playerId: 'hihr', card: hrCard }) };

    const players = [playerA, playerB];
    expect(selectBestAvailable(players)).toBe(1);
  });

  it('picks higher-graded pitcher over lower-graded', () => {
    const lowGrade = { playerCard: makePitcherCard(5) };
    const highGrade = { playerCard: makePitcherCard(12) };

    const players = [lowGrade, highGrade];
    expect(selectBestAvailable(players)).toBe(1);
  });

  it('handles mixed pitcher/batter pool', () => {
    // Mediocre batter (all K, low power)
    const weakBatter = { playerCard: makeBatterCard({ playerId: 'weak' }) };

    // Elite pitcher (grade 15)
    const elitePitcher = { playerCard: makePitcherCard(15, { playerId: 'ace' }) };

    // Good batter (HRs + power)
    const hrCard = Array(35).fill(7); // all singles
    hrCard[0] = 1; hrCard[2] = 1; hrCard[4] = 1; hrCard[7] = 1; hrCard[8] = 1;
    const goodBatter = {
      playerCard: makeBatterCard({
        playerId: 'slugger',
        card: hrCard,
        powerRating: 21, // excellent
      }),
    };

    const players = [weakBatter, elitePitcher, goodBatter];
    const bestIndex = selectBestAvailable(players);
    // Either the elite pitcher or good batter should win, not the weak batter
    expect(bestIndex).not.toBe(0);
  });
});
