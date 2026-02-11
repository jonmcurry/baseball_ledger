/**
 * Structural tests: Architecture requirements (REQ-ARCH-001 through REQ-ARCH-005)
 *
 * Verifies the 7-layer architecture, naming conventions, path aliases,
 * and dependency direction rules defined in the SRD.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, basename, extname } from 'path';

const SRC_DIR = resolve(__dirname, '..', '..', '..', 'src');
const ROOT_DIR = resolve(__dirname, '..', '..', '..');

function listFilesRecursive(dir: string, ext?: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...listFilesRecursive(full, ext));
    } else if (!ext || full.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

describe('Architecture requirements (REQ-ARCH)', () => {
  // -----------------------------------------------------------------------
  // REQ-ARCH-001: Seven-layer architecture
  // -----------------------------------------------------------------------

  it('REQ-ARCH-001: src/ has all 7 expected layer directories', () => {
    const entries = readdirSync(SRC_DIR).filter((e) =>
      statSync(resolve(SRC_DIR, e)).isDirectory(),
    );
    const expected = ['lib', 'services', 'stores', 'hooks', 'components', 'features', 'styles'];
    for (const dir of expected) {
      expect(entries).toContain(dir);
    }
  });

  // -----------------------------------------------------------------------
  // REQ-ARCH-002: No upward imports (stores cannot import from features, etc.)
  // -----------------------------------------------------------------------

  it('REQ-ARCH-002: stores/ files do not import from @features/', () => {
    const storeFiles = listFilesRecursive(resolve(SRC_DIR, 'stores'), '.ts');
    for (const file of storeFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/@features\//);
    }
  });

  it('REQ-ARCH-002: services/ files do not import from @stores/ or @features/', () => {
    const serviceFiles = listFilesRecursive(resolve(SRC_DIR, 'services'), '.ts');
    for (const file of serviceFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/@stores\//);
      expect(content).not.toMatch(/@features\//);
    }
  });

  it('REQ-ARCH-002: lib/ files do not import from @stores/, @services/, or @features/', () => {
    const libFiles = listFilesRecursive(resolve(SRC_DIR, 'lib'), '.ts');
    for (const file of libFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/@stores\//);
      expect(content).not.toMatch(/@services\//);
      expect(content).not.toMatch(/@features\//);
    }
  });

  // -----------------------------------------------------------------------
  // REQ-ARCH-003: TypeScript path aliases (7 aliases)
  // -----------------------------------------------------------------------

  it('REQ-ARCH-003: tsconfig.json has all 7 path aliases', () => {
    const raw = readFileSync(resolve(ROOT_DIR, 'tsconfig.json'), 'utf-8');
    // Strip single-line comments before parsing (tsconfig allows them)
    const stripped = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const tsconfig = JSON.parse(stripped);
    const paths = tsconfig.compilerOptions?.paths ?? {};
    const expectedAliases = [
      '@lib/*',
      '@components/*',
      '@features/*',
      '@hooks/*',
      '@stores/*',
      '@services/*',
      '@workers/*',
    ];
    for (const alias of expectedAliases) {
      expect(paths).toHaveProperty(alias);
    }
  });

  // -----------------------------------------------------------------------
  // REQ-ARCH-004: Naming conventions
  // -----------------------------------------------------------------------

  it('REQ-ARCH-004: React components use PascalCase filenames', () => {
    const componentFiles = listFilesRecursive(resolve(SRC_DIR, 'components'), '.tsx');
    for (const file of componentFiles) {
      const name = basename(file, extname(file));
      // PascalCase: starts with uppercase letter
      expect(name).toMatch(/^[A-Z]/);
    }
  });

  it('REQ-ARCH-004: Feature page components use PascalCase filenames', () => {
    const featureFiles = listFilesRecursive(resolve(SRC_DIR, 'features'), '.tsx');
    for (const file of featureFiles) {
      const name = basename(file, extname(file));
      expect(name).toMatch(/^[A-Z]/);
    }
  });

  it('REQ-ARCH-004: Hook files follow use*.ts naming', () => {
    const hookFiles = readdirSync(resolve(SRC_DIR, 'hooks')).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.d.ts'),
    );
    for (const file of hookFiles) {
      expect(file).toMatch(/^use[A-Z]/);
    }
  });

  it('REQ-ARCH-004: Store files follow *Store.ts naming', () => {
    const storeFiles = readdirSync(resolve(SRC_DIR, 'stores')).filter(
      (f) => f.endsWith('.ts') && !f.startsWith('persist-') && !f.startsWith('storage-'),
    );
    for (const file of storeFiles) {
      expect(file).toMatch(/Store\.ts$/);
    }
  });

  it('REQ-ARCH-004a: All .tsx component files use default exports', () => {
    const componentFiles = [
      ...listFilesRecursive(resolve(SRC_DIR, 'components'), '.tsx'),
      ...listFilesRecursive(resolve(SRC_DIR, 'features'), '.tsx'),
    ];
    for (const file of componentFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).toMatch(/export\s+default\s/);
    }
  });

  // -----------------------------------------------------------------------
  // REQ-ARCH-005: No God files -- thin layers stay thin, logic modules capped
  // -----------------------------------------------------------------------

  it('REQ-ARCH-005: Store files stay thin (< 300 lines each)', () => {
    const storeFiles = listFilesRecursive(resolve(SRC_DIR, 'stores'), '.ts');
    for (const file of storeFiles) {
      const lineCount = readFileSync(file, 'utf-8').split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(300);
    }
  });

  it('REQ-ARCH-005: Service files stay thin (< 200 lines each)', () => {
    const serviceFiles = listFilesRecursive(resolve(SRC_DIR, 'services'), '.ts');
    for (const file of serviceFiles) {
      const lineCount = readFileSync(file, 'utf-8').split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(200);
    }
  });

  it('REQ-ARCH-005: Hook files stay thin (< 200 lines each)', () => {
    const hookFiles = listFilesRecursive(resolve(SRC_DIR, 'hooks'), '.ts');
    for (const file of hookFiles) {
      const lineCount = readFileSync(file, 'utf-8').split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(200);
    }
  });

  it('REQ-ARCH-005: No logic module exceeds 1000 lines', () => {
    const libFiles = listFilesRecursive(resolve(SRC_DIR, 'lib'), '.ts');
    for (const file of libFiles) {
      const lineCount = readFileSync(file, 'utf-8').split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(1000);
    }
  });
});
