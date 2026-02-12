/**
 * AvailablePlayersTable
 *
 * Server-driven sortable, filterable, paginated table of available players.
 * REQ-DFT-005: Stat columns and sortable headers.
 * Feature-scoped sub-component. No store imports.
 */

import { useState, useEffect, useCallback } from 'react';
import type { AvailablePlayer } from '@stores/draftStore';
import { Input } from '@components/forms/Input';
import { Select } from '@components/forms/Select';

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
  { value: 'C', label: 'C' },
  { value: '1B', label: '1B' },
  { value: '2B', label: '2B' },
  { value: 'SS', label: 'SS' },
  { value: '3B', label: '3B' },
  { value: 'LF', label: 'LF' },
  { value: 'CF', label: 'CF' },
  { value: 'RF', label: 'RF' },
  { value: 'SP', label: 'SP' },
  { value: 'RP', label: 'RP' },
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
  const arrow = isActive ? (currentDir === 'asc' ? ' ^' : ' v') : '';
  return (
    <th className="py-1 font-medium">
      <button
        type="button"
        className="hover:text-ballpark"
        onClick={() => onClick(sortKey)}
      >
        {label}{arrow}
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

  const totalPages = Math.max(1, Math.ceil(totalAvailable / pageSize));

  const emitFilters = useCallback((overrides: Partial<PlayerTableFilters> = {}) => {
    onFilterChange({
      search: search || undefined,
      position: posFilter === 'all' ? undefined : posFilter,
      sortBy: SORT_KEY_TO_API[sortKey],
      sortOrder: sortDir,
      page: currentPage,
      pageSize,
      ...overrides,
    });
  }, [search, posFilter, sortKey, sortDir, currentPage, pageSize, onFilterChange]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      emitFilters({ search: search || undefined, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handlePositionChange(value: string) {
    setPosFilter(value);
    emitFilters({ position: value === 'all' ? undefined : value, page: 1 });
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
    emitFilters({ sortBy: SORT_KEY_TO_API[key], sortOrder: newDir, page: 1 });
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    emitFilters({ page: newPage });
  }

  const COL_SPAN = 7;
  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalAvailable);

  return (
    <div className="space-y-gutter">
      <div className="flex items-baseline justify-between">
        <h3 className="font-headline text-sm font-bold text-ballpark">Available Players</h3>
        {totalAvailable > 0 && (
          <span className="text-xs text-muted">
            {startRow.toLocaleString()}-{endRow.toLocaleString()} of {totalAvailable.toLocaleString()}
          </span>
        )}
      </div>
      <div className="flex gap-gutter">
        <div className="flex-1">
          <Input value={search} onChange={setSearch} name="search" label="Search" placeholder="Player name..." />
        </div>
        <div className="w-40">
          <Select value={posFilter} onChange={handlePositionChange} options={POSITION_FILTER_OPTIONS} name="position" label="Position" />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm" role="grid">
          <thead>
            <tr className="border-b-2 border-sandstone text-xs text-muted">
              <SortableHeader label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
              <SortableHeader label="Pos" sortKey="pos" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
              <SortableHeader label="Year" sortKey="year" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
              <th className="py-1 font-medium">Pwr</th>
              <th className="py-1 font-medium">Spd</th>
              <th className="py-1 font-medium">ERA</th>
              <th className="py-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {players.length === 0 && (
              <tr>
                <td colSpan={COL_SPAN} className="py-4 text-center text-xs text-muted">No players match your criteria</td>
              </tr>
            )}
            {players.map((p) => (
              <tr key={`${p.playerId}-${p.seasonYear}`} className="border-b border-sandstone/50 hover:bg-sandstone/20">
                <td className="py-1 font-stat text-ink">
                  {onPlayerClick ? (
                    <button
                      type="button"
                      className="text-left text-ballpark underline-offset-2 hover:underline"
                      onClick={() => onPlayerClick(p)}
                    >
                      {p.nameLast}, {p.nameFirst}
                    </button>
                  ) : (
                    <span>{p.nameLast}, {p.nameFirst}</span>
                  )}
                </td>
                <td className="py-1 font-stat text-muted">{p.primaryPosition}</td>
                <td className="py-1 font-stat text-muted">{p.seasonYear}</td>
                <td className="py-1 font-stat text-muted">{p.playerCard.powerRating}</td>
                <td className="py-1 font-stat text-muted">{(p.playerCard.speed * 100).toFixed(0)}</td>
                <td className="py-1 font-stat text-muted">
                  {p.playerCard.pitching ? p.playerCard.pitching.era.toFixed(2) : '--'}
                </td>
                <td className="py-1">
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    disabled={disabled}
                    className="rounded-button bg-ballpark px-2 py-0.5 text-xs text-old-lace hover:opacity-90 disabled:opacity-40"
                  >
                    Draft
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="rounded-button border border-sandstone px-3 py-1 text-xs hover:bg-sandstone/30 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-muted">
            Page {currentPage} of {totalPages.toLocaleString()}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="rounded-button border border-sandstone px-3 py-1 text-xs hover:bg-sandstone/30 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default AvailablePlayersTable;
