/**
 * Invite Key Generation
 *
 * REQ-LGE-003: Generate a 12-character cryptographic invite key
 * (alphanumeric, case-sensitive).
 *
 * Uses SeededRNG for deterministic testing. In production, the caller
 * provides a crypto-seeded RNG instance.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { SeededRNG } from '../rng/seeded-rng';

/** Length of the generated invite key. */
const KEY_LENGTH = 12;

/** Character set: A-Z, a-z, 0-9 (62 characters). */
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a 12-character alphanumeric invite key.
 *
 * @param rng - Seeded RNG for deterministic selection
 * @returns 12-character case-sensitive alphanumeric string
 */
export function generateInviteKey(rng: SeededRNG): string {
  let key = '';
  for (let i = 0; i < KEY_LENGTH; i++) {
    const idx = Math.floor(rng.nextFloat() * CHARSET.length);
    key += CHARSET[idx];
  }
  return key;
}
