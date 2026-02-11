/**
 * Structural tests: Migration file standards (REQ-MIG-002, REQ-MIG-003, REQ-MIG-007, REQ-MIG-008)
 *
 * Verifies migration naming conventions, header blocks, seed file
 * completeness, and idempotency patterns.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, basename } from 'path';

const ROOT_DIR = resolve(__dirname, '..', '..', '..');
const MIGRATIONS_DIR = resolve(ROOT_DIR, 'supabase', 'migrations');
const SEED_FILE = resolve(ROOT_DIR, 'supabase', 'seed.sql');

/** All .sql files in supabase/migrations/ sorted by name. */
function getMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

describe('Migration file standards (REQ-MIG)', () => {
  // -----------------------------------------------------------------------
  // REQ-MIG-002: 5-digit sequential prefix + snake_case naming
  // -----------------------------------------------------------------------

  it('REQ-MIG-002: all migration files use 5-digit prefix + snake_case', () => {
    const files = getMigrationFiles();
    expect(files.length).toBeGreaterThan(0);

    const pattern = /^\d{5}_[a-z][a-z0-9_]*\.sql$/;
    for (const f of files) {
      expect(f).toMatch(pattern);
    }
  });

  it('REQ-MIG-002: migration prefixes are sequential with no gaps', () => {
    const files = getMigrationFiles();
    const prefixes = files.map((f) => parseInt(f.slice(0, 5), 10));

    for (let i = 0; i < prefixes.length; i++) {
      expect(prefixes[i]).toBe(i + 1);
    }
  });

  // -----------------------------------------------------------------------
  // REQ-MIG-003: Header comment block on every migration
  // -----------------------------------------------------------------------

  it('REQ-MIG-003: every migration has a header with Migration, Purpose, Author, Date, Depends', () => {
    const files = getMigrationFiles();
    const requiredFields = ['Migration:', 'Purpose:', 'Author:', 'Date:', 'Depends:'];

    for (const f of files) {
      const content = readFileSync(resolve(MIGRATIONS_DIR, f), 'utf-8');
      // Header should be within the first 10 lines
      const headerLines = content.split('\n').slice(0, 10).join('\n');

      for (const field of requiredFields) {
        expect(headerLines).toContain(field);
      }
    }
  });

  it('REQ-MIG-003: header Migration line matches filename', () => {
    const files = getMigrationFiles();

    for (const f of files) {
      const content = readFileSync(resolve(MIGRATIONS_DIR, f), 'utf-8');
      const headerLines = content.split('\n').slice(0, 10).join('\n');
      // The Migration: line should contain the filename
      expect(headerLines).toContain(f);
    }
  });

  // -----------------------------------------------------------------------
  // REQ-MIG-007: seed.sql exists with required data categories
  // -----------------------------------------------------------------------

  it('REQ-MIG-007: seed.sql exists', () => {
    expect(existsSync(SEED_FILE)).toBe(true);
  });

  it('REQ-MIG-007: seed.sql contains test users, league, teams, and schedule', () => {
    const content = readFileSync(SEED_FILE, 'utf-8');

    // Test users (inserted into auth.users)
    expect(content).toContain('auth.users');

    // Sample league
    expect(content).toContain('public.leagues');

    // Sample teams
    expect(content).toContain('public.teams');

    // Sample schedule
    expect(content).toContain('public.schedule');
  });

  it('REQ-MIG-007: seed UUIDs use the 00000000-0000-0000-0000 prefix pattern', () => {
    const content = readFileSync(SEED_FILE, 'utf-8');
    // At least one recognizable seed UUID should be present
    expect(content).toMatch(/00000000-0000-0000-0000-\d{12}/);
  });

  // -----------------------------------------------------------------------
  // REQ-MIG-008: All INSERTs use ON CONFLICT for idempotency
  // -----------------------------------------------------------------------

  it('REQ-MIG-008: every INSERT in seed.sql uses ON CONFLICT', () => {
    const content = readFileSync(SEED_FILE, 'utf-8');

    // Split by INSERT to find each statement
    const insertBlocks = content.split(/\bINSERT\b/i).slice(1); // skip text before first INSERT
    expect(insertBlocks.length).toBeGreaterThan(0);

    for (let i = 0; i < insertBlocks.length; i++) {
      // Each block from INSERT to next INSERT (or EOF) should contain ON CONFLICT
      expect(insertBlocks[i]).toContain('ON CONFLICT');
    }
  });
});
