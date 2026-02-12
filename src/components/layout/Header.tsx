/**
 * Header
 *
 * Navigation header with league info, user display, and nav links.
 * All nav items visible in every league phase so users can always navigate.
 * Playoff variant styling when status is "playoffs".
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
  { label: 'Dashboard', route: '/dashboard' },
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
      className={`border-b relative z-20 transition-colors duration-300 ${isPlayoff
          ? 'border-[var(--accent-primary)] bg-surface-raised'
          : 'border-[var(--border-default)] bg-surface-raised'
        }`}
    >
      <div className="px-gutter py-4 flex items-center justify-between relative">
        <div className="flex items-center gap-gutter">
          <div className="flex flex-col">
            <span className={`font-display text-2xl tracking-wider uppercase ${isPlayoff ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
              {leagueName}
            </span>
            <span className="text-xs font-stat tracking-widest text-[var(--text-tertiary)] uppercase">
              {leagueStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-gutter">
          <span className="font-body text-sm max-md:hidden text-[var(--text-secondary)]">
            {userName}
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="font-display uppercase text-xs tracking-wider border px-4 py-1.5 rounded-sm transition-all active:translate-y-px max-md:hidden border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          >
            Log Out
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="hidden max-md:block p-1 text-[var(--text-secondary)]"
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

      <nav
        className={`bg-surface-overlay/80 backdrop-blur-sm transition-all duration-300 overflow-hidden ${mobileMenuOpen
            ? 'max-h-96 border-t border-[var(--border-subtle)]'
            : 'max-h-0 md:max-h-12 md:overflow-visible'
          }`}
        role="navigation"
      >
        <div className="px-gutter flex max-md:flex-col md:items-center md:gap-6 py-2">
          {visibleNavItems.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => handleNavigate(item.route)}
              className="font-display text-sm uppercase tracking-wide py-2 md:py-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors relative group text-left"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--accent-primary)] transition-all group-hover:w-full" />
            </button>
          ))}

          {/* Mobile-only: user info and logout */}
          <div className="hidden max-md:flex max-md:items-center max-md:justify-between max-md:border-t max-md:border-[var(--border-subtle)] max-md:pt-3 max-md:mt-2">
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
