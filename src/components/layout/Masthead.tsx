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
        <div className="absolute top-3 right-gutter-lg flex items-center gap-gutter z-10">
          <span className="font-body text-[var(--type-0)] text-[var(--text-tertiary)] max-md:hidden">
            {userName}
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="font-body text-[var(--type-0)] tracking-wider text-[var(--text-tertiary)] hover:text-[var(--accent-secondary)] transition-colors"
          >
            Log Out
          </button>
        </div>

        {/* Logotype */}
        <h1 className="masthead-logotype">
          Baseball Ledger
        </h1>

        {/* Decorative rule */}
        <div className="flex items-center justify-center gap-4 mt-2" aria-hidden="true">
          <div className="h-px w-12 md:w-20 bg-[var(--border-default)]" />
          <div className="w-1.5 h-1.5 bg-[var(--accent-secondary)]" />
          <div className="h-px w-12 md:w-20 bg-[var(--border-default)]" />
        </div>

        {/* League name + season dateline */}
        <div className="mt-1.5 flex items-center justify-center gap-3">
          <span className="masthead-subtitle">{leagueName}</span>
          {seasonInfo && (
            <>
              <span className="text-[var(--border-default)]" aria-hidden="true">|</span>
              <span className="dateline">{seasonInfo}</span>
            </>
          )}
        </div>
      </div>

      {/* Double rule bottom border */}
      <hr className="rule-double mt-0 mb-0" style={{ margin: 0 }} />
    </header>
  );
}

export default Masthead;
