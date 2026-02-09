import type { BoxScore, PlayByPlayEntry } from './game';

export interface ApiResponse<T> {
  readonly data: T;
  readonly meta: {
    readonly requestId: string;  // UUID v4
    readonly timestamp: string;  // ISO 8601 UTC
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly pagination: {
    readonly page: number;       // 1-based current page
    readonly pageSize: number;   // Fixed at 50 per REQ-NFR-019
    readonly totalRows: number;
    readonly totalPages: number;
  };
}

export interface JoinLeagueResult {
  readonly teamId: string;
  readonly teamName: string;
}

export interface GameDetail {
  readonly gameId: string;
  readonly dayNumber: number;
  readonly homeTeam: { readonly id: string; readonly name: string; readonly city: string };
  readonly awayTeam: { readonly id: string; readonly name: string; readonly city: string };
  readonly homeScore: number;
  readonly awayScore: number;
  readonly innings: number;
  readonly boxScore: BoxScore;
  readonly playByPlay: PlayByPlayEntry[];
  readonly winningPitcherId: string;
  readonly losingPitcherId: string;
  readonly savePitcherId: string | null;
}

export interface TransactionResult {
  readonly transactionId: string;
  readonly type: 'add' | 'drop' | 'trade';
  readonly teamId: string;
  readonly playersAdded: ReadonlyArray<{ readonly playerId: string; readonly playerName: string }>;
  readonly playersDropped: ReadonlyArray<{ readonly playerId: string; readonly playerName: string }>;
  readonly completedAt: string; // ISO 8601 UTC
}

export interface ArchiveSummary {
  readonly id: string;
  readonly seasonNumber: number;
  readonly champion: string | null;
  readonly createdAt: string; // ISO 8601 UTC
}

export interface SimulationProgress {
  leagueId: string;
  status: 'running' | 'completed' | 'error';
  totalGames: number;
  completedGames: number;
  currentDay: number;
  startedAt: string;
  updatedAt: string;
  errorMessage?: string;
}

// Re-export for convenience -- API error response is in errors.ts
export type { ValidationDetail, ApiErrorResponse } from './errors';
