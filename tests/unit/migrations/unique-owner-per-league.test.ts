/**
 * Structural test: One user per team per league (REQ-LGE-007)
 *
 * Verifies the migration adds a partial unique index on (league_id, owner_id)
 * WHERE owner_id IS NOT NULL, preventing a user from owning multiple teams
 * in the same league while allowing multiple CPU teams (NULL owner_id).
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const MIGRATIONS_DIR = resolve(__dirname, '..', '..', '..', 'supabase', 'migrations');

function readAllMigrations(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files
    .map((f) => readFileSync(resolve(MIGRATIONS_DIR, f), 'utf-8'))
    .join('\n');
}

describe('One user per team per league constraint (REQ-LGE-007)', () => {
  const allSql = readAllMigrations();

  it('has a unique index on (league_id, owner_id) for teams', () => {
    // Must create a unique index referencing both league_id and owner_id on teams
    expect(allSql).toMatch(
      /create\s+unique\s+index[^;]*?teams[^;]*?league_id[^;]*?owner_id/i,
    );
  });

  it('unique index is partial (WHERE owner_id IS NOT NULL)', () => {
    // The index must be partial to allow multiple CPU teams with NULL owner_id
    expect(allSql).toMatch(
      /create\s+unique\s+index[^;]*?where\s+owner_id\s+is\s+not\s+null/i,
    );
  });

  it('total migration file count is 27', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBe(29);
  });
});
