import { generateInviteKey } from '@lib/league/invite-key';
import { SeededRNG } from '@lib/rng/seeded-rng';

// ---------------------------------------------------------------------------
// generateInviteKey (REQ-LGE-003)
// ---------------------------------------------------------------------------
describe('generateInviteKey (REQ-LGE-003)', () => {
  it('generates a 12-character string', () => {
    const key = generateInviteKey(new SeededRNG(42));
    expect(key).toHaveLength(12);
  });

  it('contains only alphanumeric characters', () => {
    for (let seed = 0; seed < 50; seed++) {
      const key = generateInviteKey(new SeededRNG(seed));
      expect(key).toMatch(/^[A-Za-z0-9]{12}$/);
    }
  });

  it('is deterministic with same seed', () => {
    const key1 = generateInviteKey(new SeededRNG(99));
    const key2 = generateInviteKey(new SeededRNG(99));
    expect(key1).toBe(key2);
  });

  it('produces different keys with different seeds', () => {
    const key1 = generateInviteKey(new SeededRNG(1));
    const key2 = generateInviteKey(new SeededRNG(2));
    expect(key1).not.toBe(key2);
  });

  it('produces unique keys across many seeds', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateInviteKey(new SeededRNG(i)));
    }
    expect(keys.size).toBe(100);
  });

  it('uses case-sensitive characters', () => {
    // Over many keys, we should see both uppercase and lowercase
    let hasUpper = false;
    let hasLower = false;
    let hasDigit = false;
    for (let i = 0; i < 100; i++) {
      const key = generateInviteKey(new SeededRNG(i));
      if (/[A-Z]/.test(key)) hasUpper = true;
      if (/[a-z]/.test(key)) hasLower = true;
      if (/[0-9]/.test(key)) hasDigit = true;
    }
    expect(hasUpper).toBe(true);
    expect(hasLower).toBe(true);
    expect(hasDigit).toBe(true);
  });
});
