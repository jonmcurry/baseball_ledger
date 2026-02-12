/**
 * AvailablePlayersTable
 *
 * Vintage box-score styled player table with sortable headers.
 * Golden era aesthetic with newspaper-style typography.
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

export interface AvailablePlayersTableProps {
  players: readonly AvailablePlayer[];
  totalAvailable: number;
  currentPage: number;
  pageSize: number;
  onSelect: (player: AvailablePlayer) => void;
  onPlayerClick?: (player: AvailablePlayer) => void;
  onFilterChange: (filters: PlayerTableFilters) => void;
  disabled?: boolean;
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
  { value: 'LF', label: 'Left Field' },
  { value: 'CF', label: 'Center Field' },
  { value: 'RF', label: 'Right Field' },
  { value: 'SP', label: 'Starting Pitcher' },
  { value: 'RP', label: 'Relief Pitcher' },
];

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
    <th className="px-2 py-2 text-left font-headline text-[10px] font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
      <button
        type="button"
        className={`flex items-center gap-1 transition-colors hover:text-[var(--color-gold)] ${
          isActive ? 'text-[var(--color-gold)]' : ''
        }`}
        onClick={() => onClick(sortKey)}
      >
        {label}
        {isActive && (
          <span className="text-[8px]">{currentDir === 'asc' ? '▲' : '▼'}</span>
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
}: AvailablePlayersTableProps) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const isFirstRender = useRef(true);

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
    <div className="scoreboard-panel">
      {/* Header section */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ink)]/30">
            <svg
              className="h-4 w-4 text-[var(--color-gold)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div>
            <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
              Available Players
            </h3>
            {totalAvailable > 0 && (
              <p className="font-stat text-xs text-[var(--color-scoreboard-text)]/60">
                {startRow.toLocaleString()}-{endRow.toLocaleString()} of{' '}
                {totalAvailable.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        {/* Search input - vintage style */}
        <div className="flex-1">
          <label className="mb-1 block font-stat text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">
            Search Players
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name..."
            className="w-full rounded border border-[var(--color-ink)]/30 bg-[var(--color-ink)]/20 px-3 py-1.5 font-stat text-sm text-[var(--color-scoreboard-text)] placeholder:text-[var(--color-scoreboard-text)]/40 focus:border-[var(--color-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]/50"
          />
        </div>

        {/* Position filter */}
        <div className="w-40">
          <label className="mb-1 block font-stat text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">
            Position
          </label>
          <select
            value={posFilter}
            onChange={(e) => handlePositionChange(e.target.value)}
            className="w-full rounded border border-[var(--color-ink)]/30 bg-[var(--color-ink)]/20 px-3 py-1.5 font-stat text-sm text-[var(--color-scoreboard-text)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]/50"
          >
            {POSITION_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table - vintage box score styling */}
      <div className="max-h-80 overflow-y-auto rounded border border-[var(--color-ink)]/30">
        <table className="w-full text-left" role="grid">
          <thead className="sticky top-0 bg-[var(--color-ink)]/40">
            <tr>
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
              <th className="px-2 py-2 font-headline text-[10px] font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
                PWR
              </th>
              <th className="px-2 py-2 font-headline text-[10px] font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
                SPD
              </th>
              <th className="px-2 py-2 font-headline text-[10px] font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
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
                  className="py-8 text-center font-stat text-xs text-[var(--color-scoreboard-text)]/50"
                >
                  No players match your criteria
                </td>
              </tr>
            )}
            {players.map((p, idx) => (
              <tr
                key={`${p.playerId}-${p.seasonYear}`}
                className={`border-b border-[var(--color-ink)]/20 transition-colors hover:bg-[var(--color-gold)]/10 ${
                  idx % 2 === 0 ? 'bg-[var(--color-ink)]/10' : 'bg-transparent'
                }`}
              >
                <td className="px-2 py-1.5">
                  {onPlayerClick ? (
                    <button
                      type="button"
                      className="text-left font-stat text-sm font-medium text-[var(--color-gold)] transition-colors hover:text-[var(--color-cream)] hover:underline"
                      onClick={() => onPlayerClick(p)}
                    >
                      {p.nameLast}, {p.nameFirst}
                    </button>
                  ) : (
                    <span className="font-stat text-sm font-medium text-[var(--color-scoreboard-text)]">
                      {p.nameLast}, {p.nameFirst}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 font-stat text-[10px] font-bold ${
                      ['SP', 'RP'].includes(p.primaryPosition)
                        ? 'bg-[var(--color-leather)]/30 text-[var(--color-leather)]'
                        : 'bg-[var(--color-ballpark)]/20 text-[var(--color-cream)]'
                    }`}
                  >
                    {p.primaryPosition}
                  </span>
                </td>
                <td className="px-2 py-1.5 font-scoreboard text-sm text-[var(--color-scoreboard-text)]">
                  {p.seasonYear}
                </td>
                <td className="px-2 py-1.5 font-scoreboard text-sm text-[var(--color-scoreboard-text)]">
                  {p.playerCard.powerRating ?? '--'}
                </td>
                <td className="px-2 py-1.5 font-scoreboard text-sm text-[var(--color-scoreboard-text)]">
                  {p.playerCard.speed
                    ? (p.playerCard.speed * 100).toFixed(0)
                    : '--'}
                </td>
                <td className="px-2 py-1.5 font-scoreboard text-sm text-[var(--color-scoreboard-text)]">
                  {p.playerCard.pitching
                    ? p.playerCard.pitching.era.toFixed(2)
                    : '--'}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    disabled={disabled}
                    className="rounded border border-[var(--color-gold)] bg-gradient-to-b from-[var(--color-gold)] to-[#B8860B] px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink)] shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Draft
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination - vintage styling */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="flex items-center gap-1 rounded border border-[var(--color-ink)]/30 bg-[var(--color-ink)]/20 px-3 py-1 font-stat text-xs text-[var(--color-scoreboard-text)] transition-colors hover:border-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>◀</span> Prev
          </button>

          <div className="flex items-center gap-2">
            <span className="font-scoreboard text-lg text-[var(--color-gold)]">
              {currentPage}
            </span>
            <span className="font-stat text-xs text-[var(--color-scoreboard-text)]/50">
              of
            </span>
            <span className="font-scoreboard text-lg text-[var(--color-scoreboard-text)]">
              {totalPages.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="flex items-center gap-1 rounded border border-[var(--color-ink)]/30 bg-[var(--color-ink)]/20 px-3 py-1 font-stat text-xs text-[var(--color-scoreboard-text)] transition-colors hover:border-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <span>▶</span>
          </button>
        </div>
      )}

      {/* Decorative footer */}
      <div className="mt-4 border-t border-[var(--color-ink)]/20 pt-2">
        <p className="text-center font-stat text-[10px] uppercase tracking-widest text-[var(--color-scoreboard-text)]/40">
          ★ Player Pool ★
        </p>
      </div>
    </div>
  );
}

export default AvailablePlayersTable;
