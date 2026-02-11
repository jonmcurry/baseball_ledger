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
      className={`border-b-2 px-gutter py-3 ${
        isPlayoff
          ? 'border-playoff-gold bg-playoff-dark text-playoff-gold'
          : 'border-sandstone bg-ballpark text-old-lace'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-gutter">
          <span className="font-headline text-xl font-bold">{leagueName}</span>
        </div>
        <div className="flex items-center gap-gutter">
          <span className="text-sm max-md:hidden">{userName}</span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="rounded-button border border-current px-3 py-1 text-xs hover:opacity-80 max-md:hidden"
          >
            Log Out
          </button>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="hidden max-md:block rounded-button border border-current px-2 py-1"
          >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="stroke-current"
              >
                {mobileMenuOpen ? (
                  <>
                    <line x1="4" y1="4" x2="16" y2="16" strokeWidth="2" strokeLinecap="round" />
                    <line x1="16" y1="4" x2="4" y2="16" strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="5" x2="17" y2="5" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="10" x2="17" y2="10" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="15" x2="17" y2="15" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
        </div>
      </div>
      <nav
        className={`mt-2 flex flex-wrap gap-gutter ${
          mobileMenuOpen
            ? 'max-md:flex max-md:flex-col max-md:gap-1'
            : 'max-md:hidden'
        }`}
        role="navigation"
      >
        {visibleNavItems.map((item) => (
          <button
            key={item.route}
            type="button"
            onClick={() => handleNavigate(item.route)}
            className="text-sm hover:underline max-md:py-1 max-md:text-left"
          >
            {item.label}
          </button>
        ))}
        {/* Mobile-only: user info and logout */}
        <div className="hidden max-md:flex max-md:items-center max-md:justify-between max-md:border-t max-md:border-current/20 max-md:pt-2 max-md:mt-1">
          <span className="text-sm">{userName}</span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="rounded-button border border-current px-3 py-1 text-xs hover:opacity-80"
          >
            Log Out
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Header;
