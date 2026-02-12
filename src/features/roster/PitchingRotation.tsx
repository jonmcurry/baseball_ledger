/**
 * PitchingRotation
 *
 * SP1-SP4 with next-up indicator, bullpen, and closer.
 * Feature-scoped sub-component. No store imports.
 */

import type { RosterEntry } from '@lib/types/roster';

export interface PitchingRotationProps {
  readonly rotation: readonly RosterEntry[];
  readonly bullpen: readonly RosterEntry[];
  readonly closer: RosterEntry | null;
  readonly nextStarterIdx: number;
}

export function PitchingRotation({
  rotation,
  bullpen,
  closer,
  nextStarterIdx,
}: PitchingRotationProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-headline text-sm font-bold text-ballpark">Pitching Staff</h3>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted">Rotation</p>
        {rotation.length === 0 && (
          <p className="text-xs text-muted">No starters assigned</p>
        )}
        {rotation.map((entry, idx) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between rounded-card border px-2 py-1 text-sm ${
              idx === nextStarterIdx
                ? 'border-ballpark bg-ballpark/10'
                : 'border-sandstone/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-stat text-xs text-muted">SP{idx + 1}</span>
              <span className="font-medium text-ink">
                {entry.playerCard.nameFirst} {entry.playerCard.nameLast}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {entry.playerCard.pitching?.grade != null && (
                <span className="font-stat text-xs text-muted">
                  G{entry.playerCard.pitching?.grade}
                </span>
              )}
              {idx === nextStarterIdx && (
                <span className="rounded-full bg-ballpark px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  NEXT
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted">Bullpen</p>
        {bullpen.length === 0 && (
          <p className="text-xs text-muted">No relievers assigned</p>
        )}
        {bullpen.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-card border border-sandstone/50 px-2 py-1 text-sm"
          >
            <span className="font-medium text-ink">
              {entry.playerCard.nameFirst} {entry.playerCard.nameLast}
            </span>
            {entry.playerCard.pitching?.grade != null && (
              <span className="font-stat text-xs text-muted">
                G{entry.playerCard.pitching?.grade}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted">Closer</p>
        {closer ? (
          <div className="flex items-center justify-between rounded-card border border-stitch-red/30 bg-stitch-red/5 px-2 py-1 text-sm">
            <span className="font-medium text-ink">
              {closer.playerCard.nameFirst} {closer.playerCard.nameLast}
            </span>
            {closer.playerCard.pitching?.grade != null && (
              <span className="font-stat text-xs text-muted">
                G{closer.playerCard.pitching?.grade}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted">No closer assigned</p>
        )}
      </div>
    </div>
  );
}

export default PitchingRotation;
