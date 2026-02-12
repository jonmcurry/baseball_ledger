/**
 * AppShell
 *
 * Main layout wrapper with skip-to-content link, centered max-width container,
 * and ErrorBoundary wrapping children.
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
    <div className="min-h-screen bg-surface-base font-body text-[var(--text-primary)] flex flex-col items-center relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-button focus:bg-accent focus:px-4 focus:py-2 focus:text-surface-base"
      >
        Skip to content
      </a>

      <div className="w-full max-w-ledger min-h-screen bg-surface-base relative">
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
