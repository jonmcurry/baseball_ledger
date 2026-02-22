/**
 * PlayerProfileModal
 *
 * "Encyclopedia Spread" player profile (REQ-UI-009, Section 3.4).
 * Heritage Editorial design: drop-cap biography, clean stat tables,
 * hairline borders, no leather/gold/rounded elements.
 *
 * Layer 6: Presentational component.
 */

import { useRef, useState, useEffect } from 'react';
import type { PlayerCard } from '@lib/types/player';
import type { BattingStats, PitchingStats } from '@lib/types/stats';
import { useFocusTrap } from '@hooks/useFocusTrap';
import { fetchPlayerSeasonStats } from '@services/stats-service';

export interface PlayerProfileModalProps {
  player: PlayerCard;
  isOpen: boolean;
  onClose: () => void;
  /** When provided, enables the "Season Stats" tab with simulation stats. */
  leagueId?: string;
}

const POWER_LABELS: Record<number, string> = {
  13: 'None',
  15: 'Minimal',
  16: 'Below Avg',
  17: 'Average',
  18: 'Above Avg',
  19: 'Good',
  20: 'Very Good',
  21: 'Excellent',
};

type TabId = 'card' | 'mlb' | 'season';

function pctLabel(value: number): string {
  return (value * 100).toFixed(0) + '%';
}

/** Position badge CSS class. */
function positionBadgeClass(pos: string): string {
  if (['SP', 'RP', 'CL'].includes(pos)) return 'position-badge position-badge-pitcher';
  if (pos === 'C') return 'position-badge position-badge-catcher';
  if (['1B', '2B', '3B', 'SS'].includes(pos)) return 'position-badge position-badge-infield';
  if (['LF', 'CF', 'RF', 'OF'].includes(pos)) return 'position-badge position-badge-outfield';
  if (pos === 'DH') return 'position-badge position-badge-dh';
  return 'position-badge';
}

function StatRow({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-[var(--border-subtle)] py-1.5 ${highlight ? 'bg-[var(--accent-muted)]' : ''}`}>
      <span className="font-body text-xs uppercase tracking-wide text-[var(--text-secondary)]">{label}</span>
      <span className="font-stat text-sm font-bold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-2 font-headline text-xs font-bold uppercase tracking-wider transition-colors ${
        isActive
          ? 'text-[var(--text-primary)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
      {isActive && (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-[var(--accent-secondary)]" />
      )}
    </button>
  );
}

function RatingBar({ value, max = 1 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className="h-1.5 w-full overflow-hidden bg-[var(--border-subtle)]">
      <div
        className="h-full bg-[var(--accent-secondary)] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Build a biographical narrative from player card data. */
function buildBiography(player: PlayerCard): string {
  const pos = player.primaryPosition;
  const year = player.seasonYear;
  const name = `${player.nameFirst} ${player.nameLast}`;
  const powerLabel = POWER_LABELS[player.powerRating] ?? 'average';

  if (player.isPitcher && player.pitching) {
    const role = player.pitching.role === 'SP' ? 'starting pitcher' : 'reliever';
    const era = player.pitching.era.toFixed(2);
    const grade = player.pitching.grade;
    return `${name}, a ${role} of the ${year} season, carried a grade of ${grade} and posted an earned run average of ${era}. Allowing just ${player.pitching.whip.toFixed(2)} baserunners per inning and fanning ${player.pitching.k9.toFixed(1)} per nine, this arm commanded attention from the mound.`;
  }

  const bats = player.battingHand === 'L' ? 'left-handed' : player.battingHand === 'R' ? 'right-handed' : 'switch';
  const speed = player.speed >= 0.7 ? 'fleet-footed' : player.speed >= 0.4 ? 'capable on the basepaths' : 'not known for speed';
  return `${name}, ${bats} ${pos.toLowerCase() === 'dh' ? 'designated hitter' : pos.toLowerCase()} of the ${year} campaign, brought ${powerLabel.toLowerCase()} power to the plate. A ${speed} player with a ${pctLabel(player.contactRate)} contact rate, ${player.nameLast} commanded a disciplined eye at ${pctLabel(player.discipline)}.`;
}

/** Headline stat display -- 3 key numbers. */
function HeadlineStats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-4 border-b border-[var(--border-default)] pb-4">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="font-stat text-2xl font-bold text-[var(--text-primary)]">
            {item.value}
          </div>
          <div className="font-stat text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Section heading within a tab. */
function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-2 border-b-2 border-[var(--text-primary)] pb-1">
      <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
        {title}
      </h4>
    </div>
  );
}

function CardRatingsTab({ player }: { player: PlayerCard }) {
  const powerLabel = POWER_LABELS[player.powerRating] ?? String(player.powerRating);
  const biography = buildBiography(player);

  return (
    <div className="space-y-5">
      {/* Biographical narrative with drop-cap */}
      <p className="drop-cap font-body text-sm leading-relaxed text-[var(--text-primary)]">
        {biography}
      </p>

      {/* Batting / Card Attributes */}
      {!player.isPitcher && (
        <div>
          <SectionHeading title="Batting Ratings" />
          <div className="space-y-3 py-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-xs uppercase tracking-wide text-[var(--text-secondary)]">Power</span>
                <span className="font-stat text-sm font-bold text-[var(--accent-secondary)]">{powerLabel}</span>
              </div>
              <RatingBar value={player.powerRating - 13} max={8} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-xs uppercase tracking-wide text-[var(--text-secondary)]">Speed</span>
                <span className="font-stat text-sm">{pctLabel(player.speed)}</span>
              </div>
              <RatingBar value={player.speed} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-xs uppercase tracking-wide text-[var(--text-secondary)]">Contact</span>
                <span className="font-stat text-sm">{pctLabel(player.contactRate)}</span>
              </div>
              <RatingBar value={player.contactRate} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-xs uppercase tracking-wide text-[var(--text-secondary)]">Discipline</span>
                <span className="font-stat text-sm">{pctLabel(player.discipline)}</span>
              </div>
              <RatingBar value={player.discipline} />
            </div>

            <div className="border-t border-[var(--border-default)] pt-2">
              <StatRow label="ISO (Power)" value={player.power.toFixed(3)} />
            </div>
          </div>
        </div>
      )}

      {/* Pitching Attributes */}
      {player.pitching && (
        <div>
          <SectionHeading title="Pitching Ratings" />
          <div className="py-2">
            {/* Grade + Role headline */}
            <div className="mb-4 flex items-center gap-6 border-b border-[var(--border-default)] pb-4">
              <div className="text-center">
                <div className="font-stat text-4xl font-bold text-[var(--accent-secondary)]">
                  {player.pitching.grade}
                </div>
                <div className="font-stat text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  Grade
                </div>
              </div>
              <div className="h-10 w-px bg-[var(--border-default)]" />
              <div className="text-center">
                <div className="font-stat text-2xl font-bold text-[var(--text-primary)]">
                  {player.pitching.role}
                </div>
                <div className="font-stat text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  Role
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4">
              <StatRow label="ERA" value={player.pitching.era.toFixed(2)} highlight />
              <StatRow label="WHIP" value={player.pitching.whip.toFixed(2)} />
              <StatRow label="K/9" value={player.pitching.k9.toFixed(1)} />
              <StatRow label="BB/9" value={player.pitching.bb9.toFixed(1)} />
              <StatRow label="Stamina" value={player.pitching.stamina.toFixed(1)} />
            </div>
          </div>
        </div>
      )}

      {/* Fielding */}
      <div>
        <SectionHeading title="Fielding" />
        <div className="py-2">
          <div className="mb-3 flex flex-wrap gap-1">
            {player.eligiblePositions.map((pos) => (
              <span
                key={pos}
                className={`inline-block px-2 py-0.5 text-[10px] font-bold ${positionBadgeClass(pos)}`}
              >
                {pos}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                {player.fieldingPct.toFixed(3)}
              </div>
              <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">FLD%</div>
            </div>
            <div>
              <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                {pctLabel(player.range)}
              </div>
              <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">Range</div>
            </div>
            <div>
              <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                {pctLabel(player.arm)}
              </div>
              <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">Arm</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MlbStatsTab({ player }: { player: PlayerCard }) {
  const batting = player.mlbBattingStats;
  const pitching = player.mlbPitchingStats;

  if (!batting && !pitching) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="font-body text-sm text-[var(--text-secondary)]">
          No MLB stats available for this player.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Batting Stats */}
      {batting && (
        <div>
          <SectionHeading title={`${player.seasonYear} Season Batting`} />
          <div className="py-2">
            <HeadlineStats items={[
              { value: batting.BA.toFixed(3).replace('0.', '.'), label: 'AVG' },
              { value: String(batting.HR), label: 'HR' },
              { value: String(batting.RBI), label: 'RBI' },
            ]} />

            <div className="grid grid-cols-2 gap-x-4 text-sm">
              <StatRow label="Games" value={batting.G} />
              <StatRow label="At Bats" value={batting.AB} />
              <StatRow label="Runs" value={batting.R} />
              <StatRow label="Hits" value={batting.H} />
              <StatRow label="Doubles" value={batting.doubles} />
              <StatRow label="Triples" value={batting.triples} />
              <StatRow label="Stolen Bases" value={batting.SB} />
              <StatRow label="Walks" value={batting.BB} />
              <StatRow label="Strikeouts" value={batting.SO} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-4 border-t border-[var(--border-default)] pt-3 text-center">
              <div>
                <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                  {batting.OBP.toFixed(3)}
                </div>
                <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">OBP</div>
              </div>
              <div>
                <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                  {batting.SLG.toFixed(3)}
                </div>
                <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">SLG</div>
              </div>
              <div>
                <div className="font-stat text-lg font-bold text-[var(--accent-secondary)]">
                  {batting.OPS.toFixed(3)}
                </div>
                <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">OPS</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pitching Stats */}
      {pitching && (
        <div>
          <SectionHeading title={`${player.seasonYear} Season Pitching`} />
          <div className="py-2">
            <HeadlineStats items={[
              { value: pitching.ERA.toFixed(2), label: 'ERA' },
              { value: `${pitching.W}-${pitching.L}`, label: 'W-L' },
              { value: String(pitching.SO), label: 'K' },
            ]} />

            <div className="grid grid-cols-2 gap-x-4 text-sm">
              <StatRow label="Games" value={pitching.G} />
              <StatRow label="Games Started" value={pitching.GS} />
              <StatRow label="Saves" value={pitching.SV} />
              <StatRow label="Innings" value={pitching.IP.toFixed(1)} />
              <StatRow label="Hits" value={pitching.H} />
              <StatRow label="Earned Runs" value={pitching.ER} />
              <StatRow label="Home Runs" value={pitching.HR} />
              <StatRow label="Walks" value={pitching.BB} />
              <StatRow label="WHIP" value={pitching.WHIP.toFixed(2)} highlight />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SeasonStatsTab({ player, leagueId }: { player: PlayerCard; leagueId: string }) {
  const [battingStats, setBattingStats] = useState<BattingStats | null>(null);
  const [pitchingStats, setPitchingStats] = useState<PitchingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPlayerSeasonStats(leagueId, player.playerId)
      .then((data) => {
        if (cancelled) return;
        setBattingStats(data.battingStats);
        setPitchingStats(data.pitchingStats);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? 'Failed to load season stats');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [leagueId, player.playerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin border-2 border-[var(--accent-secondary)] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="font-body text-sm text-[var(--accent-secondary)]">{error}</p>
      </div>
    );
  }

  if (!battingStats && !pitchingStats) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="font-body text-sm text-[var(--text-secondary)]">
          No season stats recorded yet. Play some games first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {battingStats && battingStats.G > 0 && (
        <div>
          <SectionHeading title="Season Batting" />
          <div className="py-2">
            <HeadlineStats items={[
              { value: battingStats.BA.toFixed(3).replace('0.', '.'), label: 'AVG' },
              { value: String(battingStats.HR), label: 'HR' },
              { value: String(battingStats.RBI), label: 'RBI' },
            ]} />

            <div className="grid grid-cols-2 gap-x-4 text-sm">
              <StatRow label="Games" value={battingStats.G} />
              <StatRow label="At Bats" value={battingStats.AB} />
              <StatRow label="Runs" value={battingStats.R} />
              <StatRow label="Hits" value={battingStats.H} />
              <StatRow label="Doubles" value={battingStats.doubles} />
              <StatRow label="Triples" value={battingStats.triples} />
              <StatRow label="Stolen Bases" value={battingStats.SB} />
              <StatRow label="Walks" value={battingStats.BB} />
              <StatRow label="Strikeouts" value={battingStats.SO} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-4 border-t border-[var(--border-default)] pt-3 text-center">
              <div>
                <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                  {battingStats.OBP.toFixed(3)}
                </div>
                <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">OBP</div>
              </div>
              <div>
                <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                  {battingStats.SLG.toFixed(3)}
                </div>
                <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">SLG</div>
              </div>
              <div>
                <div className="font-stat text-lg font-bold text-[var(--accent-secondary)]">
                  {battingStats.OPS.toFixed(3)}
                </div>
                <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">OPS</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pitchingStats && pitchingStats.G > 0 && (
        <div>
          <SectionHeading title="Season Pitching" />
          <div className="py-2">
            <HeadlineStats items={[
              { value: pitchingStats.ERA.toFixed(2), label: 'ERA' },
              { value: `${pitchingStats.W}-${pitchingStats.L}`, label: 'W-L' },
              { value: String(pitchingStats.SO), label: 'K' },
            ]} />

            <div className="grid grid-cols-2 gap-x-4 text-sm">
              <StatRow label="Games" value={pitchingStats.G} />
              <StatRow label="Games Started" value={pitchingStats.GS} />
              <StatRow label="Saves" value={pitchingStats.SV} />
              <StatRow label="Holds" value={pitchingStats.HLD} />
              <StatRow label="Innings" value={pitchingStats.IP.toFixed(1)} />
              <StatRow label="Hits" value={pitchingStats.H} />
              <StatRow label="Earned Runs" value={pitchingStats.ER} />
              <StatRow label="Home Runs" value={pitchingStats.HR} />
              <StatRow label="Walks" value={pitchingStats.BB} />
              <StatRow label="WHIP" value={pitchingStats.WHIP.toFixed(2)} highlight />
              <StatRow label="FIP" value={pitchingStats.FIP.toFixed(2)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PlayerProfileModal({ player, isOpen, onClose, leagueId }: PlayerProfileModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('card');
  const [expanded, setExpanded] = useState(false);
  useFocusTrap(containerRef, isOpen, onClose);

  if (!isOpen) return null;

  const containerClass = expanded
    ? 'animate-slide-up w-full max-w-3xl max-h-[90vh] overflow-hidden border border-[var(--border-default)] bg-[var(--surface-base)] shadow-elevated flex flex-col'
    : 'animate-slide-up w-full max-w-md overflow-hidden border border-[var(--border-default)] bg-[var(--surface-base)] shadow-elevated';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--text-primary)]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.nameFirst} ${player.nameLast} profile`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className={containerClass}
      >
        {/* Header -- Editorial encyclopedia style */}
        <div className="border-b border-[var(--border-default)] px-5 pb-4 pt-5">
          {/* Close + Expand buttons */}
          <div className="absolute right-3 top-3 flex items-center gap-1">
            <button
              type="button"
              aria-label={expanded ? 'Collapse' : 'Expand'}
              onClick={() => setExpanded((prev) => !prev)}
              className="flex h-6 w-6 items-center justify-center text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {expanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                )}
              </svg>
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Position + Year small caps */}
          <div className="mb-1 flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold ${positionBadgeClass(player.primaryPosition)}`}>
              {player.primaryPosition}
            </span>
            <span className="font-stat text-xs tracking-wider text-[var(--text-tertiary)]">
              {player.seasonYear}
            </span>
          </div>

          {/* Player name -- large Playfair Display, larger when expanded */}
          <h3 className={`font-headline leading-tight tracking-tight text-[var(--text-primary)] ${expanded ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
            {player.nameFirst}{' '}
            <span className="text-[var(--accent-secondary)]">{player.nameLast}</span>
          </h3>

          {/* Batting / Throwing */}
          <div className="mt-2 flex items-center gap-3 font-stat text-xs text-[var(--text-secondary)]">
            <span>
              Bats: <span className="font-bold text-[var(--text-primary)]">{player.battingHand}</span>
            </span>
            <span className="text-[var(--border-default)]">|</span>
            <span>
              Throws: <span className="font-bold text-[var(--text-primary)]">{player.throwingHand}</span>
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-default)] bg-[var(--surface-raised)]">
          <TabButton
            label="Card Ratings"
            isActive={activeTab === 'card'}
            onClick={() => setActiveTab('card')}
          />
          <TabButton
            label="MLB Stats"
            isActive={activeTab === 'mlb'}
            onClick={() => setActiveTab('mlb')}
          />
          {leagueId && (
            <TabButton
              label="Season"
              isActive={activeTab === 'season'}
              onClick={() => setActiveTab('season')}
            />
          )}
        </div>

        {/* Body -- expanded uses 2-column editorial spread */}
        <div className={expanded ? 'flex-1 overflow-y-auto p-5 md:p-8' : 'max-h-[60vh] overflow-y-auto p-5'}>
          {expanded ? (
            <div className="grid gap-8 md:grid-cols-2">
              {/* Left: biography with larger drop-cap */}
              <div className="space-y-4">
                <p className="drop-cap font-body text-base leading-relaxed text-[var(--text-primary)]">
                  {buildBiography(player)}
                </p>
                {/* Fielding section inline in expanded left column */}
                <div>
                  <SectionHeading title="Fielding" />
                  <div className="py-2">
                    <div className="mb-3 flex flex-wrap gap-1">
                      {player.eligiblePositions.map((pos) => (
                        <span
                          key={pos}
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold ${positionBadgeClass(pos)}`}
                        >
                          {pos}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                          {player.fieldingPct.toFixed(3)}
                        </div>
                        <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">FLD%</div>
                      </div>
                      <div>
                        <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                          {pctLabel(player.range)}
                        </div>
                        <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">Range</div>
                      </div>
                      <div>
                        <div className="font-stat text-lg font-bold text-[var(--text-primary)]">
                          {pctLabel(player.arm)}
                        </div>
                        <div className="font-stat text-[10px] uppercase text-[var(--text-tertiary)]">Arm</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Right: active tab content at full width */}
              <div>
                {activeTab === 'card' && <CardRatingsTab player={player} />}
                {activeTab === 'mlb' && <MlbStatsTab player={player} />}
                {activeTab === 'season' && leagueId && (
                  <SeasonStatsTab player={player} leagueId={leagueId} />
                )}
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'card' && <CardRatingsTab player={player} />}
              {activeTab === 'mlb' && <MlbStatsTab player={player} />}
              {activeTab === 'season' && leagueId && (
                <SeasonStatsTab player={player} leagueId={leagueId} />
              )}
            </>
          )}
        </div>

        {/* Footer -- clean editorial */}
        <div className="border-t border-[var(--border-default)] px-5 py-2">
          <div className="flex items-center justify-between font-stat text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
            <span>Baseball Ledger</span>
            <span>{player.playerId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerProfileModal;
