import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@stores': path.resolve(__dirname, 'src/stores'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@workers': path.resolve(__dirname, 'src/workers'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/unit/components/**', 'jsdom'],
      ['tests/unit/features/**', 'jsdom'],
      ['tests/unit/hooks/**', 'jsdom'],
      ['tests/e2e/**', 'jsdom'],
    ],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10_000,
    pool: 'forks',
    coverage: {
      /**
       * REQ-TEST-003 / REQ-TEST-004: Per-directory coverage thresholds.
       *
       * Provider: V8 (native, fast). Istanbul available as fallback.
       * Coverage is NOT enabled by default; use `npx vitest run --coverage`
       * to collect and enforce thresholds.
       *
       * NOTE: V8 coverage has a known issue on Node 24 + Windows where
       * all metrics report 0%. This does not affect CI (Linux + Node 22).
       * See: https://github.com/angular/angular-cli/issues/31895
       */
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      all: true,
      include: [
        'src/lib/**/*.ts',
        'src/services/**/*.ts',
        'src/stores/**/*.ts',
        'src/hooks/**/*.ts',
        'src/workers/**/*.ts',
        'api/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        'src/lib/types/**',
      ],
      thresholds: {
        // REQ-TEST-003: Global floor -- CI fails below these
        lines: 85,
        branches: 80,
        statements: 85,
        functions: 80,
        // REQ-TEST-003: Per-directory overrides
        'src/lib/rng/**': {
          lines: 100,
          branches: 100,
          statements: 100,
          functions: 100,
        },
        'src/lib/simulation/**': {
          lines: 95,
          branches: 90,
          statements: 95,
          functions: 90,
        },
        'src/lib/card-generator/**': {
          lines: 95,
          branches: 90,
          statements: 95,
          functions: 90,
        },
        'src/lib/draft/**': {
          lines: 90,
          branches: 85,
          statements: 90,
          functions: 85,
        },
        'src/lib/stats/**': {
          lines: 90,
          branches: 85,
          statements: 90,
          functions: 85,
        },
        'src/lib/csv/**': {
          lines: 85,
          branches: 80,
          statements: 85,
          functions: 80,
        },
        'src/lib/schedule/**': {
          lines: 85,
          branches: 80,
          statements: 85,
          functions: 80,
        },
        'api/**': {
          lines: 80,
          branches: 75,
          statements: 80,
          functions: 75,
        },
        'src/services/**': {
          lines: 75,
          branches: 70,
          statements: 75,
          functions: 70,
        },
      },
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'tests/**/*.bench.ts'],
  },
});
