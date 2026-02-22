/**
 * BroadsheetShell
 *
 * Root layout wrapper for the broadsheet newspaper grid.
 * 3-column CSS Grid: folio (left nav) | content | marginalia (right context).
 *
 * Desktop: full 3-column broadsheet (1440px max).
 * Tablet: collapsed folio (icon-only) + content.
 * Mobile: single column with bottom folio nav.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import type { ReactNode } from 'react';
import { ErrorBoundary } from '../feedback/ErrorBoundary';

export interface BroadsheetShellProps {
  masthead: ReactNode;
  folio: ReactNode;
  marginalia?: ReactNode;
  colophon: ReactNode;
  children: ReactNode;
}

export function BroadsheetShell({
  masthead,
  folio,
  marginalia,
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

      {/* Masthead spans full width above the grid */}
      {masthead}

      {/* 3-column broadsheet grid */}
      <div className="broadsheet-grid">
        {/* Left: Folio navigation */}
        <nav aria-label="Main navigation">
          {folio}
        </nav>

        {/* Center: Main content */}
        <ErrorBoundary>
          <main
            id="main-content"
            className="min-h-[calc(100vh-3rem)] px-gutter py-gutter max-md:pb-24"
          >
            {children}
          </main>
        </ErrorBoundary>

        {/* Right: Marginalia (desktop only, hidden via CSS) */}
        {marginalia && (
          <aside aria-label="Contextual information" className="marginalia">
            {marginalia}
          </aside>
        )}
      </div>

      {/* Colophon spans full width below the grid */}
      {colophon}
    </div>
  );
}

export default BroadsheetShell;
