/**
 * RosterPreviewPanel
 *
 * Vintage lineup card showing team's drafted roster during the draft.
 * Position-aware: auto-assigns starters vs bench based on draft order.
 * Groups: Starting Lineup (9), Bench (4), Pitching with SP/RP sub-groups.
 *
 * Feature-scoped sub-component. No store imports.
 */

import type { DraftPickResult } from '@lib/types/draft';

export interface RosterPreviewPanelProps {
  picks: readonly DraftPickResult[];
  teamName: string;
  teamId: string;
}

/** Defensive starter slots in lineup order. 3 generic OF slots for any outfielder. */
const STARTER_SLOTS = ['C', '1B', '2B', 'SS', '3B', 'OF', 'OF', 'OF', 'DH'] as const;

/** Which natural positions can fill each starter slot. */
const SLOT_ELIGIBLE: Record<string, string[]> = {
  C: ['C'],
  '1B': ['1B'],
  '2B': ['2B'],
  SS: ['SS'],
  '3B': ['3B'],
  OF: ['LF', 'CF', 'RF', 'OF'],
  DH: ['DH', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'OF'],
};

type RosterSlot = 'starter' | 'bench' | 'sp' | 'rp';

interface SlottedPick {
  pick: DraftPickResult;
  slot: RosterSlot;
  lineupPosition?: string;
}

/**
 * Assign each drafted player to a roster slot based on draft order.
 * First player at each defensive position becomes the starter.
 * OF slots are generic -- first 3 outfielders (LF/CF/RF) fill them.
 * Pitchers go to SP or RP/CL groups. Excess position players go to bench.
 */
function assignSlots(teamPicks: DraftPickResult[]): SlottedPick[] {
  // Track filled slots by index (needed because OF appears 3 times)
  const filledIndices = new Set<number>();
  const result: SlottedPick[] = [];

  const ordered = [...teamPicks].sort((a, b) =>
    a.round !== b.round ? a.round - b.round : a.pick - b.pick,
  );

  for (const pick of ordered) {
    const pos = pick.position;

    if (pos === 'SP') {
      result.push({ pick, slot: 'sp' });
      continue;
    }
    if (pos === 'RP' || pos === 'CL') {
      result.push({ pick, slot: 'rp' });
      continue;
    }

    let assigned = false;
    for (let i = 0; i < STARTER_SLOTS.length; i++) {
      if (filledIndices.has(i)) continue;
      const slotName = STARTER_SLOTS[i];
      const eligible = SLOT_ELIGIBLE[slotName];
      if (eligible && eligible.includes(pos)) {
        filledIndices.add(i);
        result.push({ pick, slot: 'starter', lineupPosition: `${slotName}:${i}` });
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      result.push({ pick, slot: 'bench' });
    }
  }

  return result;
}

export function RosterPreviewPanel({ picks, teamName, teamId }: RosterPreviewPanelProps) {
  const teamPicks = picks.filter((p) => p.teamId === teamId);
  const slotted = assignSlots(teamPicks);

  const starters = slotted.filter((s) => s.slot === 'starter');
  const bench = slotted.filter((s) => s.slot === 'bench');
  const sps = slotted.filter((s) => s.slot === 'sp');
  const rps = slotted.filter((s) => s.slot === 'rp');

  // Sort starters by their slot index (encoded as "SLOT:index")
  starters.sort((a, b) => {
    const aIdx = parseInt((a.lineupPosition ?? '0').split(':')[1] ?? '99', 10);
    const bIdx = parseInt((b.lineupPosition ?? '0').split(':')[1] ?? '99', 10);
    return aIdx - bIdx;
  });

  const totalPitchers = sps.length + rps.length;
  const totalPosition = starters.length + bench.length;

  return (
    <div className="vintage-card overflow-hidden">
      {/* Header */}
      <div
        className="relative -mx-4 -mt-4 mb-3 bg-gradient-to-br from-[var(--color-leather)] to-[var(--color-leather-dark)] px-4 py-3"
        style={{ borderBottom: '3px solid var(--color-gold)' }}
      >
        <h3
          className="font-headline text-sm font-bold uppercase tracking-wider"
          style={{ color: 'var(--color-ink)' }}
        >
          {teamName}
        </h3>
        <p className="font-stat text-xs" style={{ color: 'var(--color-muted)' }}>
          {teamPicks.length} / 21 Drafted
        </p>
      </div>

      {teamPicks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8">
          <svg
            className="mb-2 h-8 w-8"
            style={{ color: 'var(--border-default)' }}
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
          <p className="font-stat text-xs" style={{ color: 'var(--color-muted)' }}>
            No players drafted yet
          </p>
        </div>
      )}

      {teamPicks.length > 0 && (
        <div className="space-y-4">
          {/* Starting Lineup */}
          <div>
            <SectionHeader title="Starting Lineup" count={starters.length} target={9} />
            <div className="mt-1.5">
              {STARTER_SLOTS.map((slotName, idx) => {
                const key = `${slotName}:${idx}`;
                const filled = starters.find((s) => s.lineupPosition === key);
                return (
                  <LineupRow
                    key={key}
                    slotLabel={slotName}
                    pick={filled?.pick ?? null}
                    badgeStyle="position"
                  />
                );
              })}
            </div>
          </div>

          {/* Bench */}
          <div>
            <SectionHeader title="Bench" count={bench.length} target={4} />
            <div className="mt-1.5">
              {bench.map((s) => (
                <LineupRow
                  key={`${s.pick.round}-${s.pick.pick}`}
                  slotLabel="BN"
                  pick={s.pick}
                  badgeStyle="bench"
                  showNaturalPosition
                />
              ))}
              {Array.from({ length: Math.max(0, 4 - bench.length) }).map((_, i) => (
                <EmptySlot key={`bench-empty-${i}`} label="BN" />
              ))}
            </div>
          </div>

          {/* Pitching */}
          <div>
            <SectionHeader title="Pitching" count={totalPitchers} target={8} />

            <div className="mt-1.5">
              <SubLabel text="Rotation" />
              {sps.map((s) => (
                <LineupRow
                  key={`${s.pick.round}-${s.pick.pick}`}
                  slotLabel="SP"
                  pick={s.pick}
                  badgeStyle="pitcher"
                />
              ))}
              {Array.from({ length: Math.max(0, 4 - sps.length) }).map((_, i) => (
                <EmptySlot key={`sp-empty-${i}`} label="SP" />
              ))}
            </div>

            <div className="mt-2">
              <SubLabel text="Bullpen" />
              {rps.map((s) => (
                <LineupRow
                  key={`${s.pick.round}-${s.pick.pick}`}
                  slotLabel={s.pick.position}
                  pick={s.pick}
                  badgeStyle="pitcher"
                />
              ))}
              {Array.from({ length: Math.max(0, 4 - rps.length) }).map((_, i) => (
                <EmptySlot key={`rp-empty-${i}`} label="RP" />
              ))}
            </div>
          </div>

          {/* Composition summary */}
          <div
            className="rounded border px-3 py-2"
            style={{
              borderColor: 'var(--border-default)',
              background: 'var(--surface-overlay)',
            }}
          >
            <div className="flex items-center justify-between font-stat text-[10px]">
              <span style={{ color: 'var(--color-muted)' }}>
                POS {totalPosition}/13
              </span>
              <span
                className="mx-2 h-px flex-1"
                style={{ background: 'var(--border-default)' }}
              />
              <span style={{ color: 'var(--color-muted)' }}>
                PIT {totalPitchers}/8
              </span>
              <span
                className="mx-2 h-px flex-1"
                style={{ background: 'var(--border-default)' }}
              />
              <span
                style={{
                  color:
                    teamPicks.length === 21
                      ? 'var(--semantic-success)'
                      : 'var(--color-muted)',
                  fontWeight: teamPicks.length === 21 ? 700 : 400,
                }}
              >
                {teamPicks.length}/21
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-2" style={{ borderColor: 'var(--border-default)' }}>
            <p
              className="text-center font-stat text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--color-muted)' }}
            >
              &#9733; Official Roster Card &#9733;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------
   Sub-components
   ------------------------------------------------------------------- */

function SectionHeader({
  title,
  count,
  target,
}: {
  title: string;
  count: number;
  target: number;
}) {
  const isFull = count >= target;
  return (
    <div className="flex items-center justify-between">
      <h4
        className="font-headline text-[10px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--accent-primary)' }}
      >
        {title}
      </h4>
      <span
        className="font-stat text-[10px]"
        style={{ color: isFull ? 'var(--semantic-success)' : 'var(--color-muted)' }}
      >
        {count}/{target}
      </span>
    </div>
  );
}

function SubLabel({ text }: { text: string }) {
  return (
    <p
      className="mb-0.5 font-stat text-[9px] uppercase tracking-wider"
      style={{ color: 'var(--color-wood)' }}
    >
      {text}
    </p>
  );
}

function LineupRow({
  slotLabel,
  pick,
  badgeStyle,
  showNaturalPosition,
}: {
  slotLabel: string;
  pick: DraftPickResult | null;
  badgeStyle: 'position' | 'bench' | 'pitcher';
  showNaturalPosition?: boolean;
}) {
  if (!pick) return <EmptySlot label={slotLabel} />;

  const badgeCss: Record<string, { bg: string; fg: string }> = {
    position: { bg: 'rgba(27,77,62,0.12)', fg: 'var(--accent-primary)' },
    bench: { bg: 'rgba(139,127,107,0.15)', fg: 'var(--color-muted)' },
    pitcher: { bg: 'rgba(178,34,34,0.12)', fg: 'var(--semantic-danger)' },
  };
  const colors = badgeCss[badgeStyle];

  return (
    <div
      className="flex items-center gap-2 border-b px-2 py-1.5 transition-colors"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <span
        className="inline-flex h-5 w-8 shrink-0 items-center justify-center rounded font-stat text-[10px] font-bold"
        style={{ background: colors.bg, color: colors.fg }}
      >
        {slotLabel}
      </span>

      <span
        className="min-w-0 flex-1 truncate font-stat text-xs font-medium"
        style={{ color: 'var(--color-ink)' }}
      >
        {pick.playerName}
        {showNaturalPosition && (
          <span
            className="ml-1 text-[9px] font-normal"
            style={{ color: 'var(--color-wood)' }}
          >
            ({pick.position})
          </span>
        )}
      </span>

      <span
        className="shrink-0 font-stat text-[10px]"
        style={{ color: 'var(--color-muted)' }}
      >
        R{pick.round}
      </span>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-2 border-b px-2 py-1.5"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <span
        className="inline-flex h-5 w-8 shrink-0 items-center justify-center rounded font-stat text-[10px] font-bold"
        style={{ background: 'var(--accent-muted)', color: 'var(--text-tertiary)' }}
      >
        {label}
      </span>
      <span
        className="flex-1 font-stat text-[10px] italic"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ---
      </span>
    </div>
  );
}

export default RosterPreviewPanel;
