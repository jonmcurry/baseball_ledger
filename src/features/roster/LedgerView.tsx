/**
 * LedgerView
 *
 * Heritage Editorial monospace ledger table for roster display.
 * Single centralized table with horizontal rules only, double-border
 * section separators between Starting Lineup, Pitching Staff, and Bench.
 *
 * Read-only presentation view (editing requires the Diamond view).
 */

import type { RosterEntry } from '@lib/types/roster';

export interface LedgerViewProps {
  starters: readonly RosterEntry[];
  rotation: readonly RosterEntry[];
  bullpen: readonly RosterEntry[];
  bench: readonly RosterEntry[];
  onPlayerClick?: (entry: RosterEntry) => void;
}

function PlayerRow({
  entry,
  index,
  onPlayerClick,
}: {
  entry: RosterEntry;
  index?: number;
  onPlayerClick?: (entry: RosterEntry) => void;
}) {
  const card = entry.playerCard;
  return (
    <tr className="border-b border-[var(--border-subtle)]">
      {index !== undefined && (
        <td className="px-3 py-1.5 text-right tabular-nums">{index}</td>
      )}
      <td className="px-3 py-1.5">
        {entry.lineupPosition ?? card.primaryPosition}
      </td>
      <td className="px-3 py-1.5">
        {onPlayerClick ? (
          <button
            type="button"
            className="text-left transition-colors hover:text-[var(--accent-secondary)]"
            onClick={() => onPlayerClick(entry)}
          >
            {card.nameFirst} {card.nameLast}
          </button>
        ) : (
          <span>{card.nameFirst} {card.nameLast}</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-center">{card.battingHand ?? '--'}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {card.powerRating ?? '--'}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {card.speed ? (card.speed * 100).toFixed(0) : '--'}
      </td>
    </tr>
  );
}

export function LedgerView({
  starters,
  rotation,
  bullpen,
  bench,
  onPlayerClick,
}: LedgerViewProps) {
  const sortedStarters = [...starters].sort(
    (a, b) => (a.lineupOrder ?? 99) - (b.lineupOrder ?? 99),
  );

  return (
    <table className="stat-table mx-auto w-full max-w-5xl" role="table">
      {/* Starting Lineup */}
      <thead>
        <tr className="border-y-4 border-double border-[var(--text-primary)]">
          <th
            colSpan={6}
            className="py-3 text-center font-headline text-sm uppercase tracking-widest text-[var(--text-primary)]"
          >
            Starting Lineup
          </th>
        </tr>
        <tr className="border-b-2 border-[var(--text-primary)]">
          <th className="px-3 py-2 text-right font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">#</th>
          <th className="px-3 py-2 text-left font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Pos</th>
          <th className="px-3 py-2 text-left font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Player</th>
          <th className="px-3 py-2 text-center font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Bats</th>
          <th className="px-3 py-2 text-right font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">PWR</th>
          <th className="px-3 py-2 text-right font-body text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">SPD</th>
        </tr>
      </thead>
      <tbody>
        {sortedStarters.map((entry, idx) => (
          <PlayerRow
            key={entry.id}
            entry={entry}
            index={idx + 1}
            onPlayerClick={onPlayerClick}
          />
        ))}
      </tbody>

      {/* Pitching Staff */}
      <thead>
        <tr className="border-y-4 border-double border-[var(--text-primary)]">
          <th
            colSpan={6}
            className="py-3 text-center font-headline text-sm uppercase tracking-widest text-[var(--text-primary)]"
          >
            Pitching Staff
          </th>
        </tr>
        <tr className="border-b border-[var(--border-default)]">
          <th colSpan={6} className="px-3 py-1 text-left font-body text-[10px] italic text-[var(--text-tertiary)]">
            Rotation
          </th>
        </tr>
      </thead>
      <tbody>
        {rotation.map((entry) => (
          <PlayerRow key={entry.id} entry={entry} onPlayerClick={onPlayerClick} />
        ))}
      </tbody>
      <thead>
        <tr className="border-b border-[var(--border-default)]">
          <th colSpan={6} className="px-3 py-1 text-left font-body text-[10px] italic text-[var(--text-tertiary)]">
            Bullpen
          </th>
        </tr>
      </thead>
      <tbody>
        {bullpen.map((entry) => (
          <PlayerRow key={entry.id} entry={entry} onPlayerClick={onPlayerClick} />
        ))}
      </tbody>

      {/* Bench */}
      <thead>
        <tr className="border-y-4 border-double border-[var(--text-primary)]">
          <th
            colSpan={6}
            className="py-3 text-center font-headline text-sm uppercase tracking-widest text-[var(--text-primary)]"
          >
            Bench
          </th>
        </tr>
      </thead>
      <tbody>
        {bench.map((entry) => (
          <PlayerRow key={entry.id} entry={entry} onPlayerClick={onPlayerClick} />
        ))}
        {bench.length === 0 && (
          <tr>
            <td colSpan={6} className="py-4 text-center font-stat text-xs text-[var(--text-tertiary)]">
              No bench players
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default LedgerView;
