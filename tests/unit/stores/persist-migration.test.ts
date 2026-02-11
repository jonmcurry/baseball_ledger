/**
 * Tests for createMigrationConfig
 *
 * REQ-STATE-009: Persist migration functions for safe schema evolution.
 */

import { createMigrationConfig } from '@stores/persist-migration';

interface TestState {
  name: string;
  count: number;
}

const defaultState: TestState = { name: 'default', count: 0 };

describe('createMigrationConfig', () => {
  it('returns defaultState when persisted version is 0 and no migrations defined', () => {
    const config = createMigrationConfig(1, defaultState);
    const result = config.migrate({ name: 'old' }, 0);
    expect(result).toEqual(defaultState);
  });

  it('runs migration function for version 1 -> 2', () => {
    const config = createMigrationConfig(2, defaultState, {
      2: (state: unknown) => {
        const s = state as { name: string };
        return { ...s, count: 10 };
      },
    });
    const result = config.migrate({ name: 'existing' }, 1);
    expect(result).toEqual({ name: 'existing', count: 10 });
  });

  it('chains migrations sequentially (1 -> 2 -> 3)', () => {
    const config = createMigrationConfig(3, defaultState, {
      2: (state: unknown) => {
        const s = state as { name: string };
        return { ...s, count: 5 };
      },
      3: (state: unknown) => {
        const s = state as { name: string; count: number };
        return { ...s, count: s.count * 2 };
      },
    });
    const result = config.migrate({ name: 'v1' }, 1);
    expect(result).toEqual({ name: 'v1', count: 10 });
  });

  it('falls back to defaultState when migration for a version is missing', () => {
    const config = createMigrationConfig(3, defaultState, {
      // Migration for version 2 exists, but version 3 is missing
      2: (state: unknown) => {
        const s = state as { name: string };
        return { ...s, count: 5 };
      },
    });
    const result = config.migrate({ name: 'v1' }, 1);
    expect(result).toEqual(defaultState);
  });

  it('returns state unchanged when version matches currentVersion', () => {
    const config = createMigrationConfig(1, defaultState);
    const existing = { name: 'current', count: 42 };
    const result = config.migrate(existing, 1);
    expect(result).toEqual(existing);
  });
});
