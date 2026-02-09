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
