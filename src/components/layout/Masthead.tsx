/**
 * Masthead
 *
 * Top navigation bar integrating identity + navigation + user controls.
 * Single sticky bar on desktop; nav drops below on mobile.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import type { ReactNode } from 'react';

export interface MastheadProps {
  leagueName: string;
  seasonInfo?: string;
  userName: string;
  onLogout: () => void;
  navigation: ReactNode;
}

export function Masthead({
  leagueName,
  seasonInfo,
  userName,
  onLogout,
  navigation,
}: MastheadProps) {
  return (
    <header role="banner" className="z-30 bg-[var(--surface-base)] sticky top-0">
      <div className="top-nav-bar">
        {/* Left: logotype + league name */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <h1 className="masthead-logotype whitespace-nowrap">Baseball Ledger</h1>
          {leagueName && (
            <>
              <span className="text-[var(--border-default)] text-[10px]" aria-hidden="true">/</span>
              <span className="masthead-subtitle max-md:hidden">{leagueName}</span>
            </>
          )}
        </div>

        {/* Center: Navigation links (hidden on mobile, shown below) */}
        <nav aria-label="Main navigation" className="flex-1 flex justify-center max-md:hidden">
          {navigation}
        </nav>

        {/* Right: season info + user controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {seasonInfo && (
            <span className="dateline text-[10px] max-lg:hidden">{seasonInfo}</span>
          )}
          <span className="font-body text-[10px] text-[var(--text-tertiary)] max-md:hidden">
            {userName}
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="font-body text-[10px] tracking-wider text-[var(--text-tertiary)] hover:text-[var(--accent-secondary)] transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Mobile: nav links drop below identity bar */}
      <div className="md:hidden overflow-x-auto border-b border-[var(--border-default)] bg-[var(--surface-base)]">
        <nav aria-label="Main navigation" className="flex px-gutter">
          {navigation}
        </nav>
      </div>
    </header>
  );
}

export default Masthead;
