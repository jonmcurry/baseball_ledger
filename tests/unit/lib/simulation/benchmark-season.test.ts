/**
 * Benchmark test: Full season simulation performance (REQ-NFR-002)
 *
 * Verifies that a full season of ~1,296 games completes within 60 seconds.
 * Per REQ-TEST-013, benchmark tests are non-blocking (report-only).
 * The 60s threshold is a soft assertion; CI environments may vary.
 *
 * Layer 1: Pure simulation, no I/O.
 */

import type { PlayerCard, Position } from '../../../../src/lib/types/player';
import { runSeason } from '../../../../src/lib/simulation/season-runner';
import type { DayGameConfig } from '../../../../src/lib/simulation/season-runner';
import { generateApbaCard, generatePitcherApbaCard } from '../../../../src/lib/card-generator/apba-card-generator';
import type { PlayerRates } from '../../../../src/lib/card-generator/rate-calculator';

const DEFAULT_RATES: PlayerRates = {
  PA: 600, walkRate: 0.09, strikeoutRate: 0.17, homeRunRate: 0.035,
  singleRate: 0.165, doubleRate: 0.045, tripleRate: 0.005, sbRate: 0.30,
  iso: 0.160, hbpRate: 0.01, sfRate: 0.01, shRate: 0, gdpRate: 0.02,
};
const DEFAULT_APBA_CARD = generateApbaCard(DEFAULT_RATES, { byte33: 7, byte34: 0 });
const PITCHER_APBA_CARD = generatePitcherApbaCard();

// ---------------------------------------------------------------------------
// Test Helpers (minimal cards for throughput testing)
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
    apbaCard: DEFAULT_APBA_CARD,
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
    apbaCard: PITCHER_APBA_CARD,
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
    playerId: `${prefix}-b${i}`,
    playerName: `${prefix} B${i}`,
    position: pos,
  }));
}

function makeBatterCards(prefix: string): Map<string, PlayerCard> {
  const cards = new Map<string, PlayerCard>();
  for (let i = 0; i < 9; i++) {
    cards.set(`${prefix}-b${i}`, makePlayerCard({ playerId: `${prefix}-b${i}` }));
  }
  return cards;
}

// Pre-build team data to avoid repeated allocation in the schedule loop
const TEAM_COUNT = 16;
const TEAMS = Array.from({ length: TEAM_COUNT }, (_, i) => {
  const prefix = `t${i}`;
  return {
    id: prefix,
    lineup: makeLineup(prefix),
    batterCards: makeBatterCards(prefix),
    sp: makePitcherCard(`${prefix}-sp`),
    bullpen: [makePitcherCard(`${prefix}-rp1`, 'RP'), makePitcherCard(`${prefix}-rp2`, 'RP')],
    closer: makePitcherCard(`${prefix}-cl`, 'CL'),
  };
});

function makeMatchup(homeIdx: number, awayIdx: number, gameId: string): DayGameConfig {
  const home = TEAMS[homeIdx];
  const away = TEAMS[awayIdx];
  return {
    gameId,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeLineup: home.lineup,
    awayLineup: away.lineup,
    homeBatterCards: home.batterCards,
    awayBatterCards: away.batterCards,
    homeStartingPitcher: home.sp,
    awayStartingPitcher: away.sp,
    homeBullpen: home.bullpen,
    awayBullpen: away.bullpen,
    homeCloser: home.closer,
    awayCloser: away.closer,
    homeManagerStyle: 'balanced',
    awayManagerStyle: 'balanced',
  };
}

/**
 * Build a simplified 162-day schedule for 16 teams.
 * Each day has 8 games (16 teams / 2). Matchups rotate via round-robin.
 * Total: 162 days x 8 games = 1,296 games.
 */
function buildSeasonSchedule(): Map<number, DayGameConfig[]> {
  const schedule = new Map<number, DayGameConfig[]>();

  for (let day = 1; day <= 162; day++) {
    const games: DayGameConfig[] = [];
    for (let g = 0; g < 8; g++) {
      const homeIdx = g;
      const awayIdx = ((g + day) % (TEAM_COUNT - 1)) + 1;
      // Avoid self-matchups
      const safeAway = awayIdx === homeIdx ? (awayIdx + 1) % TEAM_COUNT : awayIdx;
      games.push(makeMatchup(homeIdx, safeAway, `d${day}-g${g}`));
    }
    schedule.set(day, games);
  }

  return schedule;
}

// ---------------------------------------------------------------------------
// Benchmark Test
// ---------------------------------------------------------------------------

describe('REQ-NFR-002: Full season simulation benchmark', () => {
  it('simulates 1,296 games (162 days x 8 games) and reports elapsed time', () => {
    const schedule = buildSeasonSchedule();

    const start = performance.now();
    const result = runSeason(schedule, 1, 162, 2024);
    const elapsed = performance.now() - start;

    const elapsedSeconds = elapsed / 1000;
    const gamesPerSecond = result.totalGamesPlayed / elapsedSeconds;

    // Report results (always logged regardless of pass/fail)
    console.log(`[REQ-NFR-002 Benchmark]`);
    console.log(`  Games simulated: ${result.totalGamesPlayed}`);
    console.log(`  Elapsed: ${elapsedSeconds.toFixed(2)}s`);
    console.log(`  Throughput: ${gamesPerSecond.toFixed(1)} games/sec`);
    console.log(`  Target: < 60s`);

    // Verify all games completed
    expect(result.totalGamesPlayed).toBe(1296);
    expect(result.dayResults).toHaveLength(162);

    // Soft assertion: 60s target per REQ-NFR-002
    // Per REQ-TEST-013, this is report-only and non-blocking in CI.
    // We use a generous 60s threshold; local machines are typically much faster.
    expect(elapsedSeconds).toBeLessThan(60);
  });
});
