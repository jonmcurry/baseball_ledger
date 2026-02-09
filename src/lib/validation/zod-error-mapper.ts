/**
 * Zod Error Mapper
 *
 * REQ-ERR-007: Transform Zod parse failures into AppError with
 * category VALIDATION and field-level ValidationDetail[].
 *
 * Maps ZodError.issues to ValidationDetail[] using:
 *   - issue.path joined by '.' as `field`
 *   - issue.message as `message`
 *
 * Layer 1: Pure logic, no I/O.
 */

import type { ZodError } from 'zod';
import type { ValidationDetail } from '../types/errors';
import { AppError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';

/**
 * Map a ZodError to an AppError with VALIDATION category.
 *
 * @param zodError - The Zod validation error
 * @param message - Optional custom error message (default: 'Validation failed')
 * @returns AppError with field-level details
 */
export function mapZodError(zodError: ZodError, message = 'Validation failed'): AppError {
  const details: ValidationDetail[] = zodError.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return new AppError(
    'VALIDATION',
    ERROR_CODES.VALIDATION_FAILED,
    message,
    400,
    details,
  );
}
