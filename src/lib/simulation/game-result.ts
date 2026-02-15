/**
 * Game Result & Box Score Module
 *
 * REQ-SIM-016: Post-game output generation.
 *
 * Builds the final GameResult after a game completes, including:
 * - Box score with line score and hit/error totals
 * - Per-player batting lines and pitching lines
 * - Pitcher decision assignment (W/L/SV)
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { BoxScore, BattingLine, PitchingLine } from '../types/game';

/** Minimum innings pitched for a starter to qualify for a win */
const STARTER_WIN_MIN_IP = 5;

/** Maximum lead for a save opportunity */
const SAVE_MAX_LEAD = 3;

/** Minimum innings pitched by closer/reliever for a save */
const SAVE_MIN_IP = 1;

/**
 * Per-half-inning run totals used to build the line score.
 */
export interface InningRuns {
  inning: number;
  halfInning: 'top' | 'bottom';
  runs: number;
}

/**
 * Extended pitching line with metadata for decision assignment.
 */
export interface PitchingLineWithMeta extends PitchingLine {
  isStarter: boolean;
  teamSide: 'home' | 'away';
}

/**
 * Build the line score from per-half-inning run data.
 *
 * Returns arrays of runs per inning for each team.
 */
export function buildLineScore(
  inningRuns: InningRuns[],
  totalInnings: number,
): { away: number[]; home: number[] } {
  const away: number[] = new Array(totalInnings).fill(0);
  const home: number[] = [];

  for (const entry of inningRuns) {
    const idx = entry.inning - 1;
    if (entry.halfInning === 'top') {
      away[idx] = entry.runs;
    } else {
      // Expand home array as needed
      while (home.length <= idx) {
        home.push(0);
      }
      home[idx] = entry.runs;
    }
  }

  return { away, home };
}

/**
 * Build the box score summary.
 */
export function buildBoxScore(
  lineScore: { away: number[]; home: number[] },
  awayHits: number,
  homeHits: number,
  awayErrors: number,
  homeErrors: number,
): BoxScore {
  return {
    lineScore,
    awayHits,
    homeHits,
    awayErrors,
    homeErrors,
  };
}

/**
 * Assign pitcher decisions (W, L, SV) based on MLB rules.
 *
 * Rules:
 * - Winning team's starter gets W if they pitched 5+ innings
 * - If starter pitched < 5 IP, the reliever with the most IP on the
 *   winning team gets the W
 * - Losing team's starter gets the L (simplified; in MLB it's the
 *   pitcher who gave up the go-ahead run)
 * - Save: non-winning pitcher on winning team who finished the game
 *   AND final lead was <= 3 runs AND pitched at least 1 inning
 *
 * @param lines - All pitching lines with metadata
 * @param homeScore - Final home score
 * @param awayScore - Final away score
 */
export function assignPitcherDecisions(
  lines: PitchingLineWithMeta[],
  homeScore: number,
  awayScore: number,
): PitchingLineWithMeta[] {
  const winningSide = homeScore > awayScore ? 'home' : 'away';
  const losingSide = winningSide === 'home' ? 'away' : 'home';
  const lead = Math.abs(homeScore - awayScore);

  const result = lines.map((l) => ({ ...l }));

  // Find winning team pitchers
  const winningPitchers = result.filter((l) => l.teamSide === winningSide);
  const losingPitchers = result.filter((l) => l.teamSide === losingSide);

  // Assign Win
  const winStarter = winningPitchers.find((l) => l.isStarter);
  if (winStarter && winStarter.IP >= STARTER_WIN_MIN_IP) {
    winStarter.decision = 'W';
  } else {
    // Reliever with most IP gets the W
    const relievers = winningPitchers
      .filter((l) => !l.isStarter)
      .sort((a, b) => b.IP - a.IP);
    if (relievers.length > 0) {
      relievers[0].decision = 'W';
    }
  }

  // Assign Loss (starter of losing team, simplified)
  const loseStarter = losingPitchers.find((l) => l.isStarter);
  if (loseStarter) {
    loseStarter.decision = 'L';
  }

  // Assign Save
  const winnerWithDecision = result.find((l) => l.decision === 'W');
  if (lead <= SAVE_MAX_LEAD) {
    // Last pitcher on winning team who isn't the winner
    const finisher = winningPitchers
      .filter((l) => l !== winnerWithDecision && l.IP >= SAVE_MIN_IP)
      .pop();
    if (finisher) {
      finisher.decision = 'SV';
    }
  }

  return result;
}

/**
 * Create an empty batting line for a player.
 */
export function buildEmptyBattingLine(
  playerId: string,
  playerName?: string,
  teamSide?: 'home' | 'away',
): BattingLine {
  return {
    playerId,
    playerName,
    teamSide,
    AB: 0,
    R: 0,
    H: 0,
    doubles: 0,
    triples: 0,
    HR: 0,
    RBI: 0,
    BB: 0,
    SO: 0,
    SB: 0,
    CS: 0,
    HBP: 0,
    SF: 0,
  };
}

/**
 * Create an empty pitching line for a pitcher.
 */
export function buildEmptyPitchingLine(playerId: string): PitchingLine {
  return {
    playerId,
    IP: 0,
    H: 0,
    R: 0,
    ER: 0,
    BB: 0,
    SO: 0,
    HR: 0,
    BF: 0,
    CG: 0,
    SHO: 0,
    decision: null,
  };
}
