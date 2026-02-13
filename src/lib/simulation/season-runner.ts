/**
 * Season Runner - Bulk Simulation with Day Batching
 *
 * REQ-NFR-010: Day-batched bulk simulation with memory release.
 * REQ-NFR-002: Full season < 60s target.
 *
 * Provides `runDay()` for single-day batch execution and `runSeason()`
 * for multi-day iteration. After each day completes, play-by-play data
 * is stripped from results to prevent memory accumulation across 1,296+
 * games (REQ-NFR-010). Only box scores and cumulative stat updates are
 * retained in-flight.
 *
 * Layer 1: Pure logic, no I/O, deterministic given seed.
 */

import type { GameResult, BattingLine, PitchingLine, BoxScore, PlayByPlayEntry } from '../types/game';
import type { PlayerCard, Position } from '../types/player';
import type { ManagerStyle } from './manager-profiles';
import { runGame } from './game-runner';
import type { RunGameConfig } from './game-runner';
import { SeededRNG } from '../rng/seeded-rng';

/**
 * A scheduled game with team rosters needed to simulate.
 */
export interface DayGameConfig {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeLineup: { playerId: string; playerName: string; position: Position }[];
  awayLineup: { playerId: string; playerName: string; position: Position }[];
  homeBatterCards: Map<string, PlayerCard>;
  awayBatterCards: Map<string, PlayerCard>;
  homeStartingPitcher: PlayerCard;
  awayStartingPitcher: PlayerCard;
  homeBullpen: PlayerCard[];
  awayBullpen: PlayerCard[];
  homeCloser: PlayerCard | null;
  awayCloser: PlayerCard | null;
  homeManagerStyle: ManagerStyle;
  awayManagerStyle: ManagerStyle;
}

/**
 * A game result retained after simulation. Box score and play-by-play are
 * kept for single-day server-side simulation (needed for game_logs persistence)
 * but may be stripped for bulk multi-day simulation to save memory (REQ-NFR-010).
 */
export interface CompactGameResult {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  innings: number;
  winningPitcherId: string;
  losingPitcherId: string;
  savePitcherId: string | null;
  playerBattingLines: BattingLine[];
  playerPitchingLines: PitchingLine[];
  boxScore: BoxScore;
  playByPlay: PlayByPlayEntry[];
}

/**
 * Result of simulating one day's games.
 */
export interface DayResult {
  dayNumber: number;
  games: CompactGameResult[];
}

/**
 * Result of simulating multiple days.
 */
export interface SeasonResult {
  dayResults: DayResult[];
  totalGamesPlayed: number;
}

/**
 * Convert a full GameResult to a CompactGameResult, dropping only
 * playerNames (not needed for persistence). Box score and play-by-play
 * are retained for game_logs persistence.
 *
 * For bulk multi-day simulation (runSeason), play-by-play is stripped
 * after the day callback to release memory per REQ-NFR-010.
 */
function compactResult(result: GameResult): CompactGameResult {
  return {
    gameId: result.gameId,
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    innings: result.innings,
    winningPitcherId: result.winningPitcherId,
    losingPitcherId: result.losingPitcherId,
    savePitcherId: result.savePitcherId,
    playerBattingLines: result.playerBattingLines,
    playerPitchingLines: result.playerPitchingLines,
    boxScore: result.boxScore,
    playByPlay: result.playByPlay,
  };
}

/**
 * Run all games for a single day.
 *
 * Each game gets a unique seed derived from the base seed and game index
 * to ensure determinism while keeping games independent.
 *
 * @param dayNumber - The day number (1-based)
 * @param games - Game configurations for this day
 * @param baseSeed - Base seed for RNG (combined with game index for per-game seed)
 * @returns DayResult with compact game results (no play-by-play)
 */
export function runDay(
  dayNumber: number,
  games: DayGameConfig[],
  baseSeed: number,
): DayResult {
  const dayRng = new SeededRNG(baseSeed + dayNumber * 1000);
  const results: CompactGameResult[] = [];

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const gameSeed = dayRng.nextInt(1, 2147483647);

    const config: RunGameConfig = {
      gameId: game.gameId,
      seed: gameSeed,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeLineup: game.homeLineup,
      awayLineup: game.awayLineup,
      homeBatterCards: game.homeBatterCards,
      awayBatterCards: game.awayBatterCards,
      homeStartingPitcher: game.homeStartingPitcher,
      awayStartingPitcher: game.awayStartingPitcher,
      homeBullpen: game.homeBullpen,
      awayBullpen: game.awayBullpen,
      homeCloser: game.homeCloser,
      awayCloser: game.awayCloser,
      homeManagerStyle: game.homeManagerStyle,
      awayManagerStyle: game.awayManagerStyle,
    };

    const fullResult = runGame(config);
    // Strip play-by-play immediately per REQ-NFR-010
    results.push(compactResult(fullResult));
  }

  return { dayNumber, games: results };
}

/**
 * Run simulation for a range of days.
 *
 * Per REQ-NFR-010: processes one day at a time, releasing play-by-play
 * after each day. Only compact results (box scores + stat lines) are
 * accumulated.
 *
 * @param dayConfigs - Map of day number -> game configurations
 * @param startDay - First day to simulate (inclusive)
 * @param endDay - Last day to simulate (inclusive)
 * @param baseSeed - Base seed for deterministic simulation
 * @param onDayComplete - Optional callback after each day (for progress reporting)
 * @returns SeasonResult with all day results
 */
export function runSeason(
  dayConfigs: Map<number, DayGameConfig[]>,
  startDay: number,
  endDay: number,
  baseSeed: number,
  onDayComplete?: (dayResult: DayResult, daysCompleted: number, totalDays: number) => void,
): SeasonResult {
  const totalDays = endDay - startDay + 1;
  const dayResults: DayResult[] = [];
  let totalGamesPlayed = 0;

  for (let day = startDay; day <= endDay; day++) {
    const games = dayConfigs.get(day);
    if (!games || games.length === 0) continue;

    const dayResult = runDay(day, games, baseSeed);
    dayResults.push(dayResult);
    totalGamesPlayed += dayResult.games.length;

    if (onDayComplete) {
      onDayComplete(dayResult, dayResults.length, totalDays);
    }
  }

  return { dayResults, totalGamesPlayed };
}
