/**
 * TradeForm
 *
 * Propose a trade: select team, select players on each side.
 * Feature-scoped sub-component. No store imports.
 */

import { useState } from 'react';
import { Select } from '@components/forms/Select';

export interface TradeTeam {
  id: string;
  name: string;
}

export interface TradeFormProps {
  readonly teams: readonly TradeTeam[];
  readonly myRoster: readonly { id: string; name: string }[];
  readonly onSubmit: (targetTeamId: string) => void;
}

export function TradeForm({ teams, myRoster, onSubmit }: TradeFormProps) {
  const [targetTeam, setTargetTeam] = useState('');

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const handleSubmit = () => {
    if (targetTeam) {
      onSubmit(targetTeam);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-headline text-sm font-bold text-ballpark">Propose Trade</h3>

      <div className="space-y-2">
        <Select
          value={targetTeam}
          onChange={setTargetTeam}
          options={teamOptions}
          name="trade-target"
          label="Trade with"
          placeholder="Select team..."
        />
      </div>

      {targetTeam && (
        <div className="rounded-card border border-sandstone bg-old-lace px-gutter py-2">
          <p className="text-xs text-muted">
            Select players to include in the trade proposal. Your roster has {myRoster.length} players available.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!targetTeam}
        className="rounded-button bg-ballpark px-4 py-2 text-xs font-medium text-old-lace hover:opacity-90 disabled:opacity-40"
      >
        Submit Trade
      </button>
    </div>
  );
}
