/**
 * Tests for Season Runner (Bulk Simulation)
 *
 * REQ-NFR-010: Day-batched bulk simulation with memory release.
 * REQ-NFR-002: Full season < 60s target (benchmark verifies).
 * REQ-NFR-007: Deterministic seeded RNG.
 */

import type { PlayerCard, Position } from '../../../../src/lib/types/player';
import { runDay, runSeason } from '../../../../src/lib/simulation/season-runner';
import type { DayGameConfig, DayResult } from '../../../../src/lib/simulation/season-runner';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Realistic 35-byte card with mix of hits, outs, BB, K. */
function makeRealisticCard(): number[] {
  const card = new Array(35).fill(0);
  card[0] = 30; card[2] = 28; card[5] = 27; card[10] = 26; card[12] = 31;
  card[17] = 29; card[22] = 25; card[24] = 32; card[31] = 35;
  const variable = [7, 8, 1, 0, 9, 13, 13, 14, 14, 14, 14, 21,
    30, 26, 31, 24, 30, 26, 31, 24, 30, 26, 31, 24, 30, 26];
  const structuralSet = new Set([0, 2, 5, 10, 12, 17, 22, 24, 31]);
  let vi = 0;
  for (let i = 0; i < 35; i++) {
    if (!structuralSet.has(i)) card[i] = variable[vi++];
  }
  return card;
}

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
    card: makeRealisticCard(),
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

function makePitcherCard(playerId: string, role: 'SP' | 'RP' | 'CL' = 'SP'): PlayerCard {
  return makePlayerCard({
    playerId,
    primaryPosition: role,
    eligiblePositions: [role],
    isPitcher: true,
    pitching: {
      role,
      grade: role === 'CL' ? 9 : role === 'SP' ? 10 : 8,
      stamina: role === 'SP' ? 7 : role === 'CL' ? 2 : 3,
      era: 3.50,
      whip: 1.20,
      k9: 8.0,
      bb9: 3.0,
      hr9: 1.0,
      usageFlags: [],
      isReliever: role !== 'SP',
    },
  });
}

function makeLineup(prefix: string): { playerId: string; playerName: string; position: Position }[] {
  const positions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
  return positions.map((pos, i) => ({
    playerId: `${prefix}-batter-${i}`,
    playerName: `${prefix} Batter ${i}`,
    position: pos,
  }));
}

function makeBatterCards(prefix: string): Map<string, PlayerCard> {
  const cards = new Map<string, PlayerCard>();
  for (let i = 0; i < 9; i++) {
    cards.set(`${prefix}-batter-${i}`, makePlayerCard({
      playerId: `${prefix}-batter-${i}`,
    }));
  }
  return cards;
}

function makeDayGameConfig(homePrefix: string, awayPrefix: string, gameId: string): DayGameConfig {
  return {
    gameId,
    homeTeamId: `${homePrefix}-team`,
    awayTeamId: `${awayPrefix}-team`,
    homeLineup: makeLineup(homePrefix),
    awayLineup: makeLineup(awayPrefix),
    homeBatterCards: makeBatterCards(homePrefix),
    awayBatterCards: makeBatterCards(awayPrefix),
    homeStartingPitcher: makePitcherCard(`${homePrefix}-sp`),
    awayStartingPitcher: makePitcherCard(`${awayPrefix}-sp`),
    homeBullpen: [makePitcherCard(`${homePrefix}-rp1`, 'RP'), makePitcherCard(`${homePrefix}-rp2`, 'RP')],
    awayBullpen: [makePitcherCard(`${awayPrefix}-rp1`, 'RP'), makePitcherCard(`${awayPrefix}-rp2`, 'RP')],
    homeCloser: makePitcherCard(`${homePrefix}-cl`, 'CL'),
    awayCloser: makePitcherCard(`${awayPrefix}-cl`, 'CL'),
    homeManagerStyle: 'balanced',
    awayManagerStyle: 'balanced',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('season-runner', () => {
  describe('runDay', () => {
    it('simulates all games for a single day', () => {
      const games = [
        makeDayGameConfig('teamA', 'teamB', 'game-1'),
        makeDayGameConfig('teamC', 'teamD', 'game-2'),
      ];

      const result = runDay(1, games, 42);

      expect(result.dayNumber).toBe(1);
      expect(result.games).toHaveLength(2);
      expect(result.games[0].gameId).toBe('game-1');
      expect(result.games[1].gameId).toBe('game-2');
    });

    it('returns compact results with box score and play-by-play', () => {
      const games = [makeDayGameConfig('teamA', 'teamB', 'game-1')];
      const result = runDay(1, games, 42);

      const game = result.games[0];
      // CompactGameResult retains boxScore and playByPlay for persistence
      expect(game).toHaveProperty('playByPlay');
      expect(game).toHaveProperty('boxScore');
      // Home line score may be 8 if home team wins after top of 9th (bottom skipped)
      expect(game.boxScore.lineScore.home.length).toBeGreaterThanOrEqual(8);
      expect(game.playByPlay.length).toBeGreaterThan(0);
      // And should have scores and stat lines
      expect(game.homeScore).toBeGreaterThanOrEqual(0);
      expect(game.awayScore).toBeGreaterThanOrEqual(0);
      expect(game.playerBattingLines.length).toBeGreaterThan(0);
      expect(game.playerPitchingLines.length).toBeGreaterThanOrEqual(2);
    });

    it('each game has a winner', () => {
      const games = [
        makeDayGameConfig('teamA', 'teamB', 'game-1'),
        makeDayGameConfig('teamC', 'teamD', 'game-2'),
        makeDayGameConfig('teamE', 'teamF', 'game-3'),
      ];

      const result = runDay(1, games, 42);

      for (const game of result.games) {
        expect(game.homeScore).not.toBe(game.awayScore);
        expect(game.winningPitcherId).toBeTruthy();
        expect(game.losingPitcherId).toBeTruthy();
      }
    });

    it('is deterministic with the same seed', () => {
      const games = [
        makeDayGameConfig('teamA', 'teamB', 'game-1'),
        makeDayGameConfig('teamC', 'teamD', 'game-2'),
      ];

      const result1 = runDay(1, games, 42);
      const result2 = runDay(1, games, 42);

      expect(result1.games[0].homeScore).toBe(result2.games[0].homeScore);
      expect(result1.games[0].awayScore).toBe(result2.games[0].awayScore);
      expect(result1.games[1].homeScore).toBe(result2.games[1].homeScore);
      expect(result1.games[1].awayScore).toBe(result2.games[1].awayScore);
    });

    it('produces different results with different seeds', () => {
      const games = [makeDayGameConfig('teamA', 'teamB', 'game-1')];

      const results = [];
      for (let seed = 1; seed <= 10; seed++) {
        results.push(runDay(1, games, seed));
      }

      const totalScores = results.map((r) => r.games[0].homeScore + r.games[0].awayScore);
      const allSame = totalScores.every((s) => s === totalScores[0]);
      expect(allSame).toBe(false);
    });

    it('handles empty game list', () => {
      const result = runDay(1, [], 42);

      expect(result.dayNumber).toBe(1);
      expect(result.games).toHaveLength(0);
    });
  });

  describe('runSeason', () => {
    it('simulates multiple days', () => {
      const dayConfigs = new Map<number, DayGameConfig[]>();
      dayConfigs.set(1, [makeDayGameConfig('teamA', 'teamB', 'day1-game1')]);
      dayConfigs.set(2, [makeDayGameConfig('teamC', 'teamD', 'day2-game1')]);
      dayConfigs.set(3, [makeDayGameConfig('teamE', 'teamF', 'day3-game1')]);

      const result = runSeason(dayConfigs, 1, 3, 42);

      expect(result.dayResults).toHaveLength(3);
      expect(result.totalGamesPlayed).toBe(3);
    });

    it('calls onDayComplete callback for each day', () => {
      const dayConfigs = new Map<number, DayGameConfig[]>();
      dayConfigs.set(1, [makeDayGameConfig('teamA', 'teamB', 'g1')]);
      dayConfigs.set(2, [makeDayGameConfig('teamC', 'teamD', 'g2')]);

      const completedDays: number[] = [];
      runSeason(dayConfigs, 1, 2, 42, (dayResult, completed, total) => {
        completedDays.push(dayResult.dayNumber);
        expect(total).toBe(2);
        expect(completed).toBe(completedDays.length);
      });

      expect(completedDays).toEqual([1, 2]);
    });

    it('skips days with no games', () => {
      const dayConfigs = new Map<number, DayGameConfig[]>();
      dayConfigs.set(1, [makeDayGameConfig('teamA', 'teamB', 'g1')]);
      // Day 2 has no games
      dayConfigs.set(3, [makeDayGameConfig('teamC', 'teamD', 'g3')]);

      const result = runSeason(dayConfigs, 1, 3, 42);

      expect(result.dayResults).toHaveLength(2);
      expect(result.totalGamesPlayed).toBe(2);
    });

    it('is deterministic across full season run', () => {
      const dayConfigs = new Map<number, DayGameConfig[]>();
      dayConfigs.set(1, [
        makeDayGameConfig('teamA', 'teamB', 'g1'),
        makeDayGameConfig('teamC', 'teamD', 'g2'),
      ]);
      dayConfigs.set(2, [
        makeDayGameConfig('teamE', 'teamF', 'g3'),
      ]);

      const result1 = runSeason(dayConfigs, 1, 2, 12345);
      const result2 = runSeason(dayConfigs, 1, 2, 12345);

      expect(result1.totalGamesPlayed).toBe(result2.totalGamesPlayed);
      for (let d = 0; d < result1.dayResults.length; d++) {
        for (let g = 0; g < result1.dayResults[d].games.length; g++) {
          expect(result1.dayResults[d].games[g].homeScore).toBe(result2.dayResults[d].games[g].homeScore);
          expect(result1.dayResults[d].games[g].awayScore).toBe(result2.dayResults[d].games[g].awayScore);
        }
      }
    });

    it('supports partial season range', () => {
      const dayConfigs = new Map<number, DayGameConfig[]>();
      for (let d = 1; d <= 5; d++) {
        dayConfigs.set(d, [makeDayGameConfig('teamA', 'teamB', `day${d}-g1`)]);
      }

      // Simulate only days 3-5
      const result = runSeason(dayConfigs, 3, 5, 42);

      expect(result.dayResults).toHaveLength(3);
      expect(result.dayResults[0].dayNumber).toBe(3);
      expect(result.dayResults[2].dayNumber).toBe(5);
    });
  });
});
