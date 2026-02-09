/**
 * API Request Validation
 *
 * Zod-based validation for request bodies and query parameters.
 * Throws AppError with VALIDATION category on failure.
 *
 * Layer 2: API infrastructure.
 */

import type { VercelRequest } from '@vercel/node';
import type { z } from 'zod';

interface ValidationAppError {
  category: 'VALIDATION';
  code: string;
  message: string;
  statusCode: number;
  details: Array<{ field: string; message: string }>;
}

/**
 * Validate the request body against a Zod schema.
 * Returns the parsed (typed) data on success.
 * Throws a VALIDATION AppError on failure.
 */
export function validateBody<T>(req: VercelRequest, schema: z.ZodType<T>): T {
  const result = schema.safeParse(req.body);
  if (result.success) {
    return result.data;
  }

  const details = result.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));

  const error: ValidationAppError = {
    category: 'VALIDATION',
    code: 'INVALID_REQUEST_BODY',
    message: 'Request body validation failed',
    statusCode: 400,
    details,
  };
  throw error;
}

/**
 * Validate query parameters against a Zod schema.
 * Returns the parsed (typed) data on success.
 * Throws a VALIDATION AppError on failure.
 */
export function validateQuery<T>(req: VercelRequest, schema: z.ZodType<T>): T {
  const result = schema.safeParse(req.query);
  if (result.success) {
    return result.data;
  }

  const details = result.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'query',
    message: issue.message,
  }));

  const error: ValidationAppError = {
    category: 'VALIDATION',
    code: 'INVALID_QUERY_PARAMS',
    message: 'Query parameter validation failed',
    statusCode: 400,
    details,
  };
  throw error;
}
