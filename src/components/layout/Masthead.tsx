/**
 * Masthead
 *
 * Two-row navigation: dark navy identity bar + light sepia tab row.
 * Row 1 (app-nav): Logo, league name, season info, user controls.
 * Row 2 (app-nav-tabs): Contextual page tabs from FolioNav.
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
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header role="banner" className="z-30 sticky top-0">
      {/* Row 1: Dark navy identity bar */}
      <div className="app-nav">
        {/* Left: logotype + league */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <h1 className="app-nav-logo whitespace-nowrap">Baseball Ledger</h1>
          {leagueName && (
            <>
              <span className="text-[var(--text-on-dark-muted)] text-[10px]" aria-hidden="true">/</span>
              <span className="app-nav-context max-md:hidden">{leagueName}</span>
            </>
          )}
        </div>

        {/* Right: season info + user avatar + logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {seasonInfo && (
            <span className="app-nav-context max-lg:hidden">{seasonInfo}</span>
          )}
          <div
            className="flex items-center justify-center w-6 h-6 bg-[var(--surface-dark-hover)] text-[var(--text-on-dark)] font-stat text-[10px] font-bold max-md:hidden"
            title={userName}
            aria-hidden="true"
          >
            {initial}
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="app-nav-user"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Row 2: Light sepia tab navigation */}
      <nav aria-label="Main navigation" className="app-nav-tabs">
        {navigation}
      </nav>
    </header>
  );
}

export default Masthead;
