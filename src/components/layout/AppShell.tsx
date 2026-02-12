/**
 * AppShell
 *
 * Main layout wrapper with skip-to-content link, centered max-width container,
 * book-spine border, and ErrorBoundary wrapping children.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import type { ReactNode } from 'react';
import { ErrorBoundary } from '../feedback/ErrorBoundary';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-cream font-body text-ink selection:bg-gold selection:text-ink flex flex-col items-center relative">
      <div className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply opacity-50 bg-paper-texture" />

      {/* Spine effect on the left */}
      <div className="fixed left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-leather-dark to-leather z-40 shadow-xl" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-button focus:bg-stitch focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <div className="w-full max-w-ledger min-h-screen bg-parchment shadow-2xl relative border-r border-leather/20 ml-3 md:ml-4">
        {/* Binding Shadow */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-10" />

        <ErrorBoundary>
          <main id="main-content" className="flex flex-col min-h-screen">
            {children}
          </main>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default AppShell;
