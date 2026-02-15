/**
 * Header
 *
 * Gazette-style masthead header with "Baseball Ledger" app title,
 * league name, decorative rule lines, diamond ornaments, and navigation strip.
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

/** Diamond ornament -- small decorative separator in the gazette style. */
function DiamondOrnament({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-3 w-3 ${className}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="0" width="6" height="6" transform="rotate(45 6 6)" />
    </svg>
  );
}

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
          ? 'border-[var(--accent-primary)]'
          : 'border-[var(--border-default)]'
        }`}
    >
      {/* Banner area with gradient background */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--surface-overlay) 0%, var(--surface-base) 40%, var(--surface-raised) 100%)',
        }}
      >
        {/* Subtle radial gold glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 60%, rgba(27,77,62,0.06) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        {/* User info -- positioned top-right */}
        <div className="relative z-10 flex justify-end px-gutter pt-3">
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

        {/* Gazette-style masthead */}
        <div className="relative z-10 px-gutter pb-5 pt-1 md:pb-6">
          {/* Top decorative double rule */}
          <div className="mx-auto max-w-xl" aria-hidden="true">
            <div className="h-px bg-[var(--border-default)]" />
            <div className="mt-[2px] h-[2px] bg-[var(--accent-primary)] opacity-60" />
          </div>

          {/* Title row with diamond ornaments */}
          <div className="mt-4 flex items-center justify-center gap-3 md:gap-5">
            {/* Left ornament cluster */}
            <div className="flex items-center gap-1.5 max-sm:hidden" aria-hidden="true">
              <div className="h-px w-8 bg-[var(--border-default)] md:w-14" />
              <DiamondOrnament className="text-[var(--accent-primary)] opacity-50" />
              <div className="h-px w-4 bg-[var(--border-default)] md:w-8" />
              <DiamondOrnament className="text-[var(--accent-primary)] opacity-30 h-2 w-2" />
            </div>

            <h1
              className={`font-display text-2xl tracking-[0.25em] uppercase md:text-3xl lg:text-4xl ${
                isPlayoff ? 'text-[var(--accent-hover)]' : 'text-[var(--accent-primary)]'
              }`}
              style={{
                textShadow: '1px 1px 0 rgba(255,255,255,0.6), -0.5px -0.5px 0 rgba(0,0,0,0.08)',
              }}
            >
              Baseball Ledger
            </h1>

            {/* Right ornament cluster */}
            <div className="flex items-center gap-1.5 max-sm:hidden" aria-hidden="true">
              <DiamondOrnament className="text-[var(--accent-primary)] opacity-30 h-2 w-2" />
              <div className="h-px w-4 bg-[var(--border-default)] md:w-8" />
              <DiamondOrnament className="text-[var(--accent-primary)] opacity-50" />
              <div className="h-px w-8 bg-[var(--border-default)] md:w-14" />
            </div>
          </div>

          {/* Subtitle rule + league name */}
          <div className="mt-2 flex flex-col items-center">
            {/* Thin accent rule */}
            <div className="flex items-center gap-2" aria-hidden="true">
              <div className="h-px w-6 bg-[var(--accent-primary)] opacity-30 md:w-10" />
              <DiamondOrnament className="text-[var(--accent-primary)] opacity-25 h-1.5 w-1.5" />
              <div className="h-px w-6 bg-[var(--accent-primary)] opacity-30 md:w-10" />
            </div>

            <span className="mt-2 font-stat text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)] md:text-sm">
              {leagueName}
            </span>
          </div>

          {/* Bottom decorative double rule */}
          <div className="mx-auto mt-4 max-w-xl" aria-hidden="true">
            <div className="h-[2px] bg-[var(--accent-primary)] opacity-60" />
            <div className="mt-[2px] h-px bg-[var(--border-default)]" />
          </div>
        </div>
      </div>

      {/* Navigation strip */}
      <nav
        className={`bg-surface-overlay/80 backdrop-blur-sm transition-all duration-300 overflow-hidden ${mobileMenuOpen
            ? 'max-h-96 border-t border-[var(--border-subtle)]'
            : 'max-h-0 md:max-h-12 md:overflow-visible'
          }`}
        role="navigation"
      >
        <div className="px-gutter flex max-md:flex-col md:items-center md:justify-center md:gap-6 py-2">
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
