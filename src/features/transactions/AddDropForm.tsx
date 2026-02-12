/**
 * AddDropForm
 *
 * Drop a player from roster + add from player pool.
 * Feature-scoped sub-component. No store imports.
 *
 * REQ-RST-005: Free agent add/drop transactions.
 */

import { useState, useEffect, useRef } from 'react';
import { Select } from '@components/forms/Select';
import { Input } from '@components/forms/Input';
import type { RosterEntry } from '@lib/types/roster';
import type { AvailablePlayer } from '@lib/transforms/player-pool-transform';

export interface AddDropFormProps {
  readonly roster: readonly RosterEntry[];
  readonly availablePlayers: readonly AvailablePlayer[];
  readonly isLoadingPlayers: boolean;
  readonly onDrop: (rosterId: string) => void;
  readonly onAdd: (player: AvailablePlayer) => void;
  readonly onSearchPlayers: (search: string) => void;
  readonly canAdd: boolean;
}

export function AddDropForm({
  roster,
  availablePlayers,
  isLoadingPlayers,
  onDrop,
  onAdd,
  onSearchPlayers,
  canAdd,
}: AddDropFormProps) {
  const [selectedDrop, setSelectedDrop] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dropOptions = roster.map((entry) => ({
    value: entry.id,
    label: `${entry.playerCard.nameFirst} ${entry.playerCard.nameLast} (${entry.playerCard.primaryPosition})`,
  }));

  const handleDrop = () => {
    if (selectedDrop) {
      onDrop(selectedDrop);
      setSelectedDrop('');
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length >= 2) {
      debounceRef.current = setTimeout(() => {
        onSearchPlayers(searchQuery);
      }, 300);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, onSearchPlayers]);

  return (
    <div className="space-y-3">
      <h3 className="font-headline text-sm font-bold text-ballpark">Add/Drop</h3>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Drop a Player</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              value={selectedDrop}
              onChange={setSelectedDrop}
              options={dropOptions}
              name="drop-player"
              label="Select player to drop"
              placeholder="Select player..."
            />
          </div>
          <button
            type="button"
            onClick={handleDrop}
            disabled={!selectedDrop}
            className="rounded-button bg-stitch-red px-3 py-2 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40"
          >
            Drop
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Add a Player</p>

        {!canAdd && (
          <p className="text-xs text-stitch-red">
            Drop a player first (roster is full at 21).
          </p>
        )}

        <Input
          value={searchQuery}
          onChange={setSearchQuery}
          name="search-players"
          label="Search free agents"
          placeholder="Search by name..."
        />

        {isLoadingPlayers && (
          <p className="text-xs text-muted">Searching...</p>
        )}

        {availablePlayers.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded-card border border-sandstone">
            {availablePlayers.map((player) => (
              <div
                key={`${player.playerId}-${player.seasonYear}`}
                className="flex items-center justify-between border-b border-sandstone/50 px-2 py-1.5 last:border-b-0"
              >
                <span className="text-xs text-ink">
                  {player.nameFirst} {player.nameLast} ({player.primaryPosition}, {player.seasonYear})
                </span>
                <button
                  type="button"
                  onClick={() => onAdd(player)}
                  disabled={!canAdd}
                  className="rounded-button bg-ballpark px-2 py-0.5 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && !isLoadingPlayers && availablePlayers.length === 0 && (
          <p className="text-xs text-muted">No matching free agents found.</p>
        )}

        {searchQuery.length < 2 && availablePlayers.length === 0 && (
          <p className="text-xs text-muted">Search for a player by name.</p>
        )}
      </div>
    </div>
  );
}

export default AddDropForm;
