import type { PlayerCard, Position } from './player';

export interface BaseState {
  first: string | null;   // playerId or null
  second: string | null;
  third: string | null;
}

export interface OutcomeTableEntry {
  frequencyWeight: number;  // 1-5, how often this row is selected
  thresholdLow: number;     // minimum card value for this outcome
  thresholdHigh: number;    // maximum card value for this outcome
  outcomeIndex: number;     // maps to an OutcomeCategory
}

// Map outcomeIndex values (15-40) to concrete game outcomes
export enum OutcomeCategory {
  // Hits
  SINGLE_CLEAN = 15,
  SINGLE_ADVANCE = 16,
  DOUBLE = 17,
  TRIPLE = 18,
  HOME_RUN = 19,
  HOME_RUN_VARIANT = 20,

  // Outs
  GROUND_OUT = 21,
  FLY_OUT = 22,
  POP_OUT = 23,
  LINE_OUT = 24,
  STRIKEOUT_LOOKING = 25,
  STRIKEOUT_SWINGING = 26,

  // Walks / HBP
  WALK = 27,
  WALK_INTENTIONAL = 28,
  HIT_BY_PITCH = 29,

  // Special plays
  GROUND_OUT_ADVANCE = 30,
  SACRIFICE = 31,
  DOUBLE_PLAY = 32,
  DOUBLE_PLAY_LINE = 33,
  REACHED_ON_ERROR = 34,
  FIELDERS_CHOICE = 35,

  // Rare events
  STOLEN_BASE_OPP = 36,
  WILD_PITCH = 37,
  BALK = 38,
  PASSED_BALL = 39,
  SPECIAL_EVENT = 40,
}

export interface LineupSlot {
  rosterId: string;
  playerId: string;
  playerName: string;
  position: Position;
}

export interface GamePitcherStats {
  IP: number;
  H: number;
  R: number;
  ER: number;
  BB: number;
  SO: number;
  HR: number;
  BF: number;
  pitchCount: number;
}

export interface BattingLine {
  playerId: string;
  playerName?: string;
  teamSide?: 'home' | 'away';
  AB: number;
  R: number;
  H: number;
  doubles: number;
  triples: number;
  HR: number;
  RBI: number;
  BB: number;
  SO: number;
  SB: number;
  CS: number;
  HBP: number;
  SF: number;
}

export interface PitchingLine {
  playerId: string;
  playerName?: string;
  teamSide?: 'home' | 'away';
  IP: number;
  H: number;
  R: number;
  ER: number;
  BB: number;
  SO: number;
  HR: number;
  BF: number;
  CG: number;
  SHO: number;
  decision: 'W' | 'L' | 'SV' | 'HLD' | 'BS' | null;
}

export interface TeamState {
  teamId: string;
  lineup: LineupSlot[];
  currentPitcher: PlayerCard;
  bullpen: PlayerCard[];
  closer: PlayerCard | null;
  benchPlayers: PlayerCard[];
  pitcherStats: GamePitcherStats;
  pitchersUsed: PlayerCard[];
}

export interface GameState {
  homeTeam: TeamState;
  awayTeam: TeamState;
  inning: number;              // 1-based
  halfInning: 'top' | 'bottom';
  outs: number;                // 0, 1, 2
  bases: BaseState;
  homeScore: number;
  awayScore: number;
  isComplete: boolean;
  playByPlay: PlayByPlayEntry[];
  currentBatterIndex: number;  // 0-8 in batting order
  pitcherFatigue: number;      // Innings pitched this game
  baseSituation: number;       // 0-7 encoding (APBA base situation)
  consecutiveHitsWalks: number;
}

export interface PlayByPlayEntry {
  inning: number;
  halfInning: 'top' | 'bottom';
  outs: number;
  batterId: string;
  pitcherId: string;
  cardPosition: number;        // Which card position was selected (0-34)
  cardValue: number;           // The value at that position
  outcomeTableRow: number;     // Which IDT row was used
  outcome: OutcomeCategory;
  description: string;         // Human-readable text
  basesAfter: BaseState;
  scoreAfter: { home: number; away: number };
}

export interface BoxScore {
  lineScore: { away: number[]; home: number[] };
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
}

export interface GameResult {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  innings: number;
  winningPitcherId: string;
  losingPitcherId: string;
  savePitcherId: string | null;
  boxScore: BoxScore;
  playerBattingLines: BattingLine[];
  playerPitchingLines: PitchingLine[];
  playByPlay: PlayByPlayEntry[];
  /** Maps playerId -> display name for all players who appeared in the game. */
  playerNames: Record<string, string>;
}
