/**
 * TradeForm
 *
 * Propose a trade: select team, select players on each side.
 * REQ-RST-005: Trade between two teams with player selection.
 *
 * Feature-scoped sub-component. No store imports.
 */

import { useState, useEffect } from 'react';
import { Select } from '@components/forms/Select';

export interface TradeTeam {
  id: string;
  name: string;
}

export interface TradePlayer {
  id: string;
  name: string;
}

export interface TradePayload {
  targetTeamId: string;
  playersFromMe: string[];
  playersFromThem: string[];
}

export interface TradeFormProps {
  readonly teams: readonly TradeTeam[];
  readonly myRoster: readonly TradePlayer[];
  readonly targetRoster: readonly TradePlayer[];
  readonly onTargetChange?: (teamId: string) => void;
  readonly onSelectionChange?: (payload: TradePayload | null) => void;
  readonly onSubmit: (payload: TradePayload) => void;
}

export function TradeForm({
  teams,
  myRoster,
  targetRoster,
  onTargetChange,
  onSelectionChange,
  onSubmit,
}: TradeFormProps) {
  const [targetTeam, setTargetTeam] = useState('');
  const [selectedFromMe, setSelectedFromMe] = useState<Set<string>>(new Set());
  const [selectedFromThem, setSelectedFromThem] = useState<Set<string>>(new Set());

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const handleTargetChange = (teamId: string) => {
    setTargetTeam(teamId);
    setSelectedFromThem(new Set());
    onTargetChange?.(teamId);
  };

  const toggleMyPlayer = (id: string) => {
    setSelectedFromMe((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTheirPlayer = (id: string) => {
    setSelectedFromThem((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit =
    targetTeam !== '' &&
    selectedFromMe.size > 0 &&
    selectedFromThem.size > 0;

  useEffect(() => {
    if (canSubmit) {
      onSelectionChange?.({
        targetTeamId: targetTeam,
        playersFromMe: Array.from(selectedFromMe),
        playersFromThem: Array.from(selectedFromThem),
      });
    } else {
      onSelectionChange?.(null);
    }
  }, [targetTeam, selectedFromMe, selectedFromThem, canSubmit, onSelectionChange]);

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit({
        targetTeamId: targetTeam,
        playersFromMe: Array.from(selectedFromMe),
        playersFromThem: Array.from(selectedFromThem),
      });
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-headline text-sm font-bold text-ballpark">Propose Trade</h3>

      <div className="space-y-2">
        <Select
          value={targetTeam}
          onChange={handleTargetChange}
          options={teamOptions}
          name="trade-target"
          label="Trade with"
          placeholder="Select team..."
        />
      </div>

      <div className="grid grid-cols-2 gap-gutter">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">My Players</p>
          {myRoster.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 rounded-card border border-sandstone/50 px-2 py-1 text-sm hover:bg-sandstone/10"
            >
              <input
                type="checkbox"
                checked={selectedFromMe.has(p.id)}
                onChange={() => toggleMyPlayer(p.id)}
                aria-label={p.name}
                className="accent-ballpark"
              />
              <span className="text-ink">{p.name}</span>
            </label>
          ))}
        </div>

        {targetRoster.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted">Their Players</p>
            {targetRoster.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 rounded-card border border-sandstone/50 px-2 py-1 text-sm hover:bg-sandstone/10"
              >
                <input
                  type="checkbox"
                  checked={selectedFromThem.has(p.id)}
                  onChange={() => toggleTheirPlayer(p.id)}
                  aria-label={p.name}
                  className="accent-ballpark"
                />
                <span className="text-ink">{p.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="rounded-button bg-ballpark px-4 py-2 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-40"
      >
        Submit Trade
      </button>
    </div>
  );
}

export default TradeForm;
