/**
 * RosterPreviewPanel
 *
 * Vintage lineup card showing team's drafted roster.
 * Golden era aesthetic with position groupings.
 * Feature-scoped sub-component. No store imports.
 */

import type { DraftPickResult } from '@lib/types/draft';

export interface RosterPreviewPanelProps {
  picks: readonly DraftPickResult[];
  teamName: string;
  teamId: string;
}

// Position order for lineup display
const POSITION_ORDER = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];

function getPositionGroup(pos: string): 'infield' | 'outfield' | 'pitching' | 'other' {
  if (['C', '1B', '2B', '3B', 'SS'].includes(pos)) return 'infield';
  if (['LF', 'CF', 'RF', 'DH'].includes(pos)) return 'outfield';
  if (['SP', 'RP'].includes(pos)) return 'pitching';
  return 'other';
}

export function RosterPreviewPanel({ picks, teamName, teamId }: RosterPreviewPanelProps) {
  const teamPicks = picks.filter((p) => p.teamId === teamId);

  // Sort picks by position order
  const sortedPicks = [...teamPicks].sort((a, b) => {
    const aIdx = POSITION_ORDER.indexOf(a.position);
    const bIdx = POSITION_ORDER.indexOf(b.position);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  // Group by position type
  const groups = {
    infield: sortedPicks.filter((p) => getPositionGroup(p.position) === 'infield'),
    outfield: sortedPicks.filter((p) => getPositionGroup(p.position) === 'outfield'),
    pitching: sortedPicks.filter((p) => getPositionGroup(p.position) === 'pitching'),
    other: sortedPicks.filter((p) => getPositionGroup(p.position) === 'other'),
  };

  return (
    <div className="vintage-card overflow-hidden">
      {/* Header - Team name banner */}
      <div
        className="relative -mx-4 -mt-4 mb-4 bg-gradient-to-br from-[var(--color-leather)] to-[var(--color-leather-dark)] px-4 py-3"
        style={{
          borderBottom: '3px solid var(--color-gold)',
        }}
      >
        <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-[var(--color-cream)]">
          {teamName}
        </h3>
        <p className="font-stat text-xs text-[var(--color-cream)]/70">
          {teamPicks.length} Player{teamPicks.length !== 1 ? 's' : ''} Drafted
        </p>

        {/* Decorative baseball stitching */}
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '2px solid var(--color-stitch)',
            background: 'var(--color-cream)',
          }}
        />
      </div>

      {teamPicks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8">
          <svg
            className="mb-2 h-8 w-8 text-[var(--color-sandstone)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="font-stat text-xs text-[var(--color-muted)]">
            No players drafted yet
          </p>
        </div>
      )}

      {/* Roster sections */}
      <div className="max-h-72 space-y-3 overflow-y-auto">
        {groups.infield.length > 0 && (
          <RosterSection title="Infield" players={groups.infield} />
        )}
        {groups.outfield.length > 0 && (
          <RosterSection title="Outfield" players={groups.outfield} />
        )}
        {groups.pitching.length > 0 && (
          <RosterSection title="Pitching" players={groups.pitching} />
        )}
        {groups.other.length > 0 && (
          <RosterSection title="Utility" players={groups.other} />
        )}
      </div>

      {/* Footer */}
      {teamPicks.length > 0 && (
        <div className="mt-4 border-t border-[var(--color-sandstone)] pt-2">
          <p className="text-center font-stat text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            ★ Official Roster Card ★
          </p>
        </div>
      )}
    </div>
  );
}

function RosterSection({
  title,
  players,
}: {
  title: string;
  players: DraftPickResult[];
}) {
  return (
    <div>
      <h4 className="mb-1 font-headline text-[10px] font-bold uppercase tracking-wider text-[var(--color-ballpark)]">
        {title}
      </h4>
      <div className="space-y-0.5">
        {players.map((pick) => (
          <div
            key={`${pick.round}-${pick.pick}`}
            className="flex items-center gap-2 rounded border border-[var(--color-sandstone)]/50 bg-[var(--color-sandstone)]/10 px-2 py-1 transition-colors hover:bg-[var(--color-sandstone)]/20"
          >
            {/* Position badge */}
            <span
              className={`inline-flex h-5 w-7 items-center justify-center rounded font-stat text-[10px] font-bold ${
                ['SP', 'RP'].includes(pick.position)
                  ? 'bg-[var(--color-leather)]/20 text-[var(--color-leather)]'
                  : 'bg-[var(--color-ballpark)]/15 text-[var(--color-ballpark)]'
              }`}
            >
              {pick.position}
            </span>

            {/* Player name */}
            <span className="min-w-0 flex-1 truncate font-stat text-xs font-medium text-[var(--color-ink)]">
              {pick.playerName}
            </span>

            {/* Draft position indicator */}
            <span className="font-stat text-[10px] text-[var(--color-muted)]">
              R{pick.round}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RosterPreviewPanel;
