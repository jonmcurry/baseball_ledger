/**
 * Structural tests: Environment configuration (REQ-ENV-002 through REQ-ENV-008)
 *
 * Verifies .env.example, vite-env.d.ts, vercel.json, .gitignore,
 * and configuration modules exist with correct content.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '..', '..', '..');
const SRC_DIR = resolve(ROOT_DIR, 'src');

describe('Environment configuration (REQ-ENV)', () => {
  // -----------------------------------------------------------------------
  // REQ-ENV-002: .env.example with all required variables
  // -----------------------------------------------------------------------

  it('REQ-ENV-002: .env.example exists', () => {
    expect(existsSync(resolve(ROOT_DIR, '.env.example'))).toBe(true);
  });

  it('REQ-ENV-002: .env.example lists all required variables', () => {
    const content = readFileSync(resolve(ROOT_DIR, '.env.example'), 'utf-8');
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_DB_URL',
      'ANTHROPIC_API_KEY',
    ];
    for (const v of requiredVars) {
      expect(content).toContain(v);
    }
  });

  it('REQ-ENV-002: .env.example contains no real credentials', () => {
    const content = readFileSync(resolve(ROOT_DIR, '.env.example'), 'utf-8');
    // Should only have placeholder values, not real keys (real Anthropic keys are 100+ chars)
    expect(content).not.toMatch(/sk-ant-api\d+-[a-zA-Z0-9]{40,}/);
    expect(content).not.toMatch(/eyJ[a-zA-Z0-9]{40,}/);
  });

  // -----------------------------------------------------------------------
  // REQ-ENV-003 / REQ-ENV-004: Centralized config module
  // -----------------------------------------------------------------------

  it('REQ-ENV-003: Client config module exists at src/lib/config.ts', () => {
    expect(existsSync(resolve(SRC_DIR, 'lib', 'config.ts'))).toBe(true);
  });

  // -----------------------------------------------------------------------
  // REQ-ENV-005: Server config module
  // -----------------------------------------------------------------------

  it('REQ-ENV-005: Server config module exists at api/_lib/config.ts', () => {
    expect(existsSync(resolve(ROOT_DIR, 'api', '_lib', 'config.ts'))).toBe(true);
  });

  // -----------------------------------------------------------------------
  // REQ-ENV-006: vite-env.d.ts with ImportMetaEnv
  // -----------------------------------------------------------------------

  it('REQ-ENV-006: vite-env.d.ts declares ImportMetaEnv interface', () => {
    const content = readFileSync(resolve(SRC_DIR, 'vite-env.d.ts'), 'utf-8');
    expect(content).toContain('ImportMetaEnv');
    expect(content).toContain('VITE_SUPABASE_URL');
    expect(content).toContain('VITE_SUPABASE_ANON_KEY');
  });

  // -----------------------------------------------------------------------
  // REQ-ENV-007: vercel.json
  // -----------------------------------------------------------------------

  it('REQ-ENV-007: vercel.json exists with API configuration', () => {
    const content = readFileSync(resolve(ROOT_DIR, 'vercel.json'), 'utf-8');
    const config = JSON.parse(content);
    expect(config).toHaveProperty('rewrites');
    expect(config).toHaveProperty('headers');
  });

  // -----------------------------------------------------------------------
  // REQ-ENV-008: .gitignore excludes secrets
  // -----------------------------------------------------------------------

  it('REQ-ENV-008: .gitignore excludes .env.local', () => {
    const content = readFileSync(resolve(ROOT_DIR, '.gitignore'), 'utf-8');
    expect(content).toContain('.env.local');
  });

  it('REQ-ENV-008: .gitignore does NOT exclude .env.example', () => {
    const content = readFileSync(resolve(ROOT_DIR, '.gitignore'), 'utf-8');
    // Lines starting with .env.example should not be present as exclusions
    const lines = content.split('\n').map((l) => l.trim());
    expect(lines).not.toContain('.env.example');
  });
});
