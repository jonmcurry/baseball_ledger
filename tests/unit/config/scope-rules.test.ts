/**
 * Structural tests: Code scoping rules (REQ-SCOPE-001 through REQ-SCOPE-007)
 *
 * Verifies feature-scoped artifacts don't import across features,
 * fixed-home artifacts reside in correct locations, and
 * architectural constraints are enforced.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, relative } from 'path';

const SRC_DIR = resolve(__dirname, '..', '..', '..', 'src');
const FEATURES_DIR = resolve(SRC_DIR, 'features');

function listFilesRecursive(dir: string, ext?: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
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

function getFeatureDirs(): string[] {
  return readdirSync(FEATURES_DIR)
    .filter((d) => statSync(resolve(FEATURES_DIR, d)).isDirectory());
}

describe('Code scoping rules (REQ-SCOPE)', () => {
  // -----------------------------------------------------------------------
  // REQ-SCOPE-003: No cross-feature imports
  // -----------------------------------------------------------------------

  it('REQ-SCOPE-003: Feature modules do not import from other features', () => {
    const featureDirs = getFeatureDirs();
    for (const featureDir of featureDirs) {
      const featurePath = resolve(FEATURES_DIR, featureDir);
      const files = [
        ...listFilesRecursive(featurePath, '.ts'),
        ...listFilesRecursive(featurePath, '.tsx'),
      ];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        // Extract all @features/ imports
        const featureImports = content.match(/@features\/([a-z-]+)/g) ?? [];
        for (const imp of featureImports) {
          const importedFeature = imp.replace('@features/', '');
          const relPath = relative(SRC_DIR, file);
          expect(importedFeature).toBe(featureDir);
        }
      }
    }
  });

  // -----------------------------------------------------------------------
  // REQ-SCOPE-005: Fixed-home artifacts in correct locations
  // -----------------------------------------------------------------------

  it('REQ-SCOPE-005: Services reside in src/services/', () => {
    const serviceFiles = readdirSync(resolve(SRC_DIR, 'services'))
      .filter((f) => f.endsWith('.ts'));
    expect(serviceFiles.length).toBeGreaterThan(0);
    // No service files should exist inside features/
    const featureServiceFiles = listFilesRecursive(FEATURES_DIR, '.ts')
      .filter((f) => f.includes('-service.ts') || f.includes('Service.ts'));
    expect(featureServiceFiles).toHaveLength(0);
  });

  it('REQ-SCOPE-005: Stores reside in src/stores/', () => {
    const storeFiles = readdirSync(resolve(SRC_DIR, 'stores'))
      .filter((f) => f.endsWith('Store.ts'));
    expect(storeFiles.length).toBeGreaterThan(0);
    // No store files should exist inside features/
    const featureStoreFiles = listFilesRecursive(FEATURES_DIR, '.ts')
      .filter((f) => f.includes('Store.ts'));
    expect(featureStoreFiles).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // REQ-SCOPE-002: Feature-scoped hooks follow naming convention
  // -----------------------------------------------------------------------

  it('REQ-SCOPE-002: Feature-scoped hooks use use*.ts naming', () => {
    const featureDirs = getFeatureDirs();
    for (const featureDir of featureDirs) {
      const hooksDir = resolve(FEATURES_DIR, featureDir, 'hooks');
      if (!existsSync(hooksDir)) continue;
      const hookFiles = readdirSync(hooksDir).filter((f) => f.endsWith('.ts'));
      for (const file of hookFiles) {
        expect(file).toMatch(/^use[A-Z]/);
      }
    }
  });

  // -----------------------------------------------------------------------
  // REQ-SCOPE-007: Test files mirror source structure
  // -----------------------------------------------------------------------

  it('REQ-SCOPE-007: Test directory mirrors src structure for major layers', () => {
    const testDir = resolve(__dirname, '..', '..');
    const expectedDirs = ['stores', 'services', 'hooks', 'features'];
    for (const dir of expectedDirs) {
      const fullPath = resolve(testDir, 'unit', dir);
      expect(existsSync(fullPath)).toBe(true);
    }
  });
});
