/**
 * API Error Handler
 *
 * Maps AppError categories to HTTP status codes and returns
 * standardized ApiErrorResponse JSON per REQ-API-006.
 *
 * Layer 2: API infrastructure.
 */

import type { VercelResponse } from '@vercel/node';
import type { ErrorCategory } from '@lib/types/errors';

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    requestId: string;
  };
}

const STATUS_MAP: Record<ErrorCategory, number> = {
  VALIDATION: 400,
  AUTHENTICATION: 401,
  AUTHORIZATION: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  SIMULATION: 500,
  DATA: 500,
  EXTERNAL: 502,
};

export interface AppErrorLike {
  category?: ErrorCategory;
  code?: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * Handle an error by sending the appropriate HTTP response.
 * Accepts AppError objects or generic Error objects.
 */
export function handleApiError(
  res: VercelResponse,
  error: unknown,
  requestId: string,
): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Content-Type', 'application/json');

  if (isAppError(error)) {
    const statusCode = STATUS_MAP[error.category] ?? 500;
    const body: ApiErrorBody = {
      error: {
        code: error.code ?? error.category,
        message: error.message,
        requestId,
      },
    };
    if (error.details && error.details.length > 0) {
      body.error.details = error.details;
    }
    res.status(statusCode).json(body);
    return;
  }

  // Generic/unknown errors -> 500
  const message = error instanceof Error ? error.message : 'Internal server error';
  const body: ApiErrorBody = {
    error: {
      code: 'INTERNAL_ERROR',
      message,
      requestId,
    },
  };
  res.status(500).json(body);
}

function isAppError(error: unknown): error is AppErrorLike & { category: ErrorCategory } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'category' in error &&
    'message' in error &&
    typeof (error as AppErrorLike).category === 'string'
  );
}

// --- PostgreSQL Error Code Mapping (REQ-ERR-019, REQ-ERR-020) ---

export interface PostgresErrorInput {
  code: string;
  message: string;
}

export interface MappedPostgresError {
  category: ErrorCategory;
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * Constraint name -> user-friendly message lookup.
 * Add entries as new constraints are created in migrations.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  rosters_team_id_player_id_key: 'This player is already on this team.',
  leagues_name_key: 'A league with this name already exists.',
  teams_league_id_name_key: 'A team with this name already exists in this league.',
};

/**
 * Map a PostgreSQL error (from Supabase) to an application-level error
 * with the correct category, code, message, and retryable hint.
 */
export function mapPostgresError(pgError: PostgresErrorInput): MappedPostgresError {
  switch (pgError.code) {
    // Class 23: Integrity Constraint Violations
    case '23505': { // unique_violation
      const constraint = extractConstraint(pgError.message);
      const message = (constraint && CONSTRAINT_MESSAGES[constraint])
        ?? 'A record with this value already exists.';
      return { category: 'CONFLICT', code: 'UNIQUE_VIOLATION', message, retryable: false };
    }
    case '23503': // foreign_key_violation
      return { category: 'VALIDATION', code: 'FOREIGN_KEY_VIOLATION', message: 'Referenced record does not exist.', retryable: false };
    case '23502': // not_null_violation
      return { category: 'VALIDATION', code: 'NOT_NULL_VIOLATION', message: 'A required field is missing.', retryable: false };
    case '23514': // check_violation
      return { category: 'VALIDATION', code: 'CHECK_VIOLATION', message: 'Value does not meet constraints.', retryable: false };

    // Class 40: Transaction Rollback
    case '40001': // serialization_failure
      return { category: 'EXTERNAL', code: 'SERIALIZATION_FAILURE', message: 'Concurrent update conflict. Please retry.', retryable: true };

    // Class 57: Operator Intervention
    case '57014': // statement_timeout
      return { category: 'EXTERNAL', code: 'STATEMENT_TIMEOUT', message: 'Database query timed out. Please retry.', retryable: true };

    // Class 42: Syntax/Access Rule errors
    case '42P01': // undefined_table
      return { category: 'DATA', code: 'UNDEFINED_TABLE', message: pgError.message, retryable: false };

    default:
      return { category: 'DATA', code: 'DATABASE_ERROR', message: pgError.message, retryable: false };
  }
}

/**
 * Extract the constraint name from a PG error message.
 * Example: '...violates unique constraint "rosters_team_id_player_id_key"' -> 'rosters_team_id_player_id_key'
 */
function extractConstraint(message: string): string | null {
  const match = message.match(/"([^"]+)"/);
  return match ? match[1] : null;
}
