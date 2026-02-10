/**
 * AvailablePlayersTable
 *
 * Sortable, filterable table of available players for drafting.
 * REQ-DFT-005: Stat columns and sortable headers.
 * Feature-scoped sub-component. No store imports.
 */

import { useState, useMemo } from 'react';
import type { AvailablePlayer } from '@stores/draftStore';
import { Input } from '@components/forms/Input';
import { Select } from '@components/forms/Select';

export interface AvailablePlayersTableProps {
  players: readonly AvailablePlayer[];
  onSelect: (player: AvailablePlayer) => void;
  onPlayerClick?: (player: AvailablePlayer) => void;
  disabled?: boolean;
}

type SortKey = 'name' | 'pos' | 'year' | 'pwr' | 'spd' | 'era';
type SortDir = 'asc' | 'desc';

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

function getSortValue(p: AvailablePlayer, key: SortKey): number | string {
  switch (key) {
    case 'name': return `${p.nameLast} ${p.nameFirst}`;
    case 'pos': return p.primaryPosition;
    case 'year': return p.seasonYear;
    case 'pwr': return p.playerCard.powerRating;
    case 'spd': return p.playerCard.speed;
    case 'era': return p.playerCard.pitching?.era ?? 99;
    default: return 0;
  }
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

export function AvailablePlayersTable({ players, onSelect, onPlayerClick, disabled = false }: AvailablePlayersTableProps) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    const result = players.filter((p) => {
      const matchesSearch = search === '' || `${p.nameFirst} ${p.nameLast}`.toLowerCase().includes(search.toLowerCase());
      const matchesPos = posFilter === 'all' || p.primaryPosition === posFilter;
      return matchesSearch && matchesPos;
    });

    return [...result].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal as string)
        : (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [players, search, posFilter, sortKey, sortDir]);

  const COL_SPAN = 7;

  return (
    <div className="space-y-gutter">
      <h3 className="font-headline text-sm font-bold text-ballpark">Available Players</h3>
      <div className="flex gap-gutter">
        <div className="flex-1">
          <Input value={search} onChange={setSearch} name="search" label="Search" placeholder="Player name..." />
        </div>
        <div className="w-40">
          <Select value={posFilter} onChange={setPosFilter} options={POSITION_FILTER_OPTIONS} name="position" label="Position" />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm" role="grid">
          <thead>
            <tr className="border-b-2 border-sandstone text-xs text-muted">
              <SortableHeader label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
              <SortableHeader label="Pos" sortKey="pos" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
              <SortableHeader label="Year" sortKey="year" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
              <SortableHeader label="Pwr" sortKey="pwr" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
              <SortableHeader label="Spd" sortKey="spd" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
              <SortableHeader label="ERA" sortKey="era" currentKey={sortKey} currentDir={sortDir} onClick={handleSort} />
              <th className="py-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COL_SPAN} className="py-4 text-center text-xs text-muted">No players match your criteria</td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={`${p.playerId}-${p.seasonYear}`} className="border-b border-sandstone/50 hover:bg-sandstone/20">
                <td className="py-1 font-stat text-ink">
                  {onPlayerClick ? (
                    <button
                      type="button"
                      className="text-left text-ballpark underline-offset-2 hover:underline"
                      onClick={() => onPlayerClick(p)}
                    >
                      {p.nameFirst} {p.nameLast}
                    </button>
                  ) : (
                    <span>{p.nameFirst} {p.nameLast}</span>
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
    </div>
  );
}

export default AvailablePlayersTable;
