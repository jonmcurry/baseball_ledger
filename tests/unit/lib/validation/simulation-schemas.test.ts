/**
 * Tests for Simulation & Team Validation Schemas (REQ-ERR-005)
 *
 * simulateSchema: days to simulate (1, 7, 30, or 162)
 * updateTeamSchema: team name and manager profile updates
 */

import {
  simulateSchema,
  updateTeamSchema,
} from '@lib/validation/simulation-schemas';

// ---------------------------------------------------------------------------
// simulateSchema
// ---------------------------------------------------------------------------

describe('simulateSchema', () => {
  it('accepts days: 1', () => {
    const result = simulateSchema.safeParse({ days: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts days: 7', () => {
    const result = simulateSchema.safeParse({ days: 7 });
    expect(result.success).toBe(true);
  });

  it('accepts days: 30', () => {
    const result = simulateSchema.safeParse({ days: 30 });
    expect(result.success).toBe(true);
  });

  it('accepts days: 162 (full season)', () => {
    const result = simulateSchema.safeParse({ days: 162 });
    expect(result.success).toBe(true);
  });

  it('rejects arbitrary day count', () => {
    const result = simulateSchema.safeParse({ days: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects zero days', () => {
    const result = simulateSchema.safeParse({ days: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative days', () => {
    const result = simulateSchema.safeParse({ days: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts optional seed', () => {
    const result = simulateSchema.safeParse({ days: 1, seed: 42 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seed).toBe(42);
    }
  });

  it('seed defaults to undefined when not provided', () => {
    const result = simulateSchema.safeParse({ days: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seed).toBeUndefined();
    }
  });

  it('rejects non-integer seed', () => {
    const result = simulateSchema.safeParse({ days: 1, seed: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects missing days field', () => {
    const result = simulateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateTeamSchema
// ---------------------------------------------------------------------------

describe('updateTeamSchema', () => {
  it('accepts valid team name update', () => {
    const result = updateTeamSchema.safeParse({ name: 'Brooklyn Dodgers' });
    expect(result.success).toBe(true);
  });

  it('accepts valid manager profile update', () => {
    const result = updateTeamSchema.safeParse({ managerProfile: 'aggressive' });
    expect(result.success).toBe(true);
  });

  it('accepts both name and managerProfile together', () => {
    const result = updateTeamSchema.safeParse({
      name: 'New York Yankees',
      managerProfile: 'analytical',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all four manager profiles', () => {
    for (const profile of ['conservative', 'aggressive', 'balanced', 'analytical']) {
      const result = updateTeamSchema.safeParse({ managerProfile: profile });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid manager profile', () => {
    const result = updateTeamSchema.safeParse({ managerProfile: 'passive' });
    expect(result.success).toBe(false);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = updateTeamSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 50 chars', () => {
    const result = updateTeamSchema.safeParse({ name: 'A'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('rejects empty object (at least one field required)', () => {
    const result = updateTeamSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
