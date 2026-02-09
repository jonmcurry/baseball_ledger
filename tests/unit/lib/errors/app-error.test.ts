import {
  AppError,
  isAppError,
} from '@lib/errors/app-error';
import {
  ERROR_CODES,
  type ErrorCode,
} from '@lib/errors/error-codes';
import {
  createValidationError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createDraftError,
  createLeagueError,
  createSimulationError,
} from '@lib/errors/error-factory';

// ---------------------------------------------------------------------------
// AppError class
// ---------------------------------------------------------------------------
describe('AppError (REQ-ERR-001)', () => {
  it('extends Error', () => {
    const err = new AppError('VALIDATION', 'ERR_TEST', 'test message', 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('stores category, code, message, and statusCode', () => {
    const err = new AppError('NOT_FOUND', 'ERR_NOT_FOUND', 'not found', 404);
    expect(err.category).toBe('NOT_FOUND');
    expect(err.code).toBe('ERR_NOT_FOUND');
    expect(err.message).toBe('not found');
    expect(err.statusCode).toBe(404);
  });

  it('stores optional validation details', () => {
    const details = [
      { field: 'name', message: 'too short' },
      { field: 'count', message: 'must be even' },
    ];
    const err = new AppError('VALIDATION', 'ERR_VAL', 'validation failed', 400, details);
    expect(err.details).toEqual(details);
    expect(err.details).toHaveLength(2);
  });

  it('stores optional cause error', () => {
    const cause = new Error('original');
    const err = new AppError('EXTERNAL', 'ERR_EXT', 'wrapper', 502, undefined, cause);
    expect(err.cause).toBe(cause);
  });

  it('has a proper name property', () => {
    const err = new AppError('VALIDATION', 'ERR_VAL', 'msg', 400);
    expect(err.name).toBe('AppError');
  });

  it('has a stack trace', () => {
    const err = new AppError('VALIDATION', 'ERR_VAL', 'msg', 400);
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('AppError');
  });

  it('defaults details to undefined when not provided', () => {
    const err = new AppError('DATA', 'ERR_DATA', 'msg', 500);
    expect(err.details).toBeUndefined();
  });

  it('defaults cause to undefined when not provided', () => {
    const err = new AppError('DATA', 'ERR_DATA', 'msg', 500);
    expect(err.cause).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isAppError type guard
// ---------------------------------------------------------------------------
describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    const err = new AppError('VALIDATION', 'ERR_VAL', 'msg', 400);
    expect(isAppError(err)).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isAppError(new Error('plain'))).toBe(false);
  });

  it('returns false for non-Error objects', () => {
    expect(isAppError({ code: 'ERR', message: 'msg' })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Error codes (REQ-ERR-002)
// ---------------------------------------------------------------------------
describe('ERROR_CODES (REQ-ERR-002)', () => {
  it('defines AUTH domain codes', () => {
    expect(ERROR_CODES.AUTH_TOKEN_EXPIRED).toBe('ERR_AUTH_TOKEN_EXPIRED');
    expect(ERROR_CODES.AUTH_NOT_COMMISSIONER).toBe('ERR_AUTH_NOT_COMMISSIONER');
    expect(ERROR_CODES.AUTH_UNAUTHORIZED).toBe('ERR_AUTH_UNAUTHORIZED');
  });

  it('defines DRAFT domain codes', () => {
    expect(ERROR_CODES.DRAFT_PLAYER_TAKEN).toBe('ERR_DRAFT_PLAYER_TAKEN');
    expect(ERROR_CODES.DRAFT_OUT_OF_TURN).toBe('ERR_DRAFT_OUT_OF_TURN');
    expect(ERROR_CODES.DRAFT_NOT_STARTED).toBe('ERR_DRAFT_NOT_STARTED');
    expect(ERROR_CODES.DRAFT_COMPLETED).toBe('ERR_DRAFT_COMPLETED');
  });

  it('defines LEAGUE domain codes', () => {
    expect(ERROR_CODES.LEAGUE_INVALID_TRANSITION).toBe('ERR_LEAGUE_INVALID_TRANSITION');
    expect(ERROR_CODES.LEAGUE_NOT_FOUND).toBe('ERR_LEAGUE_NOT_FOUND');
    expect(ERROR_CODES.LEAGUE_INVALID_INVITE).toBe('ERR_LEAGUE_INVALID_INVITE');
  });

  it('defines VALIDATION domain codes', () => {
    expect(ERROR_CODES.VALIDATION_FAILED).toBe('ERR_VALIDATION_FAILED');
  });

  it('defines SIMULATION domain codes', () => {
    expect(ERROR_CODES.SIMULATION_FAILED).toBe('ERR_SIMULATION_FAILED');
  });
});

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------
describe('createValidationError', () => {
  it('creates 400 error with VALIDATION category', () => {
    const err = createValidationError([{ field: 'name', message: 'required' }]);
    expect(err.category).toBe('VALIDATION');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('ERR_VALIDATION_FAILED');
    expect(err.details).toHaveLength(1);
    expect(err.details![0].field).toBe('name');
  });

  it('accepts custom message', () => {
    const err = createValidationError([], 'custom msg');
    expect(err.message).toBe('custom msg');
  });
});

describe('createAuthError', () => {
  it('creates 401 error with AUTHENTICATION category', () => {
    const err = createAuthError(ERROR_CODES.AUTH_TOKEN_EXPIRED, 'token expired');
    expect(err.category).toBe('AUTHENTICATION');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('ERR_AUTH_TOKEN_EXPIRED');
  });
});

describe('createAuthorizationError', () => {
  it('creates 403 error with AUTHORIZATION category', () => {
    const err = createAuthorizationError(ERROR_CODES.AUTH_NOT_COMMISSIONER, 'not commissioner');
    expect(err.category).toBe('AUTHORIZATION');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('ERR_AUTH_NOT_COMMISSIONER');
  });
});

describe('createNotFoundError', () => {
  it('creates 404 error with NOT_FOUND category', () => {
    const err = createNotFoundError('league', 'abc-123');
    expect(err.category).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('league');
    expect(err.message).toContain('abc-123');
  });
});

describe('createConflictError', () => {
  it('creates 409 error with CONFLICT category', () => {
    const err = createConflictError(ERROR_CODES.DRAFT_PLAYER_TAKEN, 'already drafted');
    expect(err.category).toBe('CONFLICT');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('ERR_DRAFT_PLAYER_TAKEN');
  });
});

describe('createDraftError', () => {
  it('creates error with correct code and category', () => {
    const err = createDraftError(ERROR_CODES.DRAFT_OUT_OF_TURN, 'not your turn');
    expect(err.code).toBe('ERR_DRAFT_OUT_OF_TURN');
    expect(err.message).toBe('not your turn');
  });
});

describe('createLeagueError', () => {
  it('creates error for invalid league state transition', () => {
    const err = createLeagueError(
      ERROR_CODES.LEAGUE_INVALID_TRANSITION,
      'cannot start draft from completed state',
    );
    expect(err.code).toBe('ERR_LEAGUE_INVALID_TRANSITION');
    expect(err.category).toBe('CONFLICT');
    expect(err.statusCode).toBe(409);
  });
});

describe('createSimulationError', () => {
  it('creates 500 error with SIMULATION category', () => {
    const cause = new Error('division by zero');
    const err = createSimulationError('engine failure', cause);
    expect(err.category).toBe('SIMULATION');
    expect(err.statusCode).toBe(500);
    expect(err.cause).toBe(cause);
  });
});
