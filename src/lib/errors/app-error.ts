/**
 * AppError Class
 *
 * REQ-ERR-001: All throwable errors across all layers MUST be instances
 * of AppError or its subtypes.
 *
 * Implements the AppError interface from src/lib/types/errors.ts as a
 * concrete class extending Error.
 *
 * Layer 1: Pure logic, no I/O.
 */

import type {
  ErrorCategory,
  ValidationDetail,
  AppError as AppErrorInterface,
} from '../types/errors';

export class AppError extends Error implements AppErrorInterface {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly statusCode: number;
  readonly details?: ValidationDetail[];
  readonly cause?: Error;

  constructor(
    category: ErrorCategory,
    code: string,
    message: string,
    statusCode: number,
    details?: ValidationDetail[],
    cause?: Error,
  ) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.cause = cause;
  }
}

/**
 * Type guard for AppError instances.
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
