/**
 * Structural test: Required npm scripts (REQ-TEST-018)
 *
 * Verifies all required npm scripts from the SRD exist in package.json.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '..', '..', '..', 'package.json'), 'utf-8'),
);

const REQUIRED_SCRIPTS: Record<string, string> = {
  test: 'vitest run',
  'test:watch': 'vitest',
  'test:coverage': 'vitest run --coverage',
  'test:bench': 'vitest bench',
  'test:e2e': 'playwright test',
  'test:e2e:ui': 'playwright test --ui',
  'test:ci': 'vitest run --coverage && vitest bench && playwright test',
  'db:test': 'supabase test db',
  'db:types': 'supabase gen types typescript --linked > src/lib/types/database.ts',
  'db:push': 'supabase db push',
  'db:push:dry': 'supabase db push --dry-run',
};

describe('Required npm scripts (REQ-TEST-018)', () => {
  for (const [name, expectedValue] of Object.entries(REQUIRED_SCRIPTS)) {
    it(`has "${name}" script with correct command`, () => {
      expect(pkg.scripts[name]).toBe(expectedValue);
    });
  }
});
