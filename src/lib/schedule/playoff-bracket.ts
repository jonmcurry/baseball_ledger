/**
 * Playoff Bracket
 *
 * REQ-LGE-008: 2025 MLB playoff format.
 *
 * Format per league (6 qualifiers):
 *   - 3 division winners (seeds 1-3 by record)
 *   - 3 wild cards (seeds 4-6 by record among non-winners)
 *   - Wild Card Round (BO3): Seed 3 vs 6, Seed 4 vs 5
 *   - Division Series (BO5): Seed 1 vs lowest remaining, Seed 2 vs other
 *   - Championship Series (BO7): DS winners
 *   - World Series (BO7): AL champ vs NL champ
 *
 * Home-field patterns:
 *   BO3: H-A-H
 *   BO5: H-A-A-H-H
 *   BO7: H-A-A-H-H-A-H
 *
 * Adapts for smaller leagues (fewer teams skip WC round).
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import type { TeamSummary, DivisionStandings } from '../types/league';
import type {
  PlayoffBracket,
  PlayoffRound,
  PlayoffSeries,
  PlayoffGame,
  PlayoffTeamSeed,
  PlayoffRoundName,
} from '../types/schedule';
import { computeWinPct } from '../stats/standings';

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/**
 * Seed playoff teams from standings for one league.
 * Division winners get seeds 1-3 (by record), wild cards get remaining seeds.
 */
export function seedPlayoffTeams(
  standings: readonly DivisionStandings[],
  league: 'AL' | 'NL',
): PlayoffTeamSeed[] {
  const leagueStandings = standings.filter((s) => s.leagueDivision === league);

  // Get division winners (first team in each sorted division)
  const divisionWinners: TeamSummary[] = [];
  const nonWinners: TeamSummary[] = [];

  for (const div of leagueStandings) {
    if (div.teams.length > 0) {
      divisionWinners.push(div.teams[0]);
      for (let i = 1; i < div.teams.length; i++) {
        nonWinners.push(div.teams[i]);
      }
    }
  }

  // Sort division winners by record (best first)
  divisionWinners.sort((a, b) => {
    const wpDiff = computeWinPct(b.wins, b.losses) - computeWinPct(a.wins, a.losses);
    if (Math.abs(wpDiff) > 0.0001) return wpDiff;
    return (b.runsScored - b.runsAllowed) - (a.runsScored - a.runsAllowed);
  });

  // Sort non-winners by record for wild card selection
  nonWinners.sort((a, b) => {
    const wpDiff = computeWinPct(b.wins, b.losses) - computeWinPct(a.wins, a.losses);
    if (Math.abs(wpDiff) > 0.0001) return wpDiff;
    return (b.runsScored - b.runsAllowed) - (a.runsScored - a.runsAllowed);
  });

  // Determine wild card slots: total teams - division winners, capped at 3
  const wcSlots = Math.min(3, nonWinners.length);
  const wildCards = nonWinners.slice(0, wcSlots);

  // Build seed list
  const seeds: PlayoffTeamSeed[] = [];
  let seedNum = 1;

  for (const team of divisionWinners) {
    seeds.push({
      teamId: team.id,
      seed: seedNum++,
      record: { wins: team.wins, losses: team.losses },
    });
  }

  for (const team of wildCards) {
    seeds.push({
      teamId: team.id,
      seed: seedNum++,
      record: { wins: team.wins, losses: team.losses },
    });
  }

  return seeds;
}

// ---------------------------------------------------------------------------
// Home-Field Schedule
// ---------------------------------------------------------------------------

/**
 * Get the home team for each game in a series.
 * @returns Array of team IDs (higher or lower) for each game.
 */
export function getHomeFieldSchedule(
  higherSeedId: string,
  lowerSeedId: string,
  bestOf: 3 | 5 | 7,
): string[] {
  const h = higherSeedId;
  const a = lowerSeedId;

  switch (bestOf) {
    case 3: return [h, a, h];
    case 5: return [h, a, a, h, h];
    case 7: return [h, a, a, h, h, a, h];
  }
}

// ---------------------------------------------------------------------------
// Bracket Generation
// ---------------------------------------------------------------------------

let seriesIdCounter = 0;

function makeSeriesId(round: string, idx: number): string {
  seriesIdCounter++;
  return `series-${round}-${idx}-${seriesIdCounter}`;
}

function createEmptySeries(
  round: PlayoffRoundName,
  leagueDivision: 'AL' | 'NL' | 'MLB',
  bestOf: 3 | 5 | 7,
  higherSeed: PlayoffTeamSeed | null,
  lowerSeed: PlayoffTeamSeed | null,
  seriesIdx: number,
): PlayoffSeries {
  return {
    id: makeSeriesId(round, seriesIdx),
    round,
    leagueDivision,
    higherSeed,
    lowerSeed,
    bestOf,
    games: [],
    higherSeedWins: 0,
    lowerSeedWins: 0,
    isComplete: false,
    winnerId: null,
  };
}

/**
 * Generate a full playoff bracket for one league.
 * Uses 2025 MLB format with adaptation for smaller leagues.
 */
export function generatePlayoffBracket(
  leagueId: string,
  standings: readonly DivisionStandings[],
  league: 'AL' | 'NL',
): PlayoffBracket {
  seriesIdCounter = 0;
  const seeds = seedPlayoffTeams(standings, league);
  const rounds: PlayoffRound[] = [];

  if (seeds.length >= 6) {
    // Full format: WC + DS + CS + WS
    rounds.push(createWildCardRound(seeds, league));
    rounds.push(createDivisionSeriesRound(seeds, league));
    rounds.push(createChampionshipSeriesRound(league));
    rounds.push(createWorldSeriesRound());
  } else if (seeds.length >= 4) {
    // Smaller league: skip WC, go straight to DS-like round
    rounds.push(createSmallDivisionSeriesRound(seeds, league));
    rounds.push(createChampionshipSeriesRound(league));
    rounds.push(createWorldSeriesRound());
  } else if (seeds.length >= 2) {
    // Minimal: just a championship
    rounds.push({
      name: 'ChampionshipSeries',
      bestOf: 7,
      series: [createEmptySeries('ChampionshipSeries', league, 7, seeds[0], seeds[1], 0)],
    });
    rounds.push(createWorldSeriesRound());
  }

  return {
    leagueId,
    rounds,
    championId: null,
  };
}

function createWildCardRound(
  seeds: PlayoffTeamSeed[],
  league: 'AL' | 'NL',
): PlayoffRound {
  return {
    name: 'WildCard',
    bestOf: 3,
    series: [
      // Seed 3 vs Seed 6
      createEmptySeries('WildCard', league, 3, seeds[2], seeds[5], 0),
      // Seed 4 vs Seed 5
      createEmptySeries('WildCard', league, 3, seeds[3], seeds[4], 1),
    ],
  };
}

function createDivisionSeriesRound(
  seeds: PlayoffTeamSeed[],
  league: 'AL' | 'NL',
): PlayoffRound {
  // Seeds 1 and 2 get byes. Lower seeds TBD from WC winners.
  // Seed 1 vs lowest remaining WC winner, Seed 2 vs other WC winner
  // For now, pre-seed the higher seeds; lower seeds are null (TBD).
  return {
    name: 'DivisionSeries',
    bestOf: 5,
    series: [
      createEmptySeries('DivisionSeries', league, 5, seeds[0], null, 0),
      createEmptySeries('DivisionSeries', league, 5, seeds[1], null, 1),
    ],
  };
}

function createSmallDivisionSeriesRound(
  seeds: PlayoffTeamSeed[],
  league: 'AL' | 'NL',
): PlayoffRound {
  return {
    name: 'DivisionSeries',
    bestOf: 5,
    series: [
      createEmptySeries('DivisionSeries', league, 5, seeds[0], seeds[3], 0),
      createEmptySeries('DivisionSeries', league, 5, seeds[1], seeds[2], 1),
    ],
  };
}

function createChampionshipSeriesRound(league: 'AL' | 'NL'): PlayoffRound {
  return {
    name: 'ChampionshipSeries',
    bestOf: 7,
    series: [createEmptySeries('ChampionshipSeries', league, 7, null, null, 0)],
  };
}

function createWorldSeriesRound(): PlayoffRound {
  return {
    name: 'WorldSeries',
    bestOf: 7,
    series: [createEmptySeries('WorldSeries', 'MLB', 7, null, null, 0)],
  };
}

// ---------------------------------------------------------------------------
// Game Result Recording
// ---------------------------------------------------------------------------

/**
 * Record a playoff game result. Returns a new bracket (immutable).
 * Determines winner based on home-field schedule and updates series wins.
 * When a series is clinched, sets winnerId and isComplete.
 */
export function recordPlayoffGameResult(
  bracket: PlayoffBracket,
  seriesId: string,
  gameNumber: number,
  homeScore: number,
  awayScore: number,
): PlayoffBracket {
  const newRounds = bracket.rounds.map((round) => ({
    ...round,
    series: round.series.map((series) => {
      if (series.id !== seriesId) return { ...series };
      return updateSeriesWithResult(series, gameNumber, homeScore, awayScore);
    }),
  }));

  return {
    ...bracket,
    rounds: newRounds,
  };
}

function updateSeriesWithResult(
  series: PlayoffSeries,
  gameNumber: number,
  homeScore: number,
  awayScore: number,
): PlayoffSeries {
  if (!series.higherSeed || !series.lowerSeed) {
    return { ...series };
  }

  const homeSchedule = getHomeFieldSchedule(
    series.higherSeed.teamId,
    series.lowerSeed.teamId,
    series.bestOf,
  );

  const homeTeamForGame = homeSchedule[gameNumber - 1];
  const higherSeedIsHome = homeTeamForGame === series.higherSeed.teamId;

  // Determine who won
  const homeWon = homeScore > awayScore;
  const higherSeedWon = higherSeedIsHome ? homeWon : !homeWon;

  // Create or update game entry
  const newGames: PlayoffGame[] = [...series.games];
  const existingIdx = newGames.findIndex((g) => g.gameNumber === gameNumber);

  const gameEntry: PlayoffGame = {
    gameNumber,
    homeTeamId: homeTeamForGame,
    awayTeamId: homeTeamForGame === series.higherSeed.teamId
      ? series.lowerSeed.teamId
      : series.higherSeed.teamId,
    homeScore,
    awayScore,
    isComplete: true,
  };

  if (existingIdx >= 0) {
    newGames[existingIdx] = gameEntry;
  } else {
    newGames.push(gameEntry);
  }

  const newHigherWins = series.higherSeedWins + (higherSeedWon ? 1 : 0);
  const newLowerWins = series.lowerSeedWins + (higherSeedWon ? 0 : 1);
  const winsNeeded = Math.ceil(series.bestOf / 2);
  const isComplete = newHigherWins >= winsNeeded || newLowerWins >= winsNeeded;

  let winnerId: string | null = null;
  if (isComplete) {
    winnerId = newHigherWins >= winsNeeded
      ? series.higherSeed.teamId
      : series.lowerSeed.teamId;
  }

  return {
    ...series,
    games: newGames,
    higherSeedWins: newHigherWins,
    lowerSeedWins: newLowerWins,
    isComplete,
    winnerId,
  };
}

// ---------------------------------------------------------------------------
// Next Game Finder
// ---------------------------------------------------------------------------

export interface NextPlayoffGame {
  seriesId: string;
  round: PlayoffRoundName;
  gameNumber: number;
  homeTeamId: string;
  awayTeamId: string;
}

/**
 * Find the next unplayed game in the bracket.
 * Returns null if all series are complete.
 */
export function getNextPlayoffGame(bracket: PlayoffBracket): NextPlayoffGame | null {
  for (const round of bracket.rounds) {
    for (const series of round.series) {
      if (series.isComplete) continue;
      if (!series.higherSeed || !series.lowerSeed) continue;

      const homeSchedule = getHomeFieldSchedule(
        series.higherSeed.teamId,
        series.lowerSeed.teamId,
        series.bestOf,
      );

      const nextGameNum = series.games.filter((g) => g.isComplete).length + 1;
      if (nextGameNum > series.bestOf) continue;

      const homeTeam = homeSchedule[nextGameNum - 1];
      const awayTeam = homeTeam === series.higherSeed.teamId
        ? series.lowerSeed.teamId
        : series.higherSeed.teamId;

      return {
        seriesId: series.id,
        round: round.name,
        gameNumber: nextGameNum,
        homeTeamId: homeTeam,
        awayTeamId: awayTeam,
      };
    }
  }

  return null;
}
