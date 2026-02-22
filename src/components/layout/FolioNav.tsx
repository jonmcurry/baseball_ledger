/**
 * FolioNav
 *
 * Vertical sidebar navigation for the broadsheet layout.
 * Each entry has a roman numeral + label, styled like a table of contents.
 * Active page indicated by crimson left rule.
 *
 * Desktop: full sidebar with numerals + labels.
 * Tablet: collapsed icon-only (numerals only).
 * Mobile: horizontal bottom bar (via CSS).
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
  numeral: string;
  commissionerOnly?: boolean;
  /** Show only in these league states (undefined = always show) */
  states?: LeagueStatus[];
}

const FOLIO_ENTRIES: FolioEntry[] = [
  { label: 'Season', route: '/dashboard', numeral: 'I' },
  { label: 'Draft', route: '/draft', numeral: 'II', states: ['draft'] },
  { label: 'Roster', route: '/roster', numeral: 'III', states: ['regular_season', 'playoffs', 'offseason'] },
  { label: 'Stats', route: '/stats', numeral: 'IV', states: ['regular_season', 'playoffs', 'offseason'] },
  { label: 'Standings', route: '/standings', numeral: 'V', states: ['regular_season', 'playoffs', 'offseason'] },
  { label: 'Playoffs', route: '/playoffs', numeral: 'VI', states: ['playoffs'] },
  { label: 'Transactions', route: '/transactions', numeral: 'VII', states: ['regular_season', 'playoffs'] },
  { label: 'Archive', route: '/archive', numeral: 'VIII' },
  { label: 'Config', route: '/config', numeral: 'IX', commissionerOnly: true },
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
    <div className="folio-nav">
      {visibleEntries.map((entry) => {
        const active = isActive(entry.route);
        return (
          <button
            key={entry.route}
            type="button"
            onClick={() => onNavigate(entry.route)}
            className={`folio-item${active ? ' folio-item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="folio-numeral">{entry.numeral}</span>
            <span className="folio-label">{entry.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default FolioNav;
