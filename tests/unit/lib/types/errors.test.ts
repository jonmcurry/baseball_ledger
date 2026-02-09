import type {
  ErrorCategory,
  AppError,
  ValidationDetail,
  ApiErrorResponse,
  ErrorLogEntry,
} from '@lib/types/errors';

describe('Error types', () => {
  describe('ErrorCategory', () => {
    it('accepts all valid category values', () => {
      const categories: ErrorCategory[] = [
        'VALIDATION',
        'AUTHENTICATION',
        'AUTHORIZATION',
        'NOT_FOUND',
        'CONFLICT',
        'RATE_LIMIT',
        'SIMULATION',
        'DATA',
        'EXTERNAL',
      ];
      expect(categories).toHaveLength(9);
    });
  });

  describe('ValidationDetail', () => {
    it('has field and message', () => {
      const detail: ValidationDetail = {
        field: 'lineup[3].position',
        message: 'Duplicate position assignment',
      };
      expect(detail.field).toBe('lineup[3].position');
      expect(detail.message).toBe('Duplicate position assignment');
    });
  });

  describe('AppError', () => {
    it('has all required fields', () => {
      const error: AppError = {
        category: 'VALIDATION',
        code: 'ERR_ROSTER_COMPOSITION',
        message: 'Roster must have at least 3 SS-eligible players',
        statusCode: 400,
      };
      expect(error.category).toBe('VALIDATION');
      expect(error.code).toBe('ERR_ROSTER_COMPOSITION');
      expect(error.statusCode).toBe(400);
    });

    it('supports optional details and cause', () => {
      const error: AppError = {
        category: 'VALIDATION',
        code: 'ERR_LINEUP_INVALID',
        message: 'Invalid lineup',
        statusCode: 400,
        details: [{ field: 'lineup[0]', message: 'Missing catcher' }],
        cause: new Error('underlying error'),
      };
      expect(error.details).toHaveLength(1);
      expect(error.cause).toBeInstanceOf(Error);
    });
  });

  describe('ApiErrorResponse', () => {
    it('wraps error with code, message, and requestId', () => {
      const response: ApiErrorResponse = {
        error: {
          code: 'ERR_DRAFT_PLAYER_TAKEN',
          message: 'Player already drafted',
          requestId: '550e8400-e29b-41d4-a716-446655440000',
        },
      };
      expect(response.error.code).toBe('ERR_DRAFT_PLAYER_TAKEN');
      expect(response.error.requestId).toBeTruthy();
    });

    it('supports optional validation details', () => {
      const response: ApiErrorResponse = {
        error: {
          code: 'ERR_VALIDATION',
          message: 'Validation failed',
          requestId: '550e8400-e29b-41d4-a716-446655440000',
          details: [{ field: 'name', message: 'Required' }],
        },
      };
      expect(response.error.details).toHaveLength(1);
    });
  });

  describe('ErrorLogEntry', () => {
    it('has all required fields', () => {
      const entry: ErrorLogEntry = {
        timestamp: '2026-02-08T12:00:00.000Z',
        level: 'ERROR',
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        operation: 'simulate_season',
        errorCode: 'ERR_SIM_INVALID_STATE',
        message: 'Game state invalid',
      };
      expect(entry.level).toBe('ERROR');
      expect(entry.operation).toBe('simulate_season');
    });

    it('supports optional context fields', () => {
      const entry: ErrorLogEntry = {
        timestamp: '2026-02-08T12:00:00.000Z',
        level: 'WARN',
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        operation: 'draft_pick',
        errorCode: 'ERR_DRAFT_TIMEOUT',
        message: 'Pick timer expired',
        leagueId: 'league-123',
        userId: 'user-456',
        stack: 'Error: timeout\n  at ...',
        duration_ms: 1500,
      };
      expect(entry.leagueId).toBe('league-123');
      expect(entry.duration_ms).toBe(1500);
    });
  });
});
