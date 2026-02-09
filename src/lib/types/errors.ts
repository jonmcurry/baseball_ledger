export type ErrorCategory =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'SIMULATION'
  | 'DATA'
  | 'EXTERNAL';

export interface ValidationDetail {
  readonly field: string;
  readonly message: string;
}

export interface AppError {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly message: string;
  readonly statusCode: number;
  readonly details?: ValidationDetail[];
  readonly cause?: Error;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ValidationDetail[];
    requestId: string;
  };
}

export interface ErrorLogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  requestId: string;
  leagueId?: string;
  userId?: string;
  operation: string;
  errorCode: string;
  message: string;
  stack?: string;
  duration_ms?: number;
}
