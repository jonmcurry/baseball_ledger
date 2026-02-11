/**
 * Tests for league deletion CASCADE constraints (REQ-LGE-010)
 *
 * Structural verification that all migration files referencing leagues(id)
 * include ON DELETE CASCADE, ensuring league deletion removes all child data.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const MIGRATIONS_DIR = resolve(__dirname, '..', '..', '..', 'supabase', 'migrations');

/**
 * Tables that must have ON DELETE CASCADE for their league_id foreign key.
 * Derived from the SRD database schema (REQ-LGE-010).
 */
const LEAGUE_CASCADE_TABLES = [
  'teams',
  'schedule',
  'season_stats',
  'game_logs',
  'archives',
  'simulation_progress',
  'player_pool',
  'transactions',
];

/**
 * Tables that must have ON DELETE CASCADE for their team_id foreign key.
 */
const TEAM_CASCADE_TABLES = [
  'rosters',
];

function readAllMigrations(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files
    .map((f) => readFileSync(resolve(MIGRATIONS_DIR, f), 'utf-8'))
    .join('\n');
}

describe('League deletion CASCADE constraints (REQ-LGE-010)', () => {
  const allSql = readAllMigrations();

  for (const table of LEAGUE_CASCADE_TABLES) {
    it(`${table} has ON DELETE CASCADE for league_id FK`, () => {
      // Match: CREATE TABLE ... <table> ... REFERENCES [public.]leagues(id) ON DELETE CASCADE
      // Account for schema prefix (public.) in references
      const pattern = new RegExp(
        `create\\s+table[^(]*?${table}\\s*\\([\\s\\S]*?references\\s+(?:public\\.)?leagues\\s*\\(\\s*id\\s*\\)\\s+on\\s+delete\\s+cascade`,
        'i',
      );
      expect(allSql).toMatch(pattern);
    });
  }

  for (const table of TEAM_CASCADE_TABLES) {
    it(`${table} has ON DELETE CASCADE for team_id FK`, () => {
      const pattern = new RegExp(
        `create\\s+table[^(]*?${table}\\s*\\([\\s\\S]*?references\\s+(?:public\\.)?teams\\s*\\(\\s*id\\s*\\)\\s+on\\s+delete\\s+cascade`,
        'i',
      );
      expect(allSql).toMatch(pattern);
    });
  }

  it('leagues table exists as root entity', () => {
    expect(allSql).toMatch(/create\s+table.*?leagues/i);
  });

  it('total migration file count matches expected', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBe(19);
  });
});
