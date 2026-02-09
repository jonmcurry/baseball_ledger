/**
 * Error Factory Functions
 *
 * REQ-ERR-001: Convenience factories for creating typed AppError instances
 * with correct category/statusCode mappings.
 *
 * Layer 1: Pure logic, no I/O.
 */

import type { ValidationDetail } from '../types/errors';
import { AppError } from './app-error';
import { ERROR_CODES } from './error-codes';

/**
 * Create a validation error (400).
 */
export function createValidationError(
  details: ValidationDetail[],
  message = 'Validation failed',
): AppError {
  return new AppError('VALIDATION', ERROR_CODES.VALIDATION_FAILED, message, 400, details);
}

/**
 * Create an authentication error (401).
 */
export function createAuthError(code: string, message: string): AppError {
  return new AppError('AUTHENTICATION', code, message, 401);
}

/**
 * Create an authorization error (403).
 */
export function createAuthorizationError(code: string, message: string): AppError {
  return new AppError('AUTHORIZATION', code, message, 403);
}

/**
 * Create a not-found error (404).
 */
export function createNotFoundError(resource: string, id: string): AppError {
  return new AppError(
    'NOT_FOUND',
    ERROR_CODES.DATA_NOT_FOUND,
    `${resource} not found: ${id}`,
    404,
  );
}

/**
 * Create a conflict error (409).
 */
export function createConflictError(code: string, message: string): AppError {
  return new AppError('CONFLICT', code, message, 409);
}

/**
 * Create a draft-specific error.
 * Draft errors are typically CONFLICT (409) for state violations.
 */
export function createDraftError(code: string, message: string): AppError {
  return new AppError('CONFLICT', code, message, 409);
}

/**
 * Create a league-specific error.
 * League errors are typically CONFLICT (409) for state transition violations.
 */
export function createLeagueError(code: string, message: string): AppError {
  return new AppError('CONFLICT', code, message, 409);
}

/**
 * Create a simulation error (500).
 */
export function createSimulationError(message: string, cause?: Error): AppError {
  return new AppError('SIMULATION', ERROR_CODES.SIMULATION_FAILED, message, 500, undefined, cause);
}
