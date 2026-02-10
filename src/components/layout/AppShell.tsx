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
    <div className="min-h-screen bg-old-lace">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-button focus:bg-ballpark focus:px-4 focus:py-2 focus:text-old-lace"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-ledger border-l-spine border-l-sandstone shadow-ledger">
        <ErrorBoundary>
          <main id="main-content" className="p-gutter-xl">
            {children}
          </main>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default AppShell;
