export interface ScheduleGameSummary {
  readonly id: string;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  isComplete: boolean;
  gameLogId: string | null;
}

export interface ScheduleDay {
  readonly dayNumber: number;
  games: ScheduleGameSummary[];
}

// ---------------------------------------------------------------------------
// Playoff types (REQ-LGE-008)
// ---------------------------------------------------------------------------

export type PlayoffRoundName =
  | 'WildCard'
  | 'DivisionSeries'
  | 'ChampionshipSeries'
  | 'WorldSeries';

export interface PlayoffTeamSeed {
  readonly teamId: string;
  readonly seed: number;
  readonly record: { wins: number; losses: number };
}

export interface PlayoffGame {
  readonly gameNumber: number;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  isComplete: boolean;
}

export interface PlayoffSeries {
  readonly id: string;
  readonly round: PlayoffRoundName;
  readonly leagueDivision: 'AL' | 'NL' | 'MLB';
  readonly higherSeed: PlayoffTeamSeed | null;
  readonly lowerSeed: PlayoffTeamSeed | null;
  readonly bestOf: 3 | 5 | 7;
  games: PlayoffGame[];
  higherSeedWins: number;
  lowerSeedWins: number;
  isComplete: boolean;
  winnerId: string | null;
}

export interface PlayoffRound {
  readonly name: PlayoffRoundName;
  readonly bestOf: 3 | 5 | 7;
  series: PlayoffSeries[];
}

export interface PlayoffBracket {
  readonly leagueId: string;
  rounds: PlayoffRound[];
  championId: string | null;
}

/**
 * Full playoff bracket combining AL + NL league brackets with World Series.
 * REQ-LGE-008: 2025 MLB playoff format.
 */
export interface FullPlayoffBracket {
  readonly leagueId: string;
  readonly al: PlayoffBracket;
  readonly nl: PlayoffBracket;
  readonly worldSeries: PlayoffSeries;
  worldSeriesChampionId: string | null;
}
