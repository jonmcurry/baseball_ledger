/**
 * Structural tests: API contracts and infrastructure
 * (REQ-API-009, REQ-API-010, REQ-ENV-001, REQ-ERR-014, REQ-TEST-009)
 *
 * Verifies response helpers, API types, env var completeness,
 * logger levels, and fixture metadata.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

const ROOT_DIR = resolve(__dirname, '..', '..', '..');
const SRC_DIR = resolve(ROOT_DIR, 'src');
const API_DIR = resolve(ROOT_DIR, 'api');
const FIXTURES_DIR = resolve(ROOT_DIR, 'tests', 'fixtures');

describe('API contracts and infrastructure', () => {
  // -----------------------------------------------------------------------
  // REQ-API-009: Response helpers exist and are used by endpoints
  // -----------------------------------------------------------------------

  it('REQ-API-009: response.ts exports ok, created, paginated helpers', () => {
    const content = readFileSync(resolve(API_DIR, '_lib', 'response.ts'), 'utf-8');
    expect(content).toContain('export function ok');
    expect(content).toContain('export function created');
    expect(content).toContain('export function paginated');
  });

  it('REQ-API-009: all league endpoint files import response helpers', () => {
    const leagueDir = resolve(API_DIR, 'leagues', '[id]');
    const endpointFiles = readdirSync(leagueDir)
      .filter((f) => f.endsWith('.ts') && !f.startsWith('_'));

    expect(endpointFiles.length).toBeGreaterThan(0);

    for (const f of endpointFiles) {
      const content = readFileSync(resolve(leagueDir, f), 'utf-8');
      // Each endpoint should import from the response module
      expect(content).toMatch(/from\s+['"].*response['"]/);
    }
  });

  // -----------------------------------------------------------------------
  // REQ-API-010: API response types
  // -----------------------------------------------------------------------

  it('REQ-API-010: api.ts exports ApiResponse and PaginatedResponse interfaces', () => {
    const content = readFileSync(resolve(SRC_DIR, 'lib', 'types', 'api.ts'), 'utf-8');
    expect(content).toContain('ApiResponse<T>');
    expect(content).toContain('PaginatedResponse<T>');
    // PaginatedResponse should extend ApiResponse
    expect(content).toMatch(/PaginatedResponse<T>\s+extends\s+ApiResponse/);
  });

  // -----------------------------------------------------------------------
  // REQ-ENV-001: All VITE_ vars used in source are documented
  // -----------------------------------------------------------------------

  it('REQ-ENV-001: every VITE_ var in vite-env.d.ts appears in .env.example', () => {
    const envExample = readFileSync(resolve(ROOT_DIR, '.env.example'), 'utf-8');
    const viteEnv = readFileSync(resolve(SRC_DIR, 'vite-env.d.ts'), 'utf-8');

    // Extract VITE_ variable names from vite-env.d.ts (skip Vite builtins: DEV, PROD, MODE)
    const viteVars = viteEnv.match(/readonly\s+(VITE_\w+)/g) ?? [];
    const varNames = viteVars.map((m) => m.replace(/^readonly\s+/, ''));

    expect(varNames.length).toBeGreaterThan(0);

    for (const v of varNames) {
      expect(envExample).toContain(v);
    }
  });

  // -----------------------------------------------------------------------
  // REQ-ERR-014: Logger has all required log levels
  // -----------------------------------------------------------------------

  it('REQ-ERR-014: logger exports info, warn, error methods', () => {
    const content = readFileSync(resolve(API_DIR, '_lib', 'logger.ts'), 'utf-8');
    expect(content).toContain("'ERROR'");
    expect(content).toContain("'WARN'");
    expect(content).toContain("'INFO'");
    // Verify exported methods
    expect(content).toMatch(/info\s*\(/);
    expect(content).toMatch(/warn\s*\(/);
    expect(content).toMatch(/error\s*\(/);
  });

  // -----------------------------------------------------------------------
  // REQ-TEST-009: All fixture files export _meta
  // -----------------------------------------------------------------------

  it('REQ-TEST-009: every fixture file in tests/fixtures/ exports _meta', () => {
    const fixtureFiles = readdirSync(FIXTURES_DIR)
      .filter((f) => f.endsWith('.ts'));

    expect(fixtureFiles.length).toBeGreaterThan(0);

    for (const f of fixtureFiles) {
      const content = readFileSync(resolve(FIXTURES_DIR, f), 'utf-8');
      expect(content).toContain('export const _meta');
    }
  });

  it('REQ-TEST-009: _meta objects contain description, usedBy, and requirements', () => {
    const fixtureFiles = readdirSync(FIXTURES_DIR)
      .filter((f) => f.endsWith('.ts'));

    for (const f of fixtureFiles) {
      const content = readFileSync(resolve(FIXTURES_DIR, f), 'utf-8');
      expect(content).toContain('description:');
      expect(content).toContain('usedBy:');
      expect(content).toContain('requirements:');
    }
  });
});
