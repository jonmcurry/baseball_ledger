/**
 * Masthead
 *
 * Top identity bar for the broadsheet layout.
 * "BASEBALL LEDGER" logotype + league name dateline + user controls.
 * Thinner than the old Header -- just identity, no navigation.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export interface MastheadProps {
  leagueName: string;
  seasonInfo?: string;
  userName: string;
  onLogout: () => void;
}

export function Masthead({
  leagueName,
  seasonInfo,
  userName,
  onLogout,
}: MastheadProps) {
  return (
    <header role="banner" className="relative z-20 bg-[var(--surface-base)]">
      <div className="masthead-bar">
        {/* User controls -- top-right */}
        <div className="absolute top-2 right-gutter-lg flex items-center gap-3 z-10">
          <span className="font-body text-[11px] text-[var(--text-tertiary)] max-md:hidden">
            {userName}
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="font-body text-[11px] tracking-wider text-[var(--text-tertiary)] hover:text-[var(--accent-secondary)] transition-colors"
          >
            Log Out
          </button>
        </div>

        {/* Single-line masthead: logotype + separator + league info */}
        <div className="flex items-baseline justify-center gap-3">
          <h1 className="masthead-logotype">Baseball Ledger</h1>
          {leagueName && (
            <>
              <span className="text-[var(--border-default)] text-sm" aria-hidden="true">/</span>
              <span className="masthead-subtitle">{leagueName}</span>
            </>
          )}
          {seasonInfo && (
            <>
              <span className="text-[var(--border-default)] text-sm" aria-hidden="true">/</span>
              <span className="dateline">{seasonInfo}</span>
            </>
          )}
        </div>
      </div>

      {/* Thin rule bottom border */}
      <hr className="rule-hairline" style={{ margin: 0 }} />
    </header>
  );
}

export default Masthead;
