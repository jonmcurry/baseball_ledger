/**
 * Tests for Draft Validation Schemas (REQ-ERR-005, REQ-ERR-006)
 *
 * draftPickSchema: leagueId (uuid), teamId (uuid), playerId (string), seasonYear (number)
 */

import { draftPickSchema } from '@lib/validation/draft-schemas';

describe('draftPickSchema', () => {
  const validInput = {
    leagueId: '550e8400-e29b-41d4-a716-446655440000',
    teamId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    playerId: 'ruthba01',
    seasonYear: 1927,
  };

  it('accepts valid input', () => {
    const result = draftPickSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects invalid leagueId (not UUID)', () => {
    const result = draftPickSchema.safeParse({ ...validInput, leagueId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid teamId (not UUID)', () => {
    const result = draftPickSchema.safeParse({ ...validInput, teamId: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects empty playerId', () => {
    const result = draftPickSchema.safeParse({ ...validInput, playerId: '' });
    expect(result.success).toBe(false);
  });

  it('accepts playerId with various formats', () => {
    const result = draftPickSchema.safeParse({ ...validInput, playerId: 'bondsba01' });
    expect(result.success).toBe(true);
  });

  it('rejects seasonYear before 1901', () => {
    const result = draftPickSchema.safeParse({ ...validInput, seasonYear: 1900 });
    expect(result.success).toBe(false);
  });

  it('rejects seasonYear after 2025', () => {
    const result = draftPickSchema.safeParse({ ...validInput, seasonYear: 2026 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer seasonYear', () => {
    const result = draftPickSchema.safeParse({ ...validInput, seasonYear: 1927.5 });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = draftPickSchema.safeParse({ leagueId: validInput.leagueId });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = draftPickSchema.safeParse({
      ...validInput,
      extra: 'should be removed',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)['extra']).toBeUndefined();
    }
  });
});
