/**
 * PlayerProfileModal
 *
 * "Vintage Baseball Card" popup (REQ-UI-009).
 * Styled as a classic 1950s-60s Topps/Bowman trading card.
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

function getPositionColor(position: string): string {
  if (['SP', 'RP', 'CL'].includes(position)) return 'bg-[var(--color-stitch)]';
  if (position === 'C') return 'bg-[var(--color-leather)]';
  if (['1B', '2B', '3B', 'SS'].includes(position)) return 'bg-[var(--color-dirt)]';
  if (['LF', 'CF', 'RF'].includes(position)) return 'bg-[var(--color-grass)]';
  return 'bg-[var(--color-gold)]';
}

function StatRow({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${highlight ? 'bg-[var(--color-gold)]/10' : ''}`}>
      <span className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</span>
      <span className="font-stat text-sm font-bold text-[var(--color-ink)]">{value}</span>
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
      className={`relative px-4 py-2 font-headline text-xs font-bold uppercase tracking-wider transition-all ${
        isActive
          ? 'text-[var(--color-cream)]'
          : 'text-[var(--color-cream)]/60 hover:text-[var(--color-cream)]'
      }`}
    >
      {label}
      {isActive && (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-[var(--color-gold)]" />
      )}
    </button>
  );
}

function RatingBar({ value, max = 1, color = 'gold' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorClass = color === 'gold' ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-stitch)]';

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-ink)]/10">
      <div
        className={`h-full ${colorClass} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CardRatingsTab({ player }: { player: PlayerCard }) {
  const powerLabel = POWER_LABELS[player.powerRating] ?? String(player.powerRating);

  return (
    <div className="space-y-4">
      {/* Batting / Card Attributes */}
      {!player.isPitcher && (
        <div className="vintage-card overflow-hidden">
          <div className="bg-[var(--color-scoreboard)] px-3 py-2">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
              Batting Ratings
            </h4>
          </div>
          <div className="space-y-1 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-[var(--color-muted)]">Power</span>
              <span className="font-stat text-sm font-bold text-[var(--color-stitch)]">{powerLabel}</span>
            </div>
            <RatingBar value={player.powerRating - 13} max={8} color="stitch" />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs uppercase text-[var(--color-muted)]">Speed</span>
              <span className="font-stat text-sm">{pctLabel(player.speed)}</span>
            </div>
            <RatingBar value={player.speed} />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs uppercase text-[var(--color-muted)]">Contact</span>
              <span className="font-stat text-sm">{pctLabel(player.contactRate)}</span>
            </div>
            <RatingBar value={player.contactRate} />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs uppercase text-[var(--color-muted)]">Discipline</span>
              <span className="font-stat text-sm">{pctLabel(player.discipline)}</span>
            </div>
            <RatingBar value={player.discipline} />

            <div className="mt-3 border-t border-[var(--color-leather)]/20 pt-2">
              <StatRow label="ISO (Power)" value={player.power.toFixed(3)} />
            </div>
          </div>
        </div>
      )}

      {/* Pitching Attributes */}
      {player.pitching && (
        <div className="vintage-card overflow-hidden">
          <div className="bg-[var(--color-stitch)] px-3 py-2">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-white">
              Pitching Ratings
            </h4>
          </div>
          <div className="p-3">
            {/* Pitcher Grade - Big Display */}
            <div className="mb-4 flex items-center justify-center gap-4 rounded-lg bg-[var(--color-scoreboard)] p-3">
              <div className="text-center">
                <div className="font-scoreboard text-4xl font-bold text-[var(--color-gold)]">
                  {player.pitching.grade}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">
                  Grade
                </div>
              </div>
              <div className="h-12 w-px bg-[var(--color-scoreboard-text)]/20" />
              <div className="text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-scoreboard-text)]">
                  {player.pitching.role}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">
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
      <div className="vintage-card overflow-hidden">
        <div className="bg-[var(--color-grass)] px-3 py-2">
          <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-white">
            Fielding
          </h4>
        </div>
        <div className="p-3">
          <div className="mb-3 flex flex-wrap gap-1">
            {player.eligiblePositions.map((pos) => (
              <span
                key={pos}
                className={`${getPositionColor(pos)} rounded px-2 py-0.5 text-xs font-bold text-white`}
              >
                {pos}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-[var(--color-cream-dark)] p-2">
              <div className="font-stat text-lg font-bold text-[var(--color-scoreboard)]">
                {player.fieldingPct.toFixed(3)}
              </div>
              <div className="text-[10px] uppercase text-[var(--color-muted)]">FLD%</div>
            </div>
            <div className="rounded bg-[var(--color-cream-dark)] p-2">
              <div className="font-stat text-lg font-bold text-[var(--color-scoreboard)]">
                {pctLabel(player.range)}
              </div>
              <div className="text-[10px] uppercase text-[var(--color-muted)]">Range</div>
            </div>
            <div className="rounded bg-[var(--color-cream-dark)] p-2">
              <div className="font-stat text-lg font-bold text-[var(--color-scoreboard)]">
                {pctLabel(player.arm)}
              </div>
              <div className="text-[10px] uppercase text-[var(--color-muted)]">Arm</div>
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
        <div className="mb-2 text-4xl">📊</div>
        <p className="font-headline text-sm text-[var(--color-muted)]">
          No MLB stats available for this player.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batting Stats */}
      {batting && (
        <div className="vintage-card overflow-hidden">
          <div className="bg-[var(--color-scoreboard)] px-3 py-2">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
              {player.seasonYear} Season Batting
            </h4>
          </div>
          <div className="p-3">
            {/* Triple Crown Stats - Big Display */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-[var(--color-leather)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-cream)]">
                  {batting.BA.toFixed(3).replace('0.', '.')}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-cream)]/70">AVG</div>
              </div>
              <div className="rounded-lg bg-[var(--color-leather)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-cream)]">
                  {batting.HR}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-cream)]/70">HR</div>
              </div>
              <div className="rounded-lg bg-[var(--color-leather)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-cream)]">
                  {batting.RBI}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-cream)]/70">RBI</div>
              </div>
            </div>

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

            <div className="mt-3 border-t border-[var(--color-leather)]/20 pt-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="font-stat text-lg font-bold text-[var(--color-gold)]">
                    {batting.OBP.toFixed(3)}
                  </div>
                  <div className="text-[10px] uppercase text-[var(--color-muted)]">OBP</div>
                </div>
                <div>
                  <div className="font-stat text-lg font-bold text-[var(--color-gold)]">
                    {batting.SLG.toFixed(3)}
                  </div>
                  <div className="text-[10px] uppercase text-[var(--color-muted)]">SLG</div>
                </div>
                <div>
                  <div className="font-stat text-lg font-bold text-[var(--color-stitch)]">
                    {batting.OPS.toFixed(3)}
                  </div>
                  <div className="text-[10px] uppercase text-[var(--color-muted)]">OPS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pitching Stats */}
      {pitching && (
        <div className="vintage-card overflow-hidden">
          <div className="bg-[var(--color-stitch)] px-3 py-2">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-white">
              {player.seasonYear} Season Pitching
            </h4>
          </div>
          <div className="p-3">
            {/* Key Pitching Stats - Big Display */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-[var(--color-scoreboard)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-gold)]">
                  {pitching.ERA.toFixed(2)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">ERA</div>
              </div>
              <div className="rounded-lg bg-[var(--color-scoreboard)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-scoreboard-text)]">
                  {pitching.W}-{pitching.L}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">W-L</div>
              </div>
              <div className="rounded-lg bg-[var(--color-scoreboard)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-scoreboard-text)]">
                  {pitching.SO}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">K</div>
              </div>
            </div>

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-gold)] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="font-headline text-sm text-[var(--color-stitch)]">{error}</p>
      </div>
    );
  }

  if (!battingStats && !pitchingStats) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="font-headline text-sm text-[var(--color-muted)]">
          No season stats recorded yet. Play some games first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {battingStats && battingStats.G > 0 && (
        <div className="vintage-card overflow-hidden">
          <div className="bg-[var(--color-scoreboard)] px-3 py-2">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
              Season Batting
            </h4>
          </div>
          <div className="p-3">
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-[var(--color-leather)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-cream)]">
                  {battingStats.BA.toFixed(3).replace('0.', '.')}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-cream)]/70">AVG</div>
              </div>
              <div className="rounded-lg bg-[var(--color-leather)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-cream)]">
                  {battingStats.HR}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-cream)]/70">HR</div>
              </div>
              <div className="rounded-lg bg-[var(--color-leather)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-cream)]">
                  {battingStats.RBI}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-cream)]/70">RBI</div>
              </div>
            </div>

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

            <div className="mt-3 border-t border-[var(--color-leather)]/20 pt-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="font-stat text-lg font-bold text-[var(--color-gold)]">
                    {battingStats.OBP.toFixed(3)}
                  </div>
                  <div className="text-[10px] uppercase text-[var(--color-muted)]">OBP</div>
                </div>
                <div>
                  <div className="font-stat text-lg font-bold text-[var(--color-gold)]">
                    {battingStats.SLG.toFixed(3)}
                  </div>
                  <div className="text-[10px] uppercase text-[var(--color-muted)]">SLG</div>
                </div>
                <div>
                  <div className="font-stat text-lg font-bold text-[var(--color-stitch)]">
                    {battingStats.OPS.toFixed(3)}
                  </div>
                  <div className="text-[10px] uppercase text-[var(--color-muted)]">OPS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pitchingStats && pitchingStats.G > 0 && (
        <div className="vintage-card overflow-hidden">
          <div className="bg-[var(--color-stitch)] px-3 py-2">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-white">
              Season Pitching
            </h4>
          </div>
          <div className="p-3">
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-[var(--color-scoreboard)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-gold)]">
                  {pitchingStats.ERA.toFixed(2)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">ERA</div>
              </div>
              <div className="rounded-lg bg-[var(--color-scoreboard)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-scoreboard-text)]">
                  {pitchingStats.W}-{pitchingStats.L}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">W-L</div>
              </div>
              <div className="rounded-lg bg-[var(--color-scoreboard)] p-3 text-center">
                <div className="font-scoreboard text-2xl font-bold text-[var(--color-scoreboard-text)]">
                  {pitchingStats.SO}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">K</div>
              </div>
            </div>

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
  useFocusTrap(containerRef, isOpen, onClose);

  if (!isOpen) return null;

  const positionColorClass = getPositionColor(player.primaryPosition);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.nameFirst} ${player.nameLast} profile`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="animate-slide-up w-full max-w-md overflow-hidden rounded-xl shadow-elevated"
        style={{
          background: `
            linear-gradient(145deg, var(--color-parchment) 0%, var(--color-cream-dark) 100%)
          `,
          border: '4px solid var(--color-leather)',
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            CARD HEADER - Vintage Baseball Card Style
            ═══════════════════════════════════════════════════════════════════ */}
        <div
          className="relative overflow-hidden"
          style={{
            background: `
              linear-gradient(180deg, var(--color-leather) 0%, var(--color-leather-dark) 100%)
            `,
          }}
        >
          {/* Decorative top border */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[var(--color-gold)] via-[var(--color-gold-light)] to-[var(--color-gold)]" />

          {/* Close button */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ink)]/30 text-[var(--color-cream)] transition-colors hover:bg-[var(--color-ink)]/50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Player info */}
          <div className="px-5 pb-4 pt-6">
            <div className="flex items-start gap-4">
              {/* Position badge - Large */}
              <div className={`${positionColorClass} flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg shadow-lg`}>
                <span className="font-scoreboard text-2xl font-bold text-white">
                  {player.primaryPosition}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl uppercase leading-tight tracking-wide text-[var(--color-cream)]">
                  {player.nameFirst}
                  <br />
                  <span className="text-[var(--color-gold)]">{player.nameLast}</span>
                </h3>
              </div>
            </div>

            {/* Season & handedness */}
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="rounded bg-[var(--color-gold)] px-2 py-1 font-scoreboard font-bold text-[var(--color-ink)]">
                {player.seasonYear}
              </span>
              <span className="text-[var(--color-cream)]/70">
                Bats: <span className="font-bold text-[var(--color-cream)]">{player.battingHand}</span>
              </span>
              <span className="text-[var(--color-cream)]/70">
                Throws: <span className="font-bold text-[var(--color-cream)]">{player.throwingHand}</span>
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-[var(--color-ink)]/20">
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
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CARD BODY
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {activeTab === 'card' && <CardRatingsTab player={player} />}
          {activeTab === 'mlb' && <MlbStatsTab player={player} />}
          {activeTab === 'season' && leagueId && (
            <SeasonStatsTab player={player} leagueId={leagueId} />
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CARD FOOTER - Decorative
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-[var(--color-leather)]/30 bg-[var(--color-cream-dark)] px-4 py-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            <span>Baseball Ledger</span>
            <span className="font-stat">{player.playerId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerProfileModal;
