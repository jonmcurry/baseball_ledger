/**
 * Structural meta-test: REQ-* coverage in test suite (REQ-TEST-010)
 *
 * Verifies that the test suite references all major SRD requirement
 * categories. Individual REQ-* IDs within each category are tracked
 * in TRACEABILITY.md, not in individual test files.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '..', '..', '..');
const TRACEABILITY = resolve(ROOT_DIR, 'tests', 'TRACEABILITY.md');

describe('REQ-* traceability coverage (REQ-TEST-010)', () => {
  const traceability = readFileSync(TRACEABILITY, 'utf-8');

  it('TRACEABILITY.md exists and is non-empty', () => {
    expect(traceability.length).toBeGreaterThan(100);
  });

  it('covers all major SRD requirement categories', () => {
    const requiredCategories = [
      'REQ-SIM',
      'REQ-CARD',
      'REQ-DATA',
      'REQ-LGE',
      'REQ-DFT',
      'REQ-RST',
      'REQ-SCH',
      'REQ-STS',
      'REQ-AI',
      'REQ-AUTH',
      'REQ-API',
      'REQ-ERR',
      'REQ-STATE',
      'REQ-COMP',
      'REQ-MIG',
      'REQ-NFR',
      'REQ-SCOPE',
      'REQ-TEST',
      'REQ-ENV',
      'REQ-UI',
      'REQ-ARCH',
    ];

    for (const cat of requiredCategories) {
      expect(traceability).toContain(cat);
    }
  });

  it('contains at least 100 requirement-to-test mappings', () => {
    // Count rows in markdown tables (lines starting with | REQ-)
    const mappings = traceability.split('\n')
      .filter((line) => line.match(/^\|\s*REQ-/));
    expect(mappings.length).toBeGreaterThanOrEqual(100);
  });

  it('references test file paths in mappings', () => {
    // At least some mappings should point to test files
    const testRefs = traceability.match(/tests\/unit\//g) ?? [];
    expect(testRefs.length).toBeGreaterThan(50);
  });
});
