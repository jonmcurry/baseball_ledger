/**
 * Header
 *
 * Pennant Race banner header with patriot blue background, red stripe
 * borders, star ornaments, and "Baseball Ledger" title. Navigation strip
 * on cream background with red active indicator.
 * Collapsed hamburger menu on narrow viewports (REQ-COMP-010).
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useState } from 'react';

export type LeagueStatus = 'setup' | 'draft' | 'regular_season' | 'playoffs' | 'offseason';

export interface HeaderProps {
  leagueName: string;
  leagueStatus: LeagueStatus;
  userName: string;
  isCommissioner: boolean;
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

interface NavItem {
  label: string;
  route: string;
  commissionerOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Season', route: '/dashboard' },
  { label: 'Draft Board', route: '/draft' },
  { label: 'Roster', route: '/roster' },
  { label: 'Stats', route: '/stats' },
  { label: 'Standings', route: '/standings' },
  { label: 'Playoffs', route: '/playoffs' },
  { label: 'Transactions', route: '/transactions' },
  { label: 'Archive', route: '/archive' },
  { label: 'League Config', route: '/config', commissionerOnly: true },
];

export function Header({
  leagueName,
  leagueStatus,
  userName,
  isCommissioner,
  onNavigate,
  onLogout,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isPlayoff = leagueStatus === 'playoffs';

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.commissionerOnly || isCommissioner,
  );

  const handleNavigate = (route: string) => {
    setMobileMenuOpen(false);
    onNavigate(route);
  };

  return (
    <header
      role="banner"
      className={`relative z-20 transition-colors duration-300 ${isPlayoff
          ? 'border-b border-[var(--accent-primary)]'
          : 'border-b border-[var(--border-default)]'
        }`}
    >
      {/* Patriot blue banner with red stripe borders */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'var(--accent-primary)' }}
      >
        {/* Top red stripe */}
        <div
          className="h-1.5"
          style={{ background: 'var(--accent-secondary)' }}
          aria-hidden="true"
        />

        {/* User info -- positioned top-right */}
        <div className="relative z-10 flex justify-end px-gutter pt-3">
          <div className="flex items-center gap-gutter">
            <span
              className="font-body text-sm max-md:hidden"
              style={{ color: 'rgba(255,248,238,0.5)' }}
            >
              {userName}
            </span>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Log out"
              className="font-display uppercase text-xs tracking-wider px-4 py-1.5 rounded-sm transition-all active:translate-y-px max-md:hidden"
              style={{
                border: '1px solid rgba(255,248,238,0.3)',
                color: 'rgba(255,248,238,0.6)',
                background: 'none',
              }}
            >
              Log Out
            </button>

            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="hidden max-md:block p-1"
              style={{ color: 'var(--cream-white)' }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="stroke-current"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="square" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="square" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Pennant-style masthead */}
        <div className="relative z-10 px-gutter pb-6 pt-1 md:pb-7">
          <div className="text-center">
            <h1
              className="font-display text-4xl tracking-[0.08em] uppercase leading-none md:text-5xl lg:text-6xl"
              style={{
                color: 'var(--cream-white)',
                textShadow: '3px 3px 0 var(--accent-secondary-dark), 0 0 30px rgba(191,43,43,0.2)',
              }}
            >
              Baseball Ledger
            </h1>

            {/* Star ornament row */}
            <div className="flex items-center justify-center gap-3 mt-2" aria-hidden="true">
              <div className="h-0.5 w-10 md:w-16" style={{ background: 'var(--accent-secondary)' }} />
              <span
                className="text-xs tracking-[4px]"
                style={{ color: 'var(--accent-secondary)' }}
              >
                &#9733; &#9733; &#9733;
              </span>
              <div className="h-0.5 w-10 md:w-16" style={{ background: 'var(--accent-secondary)' }} />
            </div>

            {/* League name */}
            <span
              className="mt-2 inline-block font-body text-xs font-bold uppercase tracking-[0.2em] md:text-sm"
              style={{ color: 'rgba(255,248,238,0.6)' }}
            >
              {leagueName}
            </span>
          </div>
        </div>

        {/* Bottom red stripe */}
        <div
          className="h-1.5"
          style={{ background: 'var(--accent-secondary)' }}
          aria-hidden="true"
        />
      </div>

      {/* Navigation strip -- cream background, red bottom border */}
      <nav
        className={`transition-all duration-300 overflow-hidden ${mobileMenuOpen
            ? 'max-h-96'
            : 'max-h-0 md:max-h-12 md:overflow-visible'
          }`}
        role="navigation"
        style={{
          background: 'var(--cream-white)',
          borderBottom: '2px solid var(--accent-secondary)',
        }}
      >
        <div className="px-gutter flex max-md:flex-col md:items-center md:justify-center md:gap-0 py-0">
          {visibleNavItems.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => handleNavigate(item.route)}
              className="font-display text-sm uppercase tracking-wide py-2.5 md:py-2 md:px-5 transition-colors text-left text-[var(--text-secondary)] hover:text-[var(--accent-secondary)]"
            >
              {item.label}
            </button>
          ))}

          {/* Mobile-only: user info and logout */}
          <div
            className="hidden max-md:flex max-md:items-center max-md:justify-between max-md:border-t max-md:pt-3 max-md:mt-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="font-body text-sm text-[var(--text-secondary)]">{userName}</span>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Log out"
              className="font-display uppercase text-xs border border-[var(--border-default)] text-[var(--text-secondary)] px-3 py-1 rounded-sm hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;
