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
