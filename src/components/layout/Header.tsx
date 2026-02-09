/**
 * Header
 *
 * Navigation header with league info, user display, and nav links.
 * Nav links visible only when league is active (regular_season or playoffs).
 * Playoff variant styling when status is "playoffs".
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

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
  { label: 'Roster', route: '/roster' },
  { label: 'Stats', route: '/stats' },
  { label: 'Standings', route: '/standings' },
  { label: 'League Config', route: '/league-config', commissionerOnly: true },
];

const ACTIVE_STATUSES = new Set<LeagueStatus>(['regular_season', 'playoffs', 'offseason']);

export function Header({
  leagueName,
  leagueStatus,
  userName,
  isCommissioner,
  onNavigate,
  onLogout,
}: HeaderProps) {
  const isActive = ACTIVE_STATUSES.has(leagueStatus);
  const isPlayoff = leagueStatus === 'playoffs';

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
      </div>
      {isActive && (
        <nav className="mt-2 flex gap-gutter" role="navigation">
          {NAV_ITEMS.filter((item) => !item.commissionerOnly || isCommissioner).map(
            (item) => (
              <button
                key={item.route}
                type="button"
                onClick={() => onNavigate(item.route)}
                className="text-sm hover:underline"
              >
                {item.label}
              </button>
            ),
          )}
        </nav>
      )}
    </header>
  );
}
