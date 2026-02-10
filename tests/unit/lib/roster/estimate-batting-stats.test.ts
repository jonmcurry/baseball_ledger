/**
 * Tests for estimate-batting-stats.ts
 *
 * Pure Layer 1 function that approximates OPS/OBP/SLG from PlayerCard fields
 * for lineup ordering. Only relative ordering matters, not exact values.
 */

import { estimateBattingStats } from '@lib/roster/estimate-batting-stats';
import type { PlayerCard } from '@lib/types/player';

function makeCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'test01',
    nameFirst: 'Test',
    nameLast: 'Player',
    seasonYear: 2020,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: 'SS',
    eligiblePositions: ['SS'],
    isPitcher: false,
    card: Array(35).fill(7),
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.50,
    power: 0.150,
    discipline: 0.50,
    contactRate: 0.75,
    fieldingPct: 0.980,
    range: 0.5,
    arm: 0.5,
    ...overrides,
  };
}

describe('estimateBattingStats', () => {
  it('power hitter gets higher SLG than contact hitter', () => {
    const powerHitter = makeCard({ power: 0.300, contactRate: 0.65 });
    const contactHitter = makeCard({ power: 0.050, contactRate: 0.85 });

    const powerStats = estimateBattingStats(powerHitter);
    const contactStats = estimateBattingStats(contactHitter);

    expect(powerStats.slg).toBeGreaterThan(contactStats.slg);
  });

  it('disciplined hitter gets higher OBP than undisciplined hitter', () => {
    const disciplined = makeCard({ discipline: 0.90, contactRate: 0.70 });
    const undisciplined = makeCard({ discipline: 0.10, contactRate: 0.70 });

    const discStats = estimateBattingStats(disciplined);
    const undiscStats = estimateBattingStats(undisciplined);

    expect(discStats.obp).toBeGreaterThan(undiscStats.obp);
  });

  it('returns all three stats as positive numbers', () => {
    const card = makeCard();
    const stats = estimateBattingStats(card);

    expect(stats.ops).toBeGreaterThan(0);
    expect(stats.obp).toBeGreaterThan(0);
    expect(stats.slg).toBeGreaterThan(0);
  });

  it('handles zero values gracefully', () => {
    const card = makeCard({ contactRate: 0, power: 0, discipline: 0 });
    const stats = estimateBattingStats(card);

    expect(stats.ops).toBe(0);
    expect(stats.obp).toBe(0);
    expect(stats.slg).toBe(0);
  });
});
