/**
 * Persist Migration Config Factory
 *
 * REQ-STATE-009: Creates version/migrate configuration for Zustand persist middleware.
 * When persisted state version < current version, migrations run sequentially.
 * Missing migrations for a version step fall back to defaultState for safety.
 *
 * Layer 4: State management infrastructure.
 */

export interface MigrationConfig<T> {
  version: number;
  migrate: (persistedState: unknown, version: number) => T;
}

/**
 * Create a version/migrate config to spread into Zustand persist options.
 *
 * @param currentVersion - The current schema version (integer, starts at 1)
 * @param defaultState - Fresh default state to use as fallback
 * @param migrations - Map of version number -> transform function.
 *   Key N means "migrate FROM version N-1 TO version N".
 */
export function createMigrationConfig<T>(
  currentVersion: number,
  defaultState: T,
  migrations?: Record<number, (state: unknown) => unknown>,
): MigrationConfig<T> {
  return {
    version: currentVersion,
    migrate: (persistedState: unknown, version: number): T => {
      if (version >= currentVersion) {
        return persistedState as T;
      }

      let state = persistedState;
      for (let v = version + 1; v <= currentVersion; v++) {
        const fn = migrations?.[v];
        if (!fn) {
          return defaultState;
        }
        state = fn(state);
      }
      return state as T;
    },
  };
}
