/**
 * FolioNav
 *
 * Horizontal navigation links for the top nav bar.
 * Filters entries by league state and commissioner access.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useLocation } from 'react-router-dom';

export type LeagueStatus = 'setup' | 'draft' | 'regular_season' | 'playoffs' | 'offseason';

export interface FolioNavProps {
  leagueId?: string;
  leagueStatus: LeagueStatus;
  isCommissioner: boolean;
  onNavigate: (route: string) => void;
}

interface FolioEntry {
  label: string;
  route: string;
  commissionerOnly?: boolean;
  /** Show only in these league states (undefined = always show) */
  states?: LeagueStatus[];
}

const FOLIO_ENTRIES: FolioEntry[] = [
  { label: 'Season', route: '/dashboard' },
  { label: 'Draft', route: '/draft', states: ['draft'] },
  { label: 'Roster', route: '/roster', states: ['regular_season', 'playoffs', 'offseason'] },
  { label: 'Stats', route: '/stats', states: ['regular_season', 'playoffs', 'offseason'] },
  { label: 'Standings', route: '/standings', states: ['regular_season', 'playoffs', 'offseason'] },
  { label: 'Playoffs', route: '/playoffs', states: ['playoffs'] },
  { label: 'Transactions', route: '/transactions', states: ['regular_season', 'playoffs'] },
  { label: 'Archive', route: '/archive' },
  { label: 'Config', route: '/config', commissionerOnly: true },
];

export function FolioNav({
  leagueId,
  leagueStatus,
  isCommissioner,
  onNavigate,
}: FolioNavProps) {
  const location = useLocation();

  const visibleEntries = FOLIO_ENTRIES.filter((entry) => {
    if (entry.commissionerOnly && !isCommissioner) return false;
    if (entry.states && !entry.states.includes(leagueStatus)) return false;
    return true;
  });

  const isActive = (route: string): boolean => {
    if (!leagueId) return false;
    const fullPath = `/leagues/${leagueId}${route}`;
    return location.pathname === fullPath || location.pathname.startsWith(fullPath + '/');
  };

  return (
    <>
      {visibleEntries.map((entry) => {
        const active = isActive(entry.route);
        return (
          <button
            key={entry.route}
            type="button"
            onClick={() => onNavigate(entry.route)}
            className={`app-nav-tab${active ? ' app-nav-tab--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {entry.label}
          </button>
        );
      })}
    </>
  );
}

export default FolioNav;
