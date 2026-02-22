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
    <header role="banner" className="z-20 bg-[var(--surface-base)]">
      <div className="masthead-bar flex items-center justify-between">
        {/* Left: logotype + league info */}
        <div className="flex items-baseline gap-2">
          <h1 className="masthead-logotype">Baseball Ledger</h1>
          {leagueName && (
            <>
              <span className="text-[var(--border-default)] text-[10px]" aria-hidden="true">/</span>
              <span className="masthead-subtitle">{leagueName}</span>
            </>
          )}
          {seasonInfo && (
            <>
              <span className="text-[var(--border-default)] text-[10px]" aria-hidden="true">/</span>
              <span className="dateline text-[10px]">{seasonInfo}</span>
            </>
          )}
        </div>

        {/* Right: user controls */}
        <div className="flex items-center gap-3">
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

      <hr className="rule-hairline" style={{ margin: 0 }} />
    </header>
  );
}

export default Masthead;
