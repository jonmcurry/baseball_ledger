/**
 * AvailablePlayersTable
 *
 * Sortable, filterable table of available players for drafting.
 * Feature-scoped sub-component. No store imports.
 */

import { useState } from 'react';
import type { AvailablePlayer } from '@stores/draftStore';
import { Input } from '@components/forms/Input';
import { Select } from '@components/forms/Select';

export interface AvailablePlayersTableProps {
  players: readonly AvailablePlayer[];
  onSelect: (player: AvailablePlayer) => void;
  disabled?: boolean;
}

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

export function AvailablePlayersTable({ players, onSelect, disabled = false }: AvailablePlayersTableProps) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');

  const filtered = players.filter((p) => {
    const matchesSearch = search === '' || `${p.nameFirst} ${p.nameLast}`.toLowerCase().includes(search.toLowerCase());
    const matchesPos = posFilter === 'all' || p.primaryPosition === posFilter;
    return matchesSearch && matchesPos;
  });

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
              <th className="py-1 font-medium">Name</th>
              <th className="py-1 font-medium">Pos</th>
              <th className="py-1 font-medium">Year</th>
              <th className="py-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-xs text-muted">No players match your criteria</td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={`${p.playerId}-${p.seasonYear}`} className="border-b border-sandstone/50 hover:bg-sandstone/20">
                <td className="py-1 font-stat text-ink">{p.nameFirst} {p.nameLast}</td>
                <td className="py-1 font-stat text-muted">{p.primaryPosition}</td>
                <td className="py-1 font-stat text-muted">{p.seasonYear}</td>
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
