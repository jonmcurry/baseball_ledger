/**
 * PitchingRotation
 *
 * SP1-SP4 with next-up indicator, bullpen with role change, and closer.
 * Feature-scoped sub-component. No store imports.
 */

import type { RosterEntry } from '@lib/types/roster';

export interface PitchingRotationProps {
  readonly rotation: readonly RosterEntry[];
  readonly bullpen: readonly RosterEntry[];
  readonly closer: RosterEntry | null;
  readonly nextStarterIdx: number;
  readonly onRoleChange?: (entry: RosterEntry, newSlot: 'rotation' | 'bullpen' | 'closer') => void;
}

function PitcherRow({
  entry,
  label,
  isNext,
  actions,
}: {
  entry: RosterEntry;
  label?: string;
  isNext?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-card border px-2 py-1.5 text-sm transition-colors ${
        isNext
          ? 'border-accent/40 bg-accent/5'
          : 'border-[var(--border-subtle)]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {label && (
          <span className="position-badge position-badge-pitcher w-8 shrink-0 text-center">
            {label}
          </span>
        )}
        <span className="min-w-0 truncate font-body font-medium text-[var(--text-primary)]">
          {entry.playerCard.nameFirst} {entry.playerCard.nameLast}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {entry.playerCard.pitching?.grade != null && (
          <span className="font-stat text-xs text-muted">
            G{entry.playerCard.pitching.grade}
          </span>
        )}
        {isNext && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 font-display text-[10px] font-bold uppercase text-[var(--surface-base)]">
            Next
          </span>
        )}
        {actions}
      </div>
    </div>
  );
}

export function PitchingRotation({
  rotation,
  bullpen,
  closer,
  nextStarterIdx,
  onRoleChange,
}: PitchingRotationProps) {
  return (
    <div className="vintage-card space-y-4">
      <h3 className="pennant-header text-base">Pitching Staff</h3>

      {/* Rotation */}
      <div className="space-y-1">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-muted">
          Rotation
        </p>
        {rotation.length === 0 && (
          <p className="text-xs text-muted">No starters assigned</p>
        )}
        {rotation.map((entry, idx) => (
          <PitcherRow
            key={entry.id}
            entry={entry}
            label={`SP${idx + 1}`}
            isNext={idx === nextStarterIdx}
            actions={
              onRoleChange ? (
                <button
                  type="button"
                  onClick={() => onRoleChange(entry, 'bullpen')}
                  className="rounded px-1.5 py-0.5 font-display text-[10px] uppercase text-muted hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)]"
                  title="Move to bullpen"
                >
                  BP
                </button>
              ) : undefined
            }
          />
        ))}
      </div>

      {/* Bullpen */}
      <div className="space-y-1">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-muted">
          Bullpen
        </p>
        {bullpen.length === 0 && (
          <p className="text-xs text-muted">No relievers assigned</p>
        )}
        {bullpen.map((entry) => (
          <PitcherRow
            key={entry.id}
            entry={entry}
            label="RP"
            actions={
              onRoleChange ? (
                <div className="flex gap-0.5">
                  {rotation.length < 4 && (
                    <button
                      type="button"
                      onClick={() => onRoleChange(entry, 'rotation')}
                      className="rounded px-1.5 py-0.5 font-display text-[10px] uppercase text-muted hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)]"
                      title="Move to rotation"
                    >
                      SP
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRoleChange(entry, 'closer')}
                    className="rounded px-1.5 py-0.5 font-display text-[10px] uppercase text-muted hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)]"
                    title="Make closer"
                  >
                    CL
                  </button>
                </div>
              ) : undefined
            }
          />
        ))}
      </div>

      {/* Closer */}
      <div className="space-y-1">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-muted">
          Closer
        </p>
        {closer ? (
          <PitcherRow
            entry={closer}
            label="CL"
            actions={
              onRoleChange ? (
                <button
                  type="button"
                  onClick={() => onRoleChange(closer, 'bullpen')}
                  className="rounded px-1.5 py-0.5 font-display text-[10px] uppercase text-muted hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)]"
                  title="Move to bullpen"
                >
                  BP
                </button>
              ) : undefined
            }
          />
        ) : (
          <p className="text-xs text-muted">No closer assigned</p>
        )}
      </div>
    </div>
  );
}

export default PitchingRotation;
