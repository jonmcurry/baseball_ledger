/**
 * Tests for PostgreSQL Error Code Mapping (REQ-ERR-019, REQ-ERR-020)
 *
 * Validates:
 * - Known PG error codes map to proper AppError categories + HTTP status
 * - Constraint names map to user-friendly messages
 * - Unknown PG codes fall through to generic DATA error
 * - Non-PG errors pass through unchanged
 */

import { mapPostgresError } from '../../../../api/_lib/errors';

describe('mapPostgresError', () => {
  it('maps 23505 (unique_violation) to CONFLICT', () => {
    const pgError = { code: '23505', message: 'duplicate key value violates unique constraint "rosters_team_id_player_id_key"' };
    const result = mapPostgresError(pgError);

    expect(result.category).toBe('CONFLICT');
    expect(result.code).toBe('UNIQUE_VIOLATION');
  });

  it('extracts constraint name from 23505 for user-friendly message', () => {
    const pgError = { code: '23505', message: 'duplicate key value violates unique constraint "rosters_team_id_player_id_key"' };
    const result = mapPostgresError(pgError);

    expect(result.message).toContain('already');
  });

  it('maps 23503 (foreign_key_violation) to VALIDATION', () => {
    const pgError = { code: '23503', message: 'insert or update on table "rosters" violates foreign key constraint "rosters_team_id_fkey"' };
    const result = mapPostgresError(pgError);

    expect(result.category).toBe('VALIDATION');
    expect(result.code).toBe('FOREIGN_KEY_VIOLATION');
  });

  it('maps 23502 (not_null_violation) to VALIDATION', () => {
    const pgError = { code: '23502', message: 'null value in column "name" violates not-null constraint' };
    const result = mapPostgresError(pgError);

    expect(result.category).toBe('VALIDATION');
    expect(result.code).toBe('NOT_NULL_VIOLATION');
  });

  it('maps 23514 (check_violation) to VALIDATION', () => {
    const pgError = { code: '23514', message: 'new row violates check constraint "positive_score"' };
    const result = mapPostgresError(pgError);

    expect(result.category).toBe('VALIDATION');
    expect(result.code).toBe('CHECK_VIOLATION');
  });

  it('maps 40001 (serialization_failure) to EXTERNAL with retryable hint', () => {
    const pgError = { code: '40001', message: 'could not serialize access due to concurrent update' };
    const result = mapPostgresError(pgError);

    expect(result.category).toBe('EXTERNAL');
    expect(result.code).toBe('SERIALIZATION_FAILURE');
    expect(result.retryable).toBe(true);
  });

  it('maps 57014 (statement_timeout) to EXTERNAL with retryable hint', () => {
    const pgError = { code: '57014', message: 'canceling statement due to statement timeout' };
    const result = mapPostgresError(pgError);

    expect(result.category).toBe('EXTERNAL');
    expect(result.code).toBe('STATEMENT_TIMEOUT');
    expect(result.retryable).toBe(true);
  });

  it('maps 42P01 (undefined_table) to DATA', () => {
    const pgError = { code: '42P01', message: 'relation "nonexistent" does not exist' };
    const result = mapPostgresError(pgError);

    expect(result.category).toBe('DATA');
    expect(result.code).toBe('UNDEFINED_TABLE');
  });

  it('maps unknown PG code to DATA with original message', () => {
    const pgError = { code: '99999', message: 'something unknown happened' };
    const result = mapPostgresError(pgError);

    expect(result.category).toBe('DATA');
    expect(result.code).toBe('DATABASE_ERROR');
    expect(result.message).toBe('something unknown happened');
  });

  it('uses constraint-to-message lookup for rosters_team_id_player_id_key', () => {
    const pgError = { code: '23505', message: 'duplicate key value violates unique constraint "rosters_team_id_player_id_key"' };
    const result = mapPostgresError(pgError);

    expect(result.message).toBe('This player is already on this team.');
  });

  it('uses constraint-to-message lookup for leagues_name_key', () => {
    const pgError = { code: '23505', message: 'duplicate key value violates unique constraint "leagues_name_key"' };
    const result = mapPostgresError(pgError);

    expect(result.message).toBe('A league with this name already exists.');
  });

  it('provides generic message for unknown constraint names', () => {
    const pgError = { code: '23505', message: 'duplicate key value violates unique constraint "some_unknown_constraint"' };
    const result = mapPostgresError(pgError);

    expect(result.message).toBe('A record with this value already exists.');
  });

  it('returns retryable false for non-transient errors', () => {
    const pgError = { code: '23505', message: 'duplicate key' };
    const result = mapPostgresError(pgError);

    expect(result.retryable).toBe(false);
  });
});
