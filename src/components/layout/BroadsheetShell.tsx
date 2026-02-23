/**
 * BroadsheetShell
 *
 * Root layout wrapper. Single-column layout with sticky top nav,
 * full-width content area, and colophon footer.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import type { ReactNode } from 'react';
import { ErrorBoundary } from '../feedback/ErrorBoundary';

export interface BroadsheetShellProps {
  topNav: ReactNode;
  colophon: ReactNode;
  children: ReactNode;
}

export function BroadsheetShell({
  topNav,
  colophon,
  children,
}: BroadsheetShellProps) {
  return (
    <div className="min-h-screen bg-surface-base font-body text-[var(--text-primary)] relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-surface-base"
      >
        Skip to content
      </a>

      {/* Sticky top navigation */}
      {topNav}

      {/* Full-width main content */}
      <ErrorBoundary>
        <main id="main-content" className="main-content">
          {children}
        </main>
      </ErrorBoundary>

      {/* Colophon footer */}
      {colophon}
    </div>
  );
}

export default BroadsheetShell;
