/**
 * Tests for Game Runner (Full Game Orchestrator)
 *
 * REQ-SIM-001: Game state machine flow.
 * REQ-SIM-002: Game state management.
 * REQ-SIM-004: Card lookup with pitcher grade gate.
 * REQ-SIM-016: Post-game output generation.
 * REQ-NFR-007: Deterministic seeded RNG.
 */

import type { PlayerCard } from '../../../../src/lib/types/player';
import type { GameResult } from '../../../../src/lib/types/game';
import { OutcomeCategory } from '../../../../src/lib/types/game';
import { runGame } from '../../../../src/lib/simulation/game-runner';
import type { RunGameConfig } from '../../../../src/lib/simulation/game-runner';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makePlayerCard(overrides: Partial<PlayerCard> & { playerId: string }): PlayerCard {
  return {
    nameFirst: 'Test',
    nameLast: 'Player',
    seasonYear: 1990,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: 'CF',
    eligiblePositions: ['CF'],
    isPitcher: false,
    card: Array.from({ length: 35 }, () => 7), // All singles
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0.15,
    discipline: 0.5,
    contactRate: 0.75,
    fieldingPct: 0.980,
    range: 0.7,
    arm: 0.6,
    ...overrides,
  };
}

function makePitcherCard(overrides: Partial<PlayerCard> & { playerId: string }): PlayerCard {
  return makePlayerCard({
    primaryPosition: 'SP',
    eligiblePositions: ['SP'],
    isPitcher: true,
    pitching: {
      role: 'SP',
      grade: 10,
      stamina: 7,
      era: 3.50,
      whip: 1.20,
      k9: 8.0,
      bb9: 3.0,
      hr9: 1.0,
      usageFlags: [],
      isReliever: false,
    },
    ...overrides,
  });
}

function makeRelieverCard(playerId: string, grade = 8): PlayerCard {
  return makePlayerCard({
    playerId,
    primaryPosition: 'RP',
    eligiblePositions: ['RP'],
    isPitcher: true,
    pitching: {
      role: 'RP',
      grade,
      stamina: 3,
      era: 3.80,
      whip: 1.25,
      k9: 9.0,
      bb9: 3.5,
      hr9: 0.9,
      usageFlags: [],
      isReliever: true,
    },
  });
}

function makeCloserCard(playerId: string, grade = 9): PlayerCard {
  return makePlayerCard({
    playerId,
    primaryPosition: 'CL',
    eligiblePositions: ['CL'],
    isPitcher: true,
    pitching: {
      role: 'CL',
      grade,
      stamina: 2,
      era: 2.80,
      whip: 1.10,
      k9: 10.0,
      bb9: 2.5,
      hr9: 0.8,
      usageFlags: [],
      isReliever: true,
    },
  });
}

function makeLineup(): { playerId: string; playerName: string; position: import('../../../../src/lib/types/player').Position; }[] {
  const positions: import('../../../../src/lib/types/player').Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
  return positions.map((pos, i) => ({
    playerId: `batter-${i}`,
    playerName: `Batter ${i}`,
    position: pos,
  }));
}

function makeBatterCards(): Map<string, PlayerCard> {
  const cards = new Map<string, PlayerCard>();
  for (let i = 0; i < 9; i++) {
    cards.set(`batter-${i}`, makePlayerCard({
      playerId: `batter-${i}`,
      speed: 0.4 + (i * 0.05),
      contactRate: 0.65 + (i * 0.02),
    }));
  }
  return cards;
}

function makeDefaultConfig(seed = 42): RunGameConfig {
  const homeLineup = makeLineup();
  const awayLineup = makeLineup().map((slot) => ({
    ...slot,
    playerId: `away-${slot.playerId}`,
    playerName: `Away ${slot.playerName}`,
  }));

  const homeBatters = makeBatterCards();
  const awayBatters = new Map<string, PlayerCard>();
  for (const [key, card] of homeBatters) {
    const awayId = `away-${key}`;
    awayBatters.set(awayId, { ...card, playerId: awayId });
  }

  return {
    gameId: 'game-1',
    seed,
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    homeLineup,
    awayLineup,
    homeBatterCards: homeBatters,
    awayBatterCards: awayBatters,
    homeStartingPitcher: makePitcherCard({ playerId: 'home-sp' }),
    awayStartingPitcher: makePitcherCard({ playerId: 'away-sp' }),
    homeBullpen: [makeRelieverCard('home-rp1'), makeRelieverCard('home-rp2')],
    awayBullpen: [makeRelieverCard('away-rp1'), makeRelieverCard('away-rp2')],
    homeCloser: makeCloserCard('home-cl'),
    awayCloser: makeCloserCard('away-cl'),
    homeManagerStyle: 'balanced',
    awayManagerStyle: 'balanced',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('game-runner', () => {
  describe('runGame', () => {
    it('completes a full game and returns a valid GameResult', () => {
      const config = makeDefaultConfig();
      const result = runGame(config);

      expect(result.gameId).toBe('game-1');
      expect(result.homeTeamId).toBe('team-home');
      expect(result.awayTeamId).toBe('team-away');
      expect(result.innings).toBeGreaterThanOrEqual(9);
      expect(result.homeScore).toBeGreaterThanOrEqual(0);
      expect(result.awayScore).toBeGreaterThanOrEqual(0);
      // Game must have a winner (no ties)
      expect(result.homeScore).not.toBe(result.awayScore);
    });

    it('produces a valid box score with line score', () => {
      const result = runGame(makeDefaultConfig());

      expect(result.boxScore).toBeDefined();
      expect(result.boxScore.lineScore.away.length).toBeGreaterThanOrEqual(9);
      expect(result.boxScore.lineScore.home.length).toBeGreaterThanOrEqual(0);
      expect(result.boxScore.awayHits).toBeGreaterThanOrEqual(0);
      expect(result.boxScore.homeHits).toBeGreaterThanOrEqual(0);
      expect(result.boxScore.awayErrors).toBeGreaterThanOrEqual(0);
      expect(result.boxScore.homeErrors).toBeGreaterThanOrEqual(0);
    });

    it('generates play-by-play entries', () => {
      const result = runGame(makeDefaultConfig());

      expect(result.playByPlay.length).toBeGreaterThan(0);
      for (const entry of result.playByPlay) {
        expect(entry.inning).toBeGreaterThanOrEqual(1);
        expect(['top', 'bottom']).toContain(entry.halfInning);
        expect(entry.outs).toBeGreaterThanOrEqual(0);
        expect(entry.batterId).toBeDefined();
        expect(entry.pitcherId).toBeDefined();
        expect(entry.outcome).toBeDefined();
      }
    });

    it('produces batting lines for all players who batted', () => {
      const result = runGame(makeDefaultConfig());

      expect(result.playerBattingLines.length).toBeGreaterThan(0);
      // Every batting line should have valid stats
      for (const line of result.playerBattingLines) {
        expect(line.playerId).toBeDefined();
        expect(line.AB).toBeGreaterThanOrEqual(0);
        expect(line.H).toBeLessThanOrEqual(line.AB);
      }
    });

    it('produces pitching lines with decisions assigned', () => {
      const result = runGame(makeDefaultConfig());

      expect(result.playerPitchingLines.length).toBeGreaterThanOrEqual(2);
      expect(result.winningPitcherId).toBeDefined();
      expect(result.losingPitcherId).toBeDefined();

      // There must be exactly one W and one L
      const decisions = result.playerPitchingLines
        .map((l) => l.decision)
        .filter((d) => d !== null);
      expect(decisions).toContain('W');
      expect(decisions).toContain('L');
    });

    it('is deterministic with the same seed (REQ-NFR-007)', () => {
      const config = makeDefaultConfig(12345);
      const result1 = runGame(config);
      const result2 = runGame(config);

      expect(result1.homeScore).toBe(result2.homeScore);
      expect(result1.awayScore).toBe(result2.awayScore);
      expect(result1.innings).toBe(result2.innings);
      expect(result1.winningPitcherId).toBe(result2.winningPitcherId);
      expect(result1.losingPitcherId).toBe(result2.losingPitcherId);
      expect(result1.playByPlay.length).toBe(result2.playByPlay.length);
    });

    it('produces different results with different seeds', () => {
      const result1 = runGame(makeDefaultConfig(100));
      const result2 = runGame(makeDefaultConfig(200));
      const result3 = runGame(makeDefaultConfig(300));

      // At least one pair should differ (statistically near-certain)
      const scores = [
        result1.homeScore + result1.awayScore,
        result2.homeScore + result2.awayScore,
        result3.homeScore + result3.awayScore,
      ];
      const allIdentical = scores.every((s) => s === scores[0]);
      expect(allIdentical).toBe(false);
    });

    it('handles extra innings when tied after 9', () => {
      // Run many games to statistically cover extra innings
      let extraInningsFound = false;
      for (let seed = 1; seed <= 50; seed++) {
        const result = runGame(makeDefaultConfig(seed));
        if (result.innings > 9) {
          extraInningsFound = true;
          expect(result.homeScore).not.toBe(result.awayScore);
          expect(result.boxScore.lineScore.away.length).toBe(result.innings);
          break;
        }
      }
      // Extra innings should occur at least once in 50 games
      expect(extraInningsFound).toBe(true);
    });

    it('totals in line score match final score', () => {
      const result = runGame(makeDefaultConfig());

      const awayLineTotal = result.boxScore.lineScore.away.reduce((a, b) => a + b, 0);
      const homeLineTotal = result.boxScore.lineScore.home.reduce((a, b) => a + b, 0);

      expect(awayLineTotal).toBe(result.awayScore);
      expect(homeLineTotal).toBe(result.homeScore);
    });

    it('hits in box score match sum of batting line hits', () => {
      const result = runGame(makeDefaultConfig());

      // Separate home vs away batting lines
      const homePlayerIds = new Set(
        makeDefaultConfig().homeLineup.map((s) => s.playerId),
      );

      let homeHits = 0;
      let awayHits = 0;
      for (const line of result.playerBattingLines) {
        if (homePlayerIds.has(line.playerId)) {
          homeHits += line.H;
        } else {
          awayHits += line.H;
        }
      }

      expect(homeHits).toBe(result.boxScore.homeHits);
      expect(awayHits).toBe(result.boxScore.awayHits);
    });

    it('uses manager AI for pitching changes', () => {
      // Run games with aggressive manager -- should see more pitcher changes
      let multiPitcherGames = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const config = makeDefaultConfig(seed);
        config.homeManagerStyle = 'aggressive';
        const result = runGame(config);
        const homePitchers = result.playerPitchingLines.filter(
          (l) => l.playerId.startsWith('home-'),
        );
        if (homePitchers.length > 1) {
          multiPitcherGames++;
        }
      }
      // Aggressive managers should pull starters in some games
      expect(multiPitcherGames).toBeGreaterThan(0);
    });

    it('respects walk-off rule (home team wins in bottom of 9th+)', () => {
      let walkoffFound = false;
      for (let seed = 1; seed <= 100; seed++) {
        const result = runGame(makeDefaultConfig(seed));
        if (result.homeScore > result.awayScore) {
          // Home win: last play should be in bottom half
          const lastPlay = result.playByPlay[result.playByPlay.length - 1];
          expect(lastPlay.halfInning).toBe('bottom');
          walkoffFound = true;
          break;
        }
      }
      expect(walkoffFound).toBe(true);
    });

    it('completes in under 500ms per game (REQ-NFR-001)', () => {
      const start = performance.now();
      runGame(makeDefaultConfig());
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500);
    });

    it('handles pitcher exhaustion by using bullpen', () => {
      // Use a pitcher with very low stamina to force bullpen usage
      const config = makeDefaultConfig(42);
      config.homeStartingPitcher = makePitcherCard({
        playerId: 'home-sp',
        pitching: {
          role: 'SP',
          grade: 6,
          stamina: 2, // Very low stamina
          era: 5.50,
          whip: 1.60,
          k9: 5.0,
          bb9: 4.5,
          hr9: 1.5,
          usageFlags: [],
          isReliever: false,
        },
      });

      const result = runGame(config);
      const homePitchers = result.playerPitchingLines.filter(
        (l) => l.playerId.startsWith('home-'),
      );
      expect(homePitchers.length).toBeGreaterThan(1);
    });
  });
});
