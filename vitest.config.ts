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
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
    },
  },
});
