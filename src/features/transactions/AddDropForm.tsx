/**
 * AddDropForm
 *
 * Drop a player from roster + add from player pool.
 * Feature-scoped sub-component. No store imports.
 */

import { useState } from 'react';
import { Select } from '@components/forms/Select';
import type { RosterEntry } from '@lib/types/roster';

export interface AddDropFormProps {
  readonly roster: readonly RosterEntry[];
  readonly onDrop: (rosterId: string) => void;
  readonly onAdd: (playerId: string) => void;
}

export function AddDropForm({ roster, onDrop }: AddDropFormProps) {
  const [selectedDrop, setSelectedDrop] = useState('');

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
            className="rounded-button bg-stitch-red px-3 py-2 text-xs font-medium text-old-lace hover:opacity-90 disabled:opacity-40"
          >
            Drop
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddDropForm;
