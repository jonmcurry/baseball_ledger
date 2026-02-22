/**
 * AvailablePlayersTable
 *
 * Heritage Editorial "Registry/Manifest" (Section 3.2). Dense
 * typographic player list with sortable headers, no bounding boxes.
 * REQ-DFT-005: Stat columns and sortable headers.
 * Feature-scoped sub-component. No store imports.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AvailablePlayer } from '@stores/draftStore';

export interface PlayerTableFilters {
  search?: string;
  position?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export type DraftViewMode = 'registry' | 'classifieds';

export interface AvailablePlayersTableProps {
  players: readonly AvailablePlayer[];
  totalAvailable: number;
  currentPage: number;
  pageSize: number;
  onSelect: (player: AvailablePlayer) => void;
  onPlayerClick?: (player: AvailablePlayer) => void;
  onFilterChange: (filters: PlayerTableFilters) => void;
  disabled?: boolean;
  viewMode?: DraftViewMode;
}

type SortKey = 'name' | 'pos' | 'year';
type SortDir = 'asc' | 'desc';

const SORT_KEY_TO_API: Record<SortKey, string> = {
  name: 'nameLast',
  pos: 'primaryPosition',
  year: 'seasonYear',
};

const POSITION_FILTER_OPTIONS = [
  { value: 'all', label: 'All Positions' },
  { value: 'C', label: 'Catcher' },
  { value: '1B', label: 'First Base' },
  { value: '2B', label: 'Second Base' },
  { value: 'SS', label: 'Shortstop' },
  { value: '3B', label: 'Third Base' },
  { value: 'OF', label: 'Outfielder' },
  { value: 'SP', label: 'Starting Pitcher' },
  { value: 'RP', label: 'Relief Pitcher' },
  { value: 'CL', label: 'Closer' },
];

/** Map a position to its CSS badge class. */
function positionBadgeClass(pos: string): string {
  if (['SP', 'RP', 'CL'].includes(pos)) return 'position-badge position-badge-pitcher';
  if (pos === 'C') return 'position-badge position-badge-catcher';
  if (['1B', '2B', '3B', 'SS'].includes(pos)) return 'position-badge position-badge-infield';
  if (['LF', 'CF', 'RF', 'OF'].includes(pos)) return 'position-badge position-badge-outfield';
  if (pos === 'DH') return 'position-badge position-badge-dh';
  return 'position-badge';
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th className="px-2 py-2 text-left font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
      <button
        type="button"
        className={`flex items-center gap-1 transition-colors hover:text-[var(--accent-secondary)] ${
          isActive ? 'text-[var(--accent-secondary)]' : ''
        }`}
        onClick={() => onClick(sortKey)}
      >
        {label}
        {isActive && (
          <span className="text-[8px]">{currentDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
        )}
      </button>
    </th>
  );
}

export function AvailablePlayersTable({
  players,
  totalAvailable,
  currentPage,
  pageSize,
  onSelect,
  onPlayerClick,
  onFilterChange,
  disabled = false,
  viewMode = 'registry',
}: AvailablePlayersTableProps) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const isFirstRender = useRef(true);
  // Track which player was just drafted for strike-through animation
  const [draftedPlayerId, setDraftedPlayerId] = useState<string | null>(null);

  function handleDraft(player: AvailablePlayer) {
    const key = `${player.playerId}-${player.seasonYear}`;
    setDraftedPlayerId(key);
    // Delay actual draft to let the strike-through animation play
    setTimeout(() => {
      onSelect(player);
      setDraftedPlayerId(null);
    }, 600);
  }

  const totalPages = Math.max(1, Math.ceil(totalAvailable / pageSize));

  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  const buildFilters = useCallback(
    (overrides: Partial<PlayerTableFilters> = {}): PlayerTableFilters => ({
      search: search || undefined,
      position: posFilter === 'all' ? undefined : posFilter,
      sortBy: SORT_KEY_TO_API[sortKey],
      sortOrder: sortDir,
      page: currentPage,
      pageSize,
      ...overrides,
    }),
    [search, posFilter, sortKey, sortDir, currentPage, pageSize]
  );

  // Debounce search input (300ms) -- skip initial mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      onFilterChangeRef.current(
        buildFilters({ search: search || undefined, page: 1 })
      );
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handlePositionChange(value: string) {
    setPosFilter(value);
    onFilterChangeRef.current(
      buildFilters({ position: value === 'all' ? undefined : value, page: 1 })
    );
  }

  function handleSort(key: SortKey) {
    let newDir: SortDir;
    if (key === sortKey) {
      newDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      newDir = key === 'name' ? 'asc' : 'desc';
    }
    setSortKey(key);
    setSortDir(newDir);
    onFilterChangeRef.current(
      buildFilters({ sortBy: SORT_KEY_TO_API[key], sortOrder: newDir, page: 1 })
    );
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    onFilterChangeRef.current(buildFilters({ page: newPage }));
  }

  const COL_SPAN = 7;
  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalAvailable);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-body text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Available Players
          </h3>
          {totalAvailable > 0 && (
            <p className="font-stat text-xs text-[var(--text-secondary)]">
              {startRow.toLocaleString()}-{endRow.toLocaleString()} of{' '}
              {totalAvailable.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block font-stat text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            Search Players
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name..."
            className="w-full border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-1.5 font-stat text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-secondary)]/50"
          />
        </div>

        <div className="w-40">
          <label className="mb-1 block font-stat text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            Position
          </label>
          <select
            value={posFilter}
            onChange={(e) => handlePositionChange(e.target.value)}
            className="w-full border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-1.5 font-stat text-sm text-[var(--text-primary)] focus:border-[var(--accent-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-secondary)]/50 [&>option]:bg-[var(--surface-base)] [&>option]:text-[var(--text-primary)]"
          >
            {POSITION_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Registry view (data table) */}
      {viewMode === 'registry' && (
        <div className="max-h-80 overflow-y-auto border-t border-[var(--border-default)]">
          <table className="w-full text-left" role="grid">
            <thead className="sticky top-0 bg-[var(--surface-raised)]">
              <tr className="border-b-2 border-[var(--text-primary)]">
                <SortableHeader
                  label="Player"
                  sortKey="name"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onClick={handleSort}
                />
                <SortableHeader
                  label="Pos"
                  sortKey="pos"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onClick={handleSort}
                />
                <SortableHeader
                  label="Year"
                  sortKey="year"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onClick={handleSort}
                />
                <th className="px-2 py-2 font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  PWR
                </th>
                <th className="px-2 py-2 font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  SPD
                </th>
                <th className="px-2 py-2 font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  ERA
                </th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {players.length === 0 && (
                <tr>
                  <td
                    colSpan={COL_SPAN}
                    className="py-8 text-center font-stat text-xs text-[var(--text-tertiary)]"
                  >
                    No players match your criteria
                  </td>
                </tr>
              )}
              {players.map((p, idx) => {
                const playerKey = `${p.playerId}-${p.seasonYear}`;
                const isDrafted = draftedPlayerId === playerKey;
                return (
                <tr
                  key={playerKey}
                  className={`border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--accent-muted)] ${
                    idx % 2 === 0 ? 'bg-[rgba(0,0,0,0.015)]' : 'bg-transparent'
                  }`}
                >
                  <td className="px-2 py-1.5">
                    {onPlayerClick ? (
                      <button
                        type="button"
                        className={`strike-through-draft text-left font-body text-sm font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--accent-secondary)] hover:underline${isDrafted ? ' drafted' : ''}`}
                        onClick={() => onPlayerClick(p)}
                      >
                        {p.nameLast}, {p.nameFirst}
                      </button>
                    ) : (
                      <span className={`strike-through-draft font-body text-sm font-medium text-[var(--text-primary)]${isDrafted ? ' drafted' : ''}`}>
                        {p.nameLast}, {p.nameFirst}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block text-[10px] ${positionBadgeClass(p.primaryPosition)}`}>
                      {p.primaryPosition}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-stat text-sm text-[var(--text-primary)]">
                    {p.seasonYear}
                  </td>
                  <td className="px-2 py-1.5 font-stat text-sm text-[var(--text-primary)]">
                    {p.playerCard.powerRating ?? '--'}
                  </td>
                  <td className="px-2 py-1.5 font-stat text-sm text-[var(--text-primary)]">
                    {p.playerCard.speed
                      ? (p.playerCard.speed * 100).toFixed(0)
                      : '--'}
                  </td>
                  <td className="px-2 py-1.5 font-stat text-sm text-[var(--text-primary)]">
                    {p.playerCard.pitching
                      ? p.playerCard.pitching.era.toFixed(2)
                      : '--'}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => handleDraft(p)}
                      disabled={disabled || isDrafted}
                      className="btn-vintage btn-vintage-primary px-3 py-1 font-stat text-[10px] font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Draft
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Classifieds view (newspaper columns) */}
      {viewMode === 'classifieds' && (
        <div
          className="classifieds-column columns-2 md:columns-3 max-h-80 overflow-y-auto border-t border-[var(--border-default)] pt-3"
          data-testid="classifieds-view"
        >
          {players.length === 0 && (
            <p className="py-8 text-center font-stat text-xs text-[var(--text-tertiary)]">
              No players match your criteria
            </p>
          )}
          {players.map((p) => {
            const classifiedKey = `${p.playerId}-${p.seasonYear}`;
            const isClassifiedDrafted = draftedPlayerId === classifiedKey;
            return (
            <div
              key={classifiedKey}
              className="group mb-2 break-inside-avoid"
            >
              <div className="flex items-baseline gap-2">
                <button
                  type="button"
                  className={`strike-through-draft text-left font-body text-sm font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--accent-secondary)]${isClassifiedDrafted ? ' drafted' : ''}`}
                  onClick={() => onPlayerClick?.(p)}
                >
                  {p.nameLast}, {p.nameFirst}
                </button>
                <span className="font-stat text-[10px] text-[var(--text-tertiary)]">
                  {p.primaryPosition}, {p.seasonYear}
                </span>
              </div>
              {/* Expandable footnote on hover/focus */}
              <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <div className="flex items-center gap-3 pt-1 pb-1">
                    <span className="font-stat text-[10px] text-[var(--text-secondary)]">
                      PWR: {p.playerCard.powerRating ?? '--'}
                    </span>
                    <span className="font-stat text-[10px] text-[var(--text-secondary)]">
                      SPD: {p.playerCard.speed ? (p.playerCard.speed * 100).toFixed(0) : '--'}
                    </span>
                    {p.playerCard.pitching && (
                      <span className="font-stat text-[10px] text-[var(--text-secondary)]">
                        ERA: {p.playerCard.pitching.era.toFixed(2)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDraft(p)}
                      disabled={disabled || isClassifiedDrafted}
                      className="font-stat text-[10px] font-bold uppercase tracking-wider text-[var(--accent-secondary)] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Draft
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="border border-[var(--border-default)] px-3 py-1 font-stat text-xs text-[var(--text-primary)] transition-colors hover:border-[var(--accent-secondary)] hover:bg-[var(--accent-muted)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>

          <div className="flex items-center gap-2">
            <span className="font-stat text-lg text-[var(--text-primary)]">
              {currentPage}
            </span>
            <span className="font-stat text-xs text-[var(--text-tertiary)]">
              of
            </span>
            <span className="font-stat text-lg text-[var(--text-primary)]">
              {totalPages.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="border border-[var(--border-default)] px-3 py-1 font-stat text-xs text-[var(--text-primary)] transition-colors hover:border-[var(--accent-secondary)] hover:bg-[var(--accent-muted)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default AvailablePlayersTable;
