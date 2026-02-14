/**
 * Tests for League Validation Schemas (REQ-ERR-005, REQ-ERR-006)
 *
 * createLeagueSchema: name, teamCount, yearRangeStart/End, injuriesEnabled
 * joinLeagueSchema: inviteKey (12 chars alphanumeric)
 */

import {
  createLeagueSchema,
  joinLeagueSchema,
} from '@lib/validation/league-schemas';

// ---------------------------------------------------------------------------
// createLeagueSchema
// ---------------------------------------------------------------------------

describe('createLeagueSchema', () => {
  const validInput = {
    name: 'Test League',
    teamCount: 18,
    yearRangeStart: 1950,
    yearRangeEnd: 2020,
    injuriesEnabled: false,
  };

  it('accepts valid input', () => {
    const result = createLeagueSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts minimum valid name (3 chars)', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, name: 'Abc' });
    expect(result.success).toBe(true);
  });

  it('accepts maximum valid name (50 chars)', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, name: 'A'.repeat(50) });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 3 chars', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, name: 'Ab' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 50 chars', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, name: 'A'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts 18 teams', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, teamCount: 18 });
    expect(result.success).toBe(true);
  });

  it('accepts 24 teams', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, teamCount: 24 });
    expect(result.success).toBe(true);
  });

  it('accepts 30 teams', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, teamCount: 30 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid team count (4)', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, teamCount: 4 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid team count (8)', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, teamCount: 8 });
    expect(result.success).toBe(false);
  });

  it('rejects odd team count', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, teamCount: 7 });
    expect(result.success).toBe(false);
  });

  it('accepts year range 1901-2025', () => {
    const result = createLeagueSchema.safeParse({
      ...validInput,
      yearRangeStart: 1901,
      yearRangeEnd: 2025,
    });
    expect(result.success).toBe(true);
  });

  it('rejects yearRangeStart before 1901', () => {
    const result = createLeagueSchema.safeParse({
      ...validInput,
      yearRangeStart: 1900,
    });
    expect(result.success).toBe(false);
  });

  it('rejects yearRangeEnd after 2025', () => {
    const result = createLeagueSchema.safeParse({
      ...validInput,
      yearRangeEnd: 2026,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer year', () => {
    const result = createLeagueSchema.safeParse({
      ...validInput,
      yearRangeStart: 1950.5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts injuries enabled true', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, injuriesEnabled: true });
    expect(result.success).toBe(true);
  });

  it('rejects non-boolean injuriesEnabled', () => {
    const result = createLeagueSchema.safeParse({ ...validInput, injuriesEnabled: 'yes' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = createLeagueSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = createLeagueSchema.safeParse({
      ...validInput,
      extraField: 'should be removed',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)['extraField']).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// joinLeagueSchema
// ---------------------------------------------------------------------------

describe('joinLeagueSchema', () => {
  it('accepts valid 12-char alphanumeric key', () => {
    const result = joinLeagueSchema.safeParse({ inviteKey: 'AbCdEf123456' });
    expect(result.success).toBe(true);
  });

  it('rejects key shorter than 12 chars', () => {
    const result = joinLeagueSchema.safeParse({ inviteKey: 'AbCdEf12345' });
    expect(result.success).toBe(false);
  });

  it('rejects key longer than 12 chars', () => {
    const result = joinLeagueSchema.safeParse({ inviteKey: 'AbCdEf1234567' });
    expect(result.success).toBe(false);
  });

  it('rejects key with special characters', () => {
    const result = joinLeagueSchema.safeParse({ inviteKey: 'AbCdEf12345!' });
    expect(result.success).toBe(false);
  });

  it('rejects key with spaces', () => {
    const result = joinLeagueSchema.safeParse({ inviteKey: 'AbCdEf 12345' });
    expect(result.success).toBe(false);
  });

  it('rejects missing inviteKey', () => {
    const result = joinLeagueSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
