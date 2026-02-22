/**
 * Header
 *
 * Heritage Editorial masthead with dramatic serif typography,
 * thin rule borders, and refined navigation. Collapsed hamburger
 * menu on narrow viewports (REQ-COMP-010).
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
      className="relative z-20"
    >
      {/* Editorial masthead */}
      <div className="relative bg-[var(--surface-base)] pt-8 pb-6 md:pt-10 md:pb-8 px-gutter">
        {/* User info -- positioned top-right */}
        <div className="absolute top-3 right-gutter flex items-center gap-gutter z-10">
          <span className="font-body text-sm text-[var(--text-tertiary)] max-md:hidden">
            {userName}
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="font-body text-xs tracking-wider text-[var(--text-tertiary)] hover:text-[var(--accent-secondary)] transition-colors max-md:hidden"
          >
            Log Out
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="hidden max-md:block p-1 text-[var(--text-primary)]"
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
                <path d="M6 18L18 6M6 6l12 12" strokeWidth="1.5" strokeLinecap="square" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="1.5" strokeLinecap="square" />
              )}
            </svg>
          </button>
        </div>

        {/* Masthead title */}
        <div className="text-center">
          <h1
            className="font-headline text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-[var(--text-primary)]"
          >
            Baseball Ledger
          </h1>

          {/* Thin decorative rule with crimson accent */}
          <div className="flex items-center justify-center gap-4 mt-3" aria-hidden="true">
            <div className="h-px w-12 md:w-20 bg-[var(--border-default)]" />
            <div
              className="w-1.5 h-1.5"
              style={{
                background: isPlayoff ? 'var(--color-gold)' : 'var(--accent-secondary)',
              }}
            />
            <div className="h-px w-12 md:w-20 bg-[var(--border-default)]" />
          </div>

          {/* League name -- italic serif */}
          <span className="mt-2 inline-block font-body text-sm md:text-base italic text-[var(--text-tertiary)] tracking-wide">
            {leagueName}
          </span>
        </div>
      </div>

      {/* Thin rule separator */}
      <div className="h-px bg-[var(--border-default)]" aria-hidden="true" />

      {/* Navigation strip -- minimal editorial */}
      <nav
        className={`transition-all duration-300 overflow-hidden bg-[var(--surface-base)] ${mobileMenuOpen
            ? 'max-h-96'
            : 'max-h-0 md:max-h-12 md:overflow-visible'
          }`}
        role="navigation"
      >
        <div className="px-gutter flex max-md:flex-col md:items-center md:justify-center md:gap-0 py-0">
          {visibleNavItems.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => handleNavigate(item.route)}
              className="font-body text-sm tracking-wide py-2.5 md:py-2.5 md:px-5 transition-colors text-left text-[var(--text-secondary)] hover:text-[var(--accent-secondary)]"
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
              className="font-body text-xs text-[var(--text-secondary)] border border-[var(--border-default)] px-3 py-1 hover:text-[var(--accent-secondary)] hover:border-[var(--accent-secondary)]"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom rule */}
      <div className="h-px bg-[var(--border-default)]" aria-hidden="true" />
    </header>
  );
}

export default Header;
