import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          simulation: [
            './src/lib/simulation/game-runner',
            './src/lib/simulation/season-runner',
            './src/lib/simulation/engine',
            './src/lib/simulation/plate-appearance',
            './src/lib/simulation/outcome-resolver',
          ],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
