/**
 * Structural test: DevTools conditional enablement (REQ-STATE-016)
 *
 * Verifies all 6 Zustand stores use `enabled: import.meta.env.DEV`
 * so DevTools middleware is stripped in production builds.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const STORES_DIR = resolve(__dirname, '..', '..', '..', 'src', 'stores');

const STORES = [
  'authStore.ts',
  'leagueStore.ts',
  'rosterStore.ts',
  'simulationStore.ts',
  'statsStore.ts',
  'draftStore.ts',
];

describe('DevTools conditional enablement (REQ-STATE-016)', () => {
  for (const store of STORES) {
    it(`${store} has enabled: import.meta.env.DEV`, () => {
      const content = readFileSync(resolve(STORES_DIR, store), 'utf-8');
      expect(content).toContain('enabled: import.meta.env.DEV');
    });
  }
});
