/**
 * Tests for Structured JSON Logger (REQ-ERR-013, REQ-ERR-014)
 *
 * Validates:
 * - Outputs valid JSON to console
 * - Includes required fields (timestamp, level, message)
 * - Includes optional context fields (requestId, leagueId, code, etc.)
 * - Error level logs include stack traces
 * - Log levels: ERROR, WARN, INFO
 */

import { logger, type LogContext } from '../../../../api/_lib/logger';

describe('logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('info', () => {
    it('writes JSON to console.log', () => {
      logger.info('Server started');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(output.level).toBe('INFO');
      expect(output.message).toBe('Server started');
    });

    it('includes ISO timestamp', () => {
      logger.info('test');

      const output = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('includes optional context fields', () => {
      const ctx: LogContext = {
        requestId: 'req-123',
        leagueId: 'lg-456',
        operation: 'simulateDay',
      };

      logger.info('Simulation started', ctx);

      const output = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(output.requestId).toBe('req-123');
      expect(output.leagueId).toBe('lg-456');
      expect(output.operation).toBe('simulateDay');
    });
  });

  describe('warn', () => {
    it('writes JSON to console.log with WARN level', () => {
      logger.warn('Retry attempt');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(output.level).toBe('WARN');
      expect(output.message).toBe('Retry attempt');
    });

    it('includes context fields', () => {
      logger.warn('Slow query', { operation: 'fetchStandings', duration_ms: 2500 });

      const output = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(output.operation).toBe('fetchStandings');
      expect(output.duration_ms).toBe(2500);
    });
  });

  describe('error', () => {
    it('writes JSON to console.error', () => {
      logger.error('Database failed');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(output.level).toBe('ERROR');
      expect(output.message).toBe('Database failed');
    });

    it('includes error code from context', () => {
      logger.error('Commit failed', { code: 'SIMULATION_COMMIT_FAILED', requestId: 'req-1' });

      const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(output.code).toBe('SIMULATION_COMMIT_FAILED');
    });

    it('includes stack trace when error is provided', () => {
      const err = new Error('boom');
      logger.error('Unexpected error', { error: err });

      const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(output.stack).toContain('boom');
    });
  });

  describe('edge cases', () => {
    it('omits undefined context fields', () => {
      logger.info('test', { requestId: 'req-1' });

      const output = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(output).not.toHaveProperty('leagueId');
      expect(output).not.toHaveProperty('operation');
    });

    it('handles empty context', () => {
      logger.info('test', {});

      const output = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(output.level).toBe('INFO');
      expect(output.message).toBe('test');
    });
  });
});
