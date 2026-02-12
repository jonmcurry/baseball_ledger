/**
 * PlayerProfileModal
 *
 * "Digital Baseball Card" popup (REQ-UI-009).
 * Displays player attributes, card ratings, and defensive stats.
 * REQ-COMP-012: Focus trapping via useFocusTrap hook.
 *
 * Layer 6: Presentational component.
 */

import { useRef, useState } from 'react';
import type { PlayerCard } from '@lib/types/player';
import { useFocusTrap } from '@hooks/useFocusTrap';

export interface PlayerProfileModalProps {
  player: PlayerCard;
  isOpen: boolean;
  onClose: () => void;
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

type TabId = 'card' | 'mlb';

function pctLabel(value: number): string {
  return (value * 100).toFixed(0) + '%';
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-sandstone/30 py-1">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-stat text-xs font-bold text-ink">{value}</span>
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
      className={`px-3 py-1.5 text-xs font-bold transition-colors ${
        isActive
          ? 'border-b-2 border-ballpark text-ballpark'
          : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function CardRatingsTab({ player }: { player: PlayerCard }) {
  const powerLabel = POWER_LABELS[player.powerRating] ?? String(player.powerRating);

  return (
    <div className="space-y-3">
      {/* Batting / Card Attributes */}
      {!player.isPitcher && (
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase text-muted">Batting</h4>
          <StatRow label="Power Rating" value={`${player.powerRating} (${powerLabel})`} />
          <StatRow label="Speed" value={pctLabel(player.speed)} />
          <StatRow label="Contact" value={pctLabel(player.contactRate)} />
          <StatRow label="Discipline (BB/K)" value={pctLabel(player.discipline)} />
          <StatRow label="ISO (Power)" value={player.power.toFixed(3)} />
        </div>
      )}

      {/* Pitching Attributes */}
      {player.pitching && (
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase text-muted">Pitching</h4>
          <StatRow label="Grade" value={`${player.pitching.grade} / 15`} />
          <StatRow label="Role" value={player.pitching.role} />
          <StatRow label="ERA" value={player.pitching.era.toFixed(2)} />
          <StatRow label="WHIP" value={player.pitching.whip.toFixed(2)} />
          <StatRow label="K/9" value={player.pitching.k9.toFixed(1)} />
          <StatRow label="BB/9" value={player.pitching.bb9.toFixed(1)} />
          <StatRow label="Stamina" value={player.pitching.stamina.toFixed(1)} />
        </div>
      )}

      {/* Fielding */}
      <div>
        <h4 className="mb-1 text-xs font-bold uppercase text-muted">Fielding</h4>
        <StatRow label="Position(s)" value={player.eligiblePositions.join(', ')} />
        <StatRow label="Fielding Pct" value={player.fieldingPct.toFixed(3)} />
        <StatRow label="Range" value={pctLabel(player.range)} />
        <StatRow label="Arm" value={pctLabel(player.arm)} />
      </div>
    </div>
  );
}

function MlbStatsTab({ player }: { player: PlayerCard }) {
  const batting = player.mlbBattingStats;
  const pitching = player.mlbPitchingStats;

  if (!batting && !pitching) {
    return (
      <div className="py-4 text-center text-xs text-muted">
        No MLB stats available for this player.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Batting Stats */}
      {batting && (
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase text-muted">
            {player.seasonYear} Batting
          </h4>
          <StatRow label="Games" value={batting.G} />
          <StatRow label="AB" value={batting.AB} />
          <StatRow label="Runs" value={batting.R} />
          <StatRow label="Hits" value={batting.H} />
          <StatRow label="2B" value={batting.doubles} />
          <StatRow label="3B" value={batting.triples} />
          <StatRow label="HR" value={batting.HR} />
          <StatRow label="RBI" value={batting.RBI} />
          <StatRow label="SB" value={batting.SB} />
          <StatRow label="BB" value={batting.BB} />
          <StatRow label="SO" value={batting.SO} />
          <StatRow label="AVG" value={batting.BA.toFixed(3)} />
          <StatRow label="OBP" value={batting.OBP.toFixed(3)} />
          <StatRow label="SLG" value={batting.SLG.toFixed(3)} />
          <StatRow label="OPS" value={batting.OPS.toFixed(3)} />
        </div>
      )}

      {/* Pitching Stats */}
      {pitching && (
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase text-muted">
            {player.seasonYear} Pitching
          </h4>
          <StatRow label="Games" value={pitching.G} />
          <StatRow label="GS" value={pitching.GS} />
          <StatRow label="W" value={pitching.W} />
          <StatRow label="L" value={pitching.L} />
          <StatRow label="SV" value={pitching.SV} />
          <StatRow label="IP" value={pitching.IP.toFixed(1)} />
          <StatRow label="H" value={pitching.H} />
          <StatRow label="ER" value={pitching.ER} />
          <StatRow label="HR" value={pitching.HR} />
          <StatRow label="BB" value={pitching.BB} />
          <StatRow label="SO" value={pitching.SO} />
          <StatRow label="ERA" value={pitching.ERA.toFixed(2)} />
          <StatRow label="WHIP" value={pitching.WHIP.toFixed(2)} />
        </div>
      )}
    </div>
  );
}

export function PlayerProfileModal({ player, isOpen, onClose }: PlayerProfileModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('card');
  useFocusTrap(containerRef, isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.nameFirst} ${player.nameLast} profile`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={containerRef} className="w-full max-w-sm rounded-card border-2 border-sandstone bg-old-lace shadow-ledger">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-sandstone px-gutter-lg py-3">
          <div>
            <h3 className="font-headline text-lg font-bold text-ballpark">
              {player.nameFirst} {player.nameLast}
            </h3>
            <p className="text-xs text-muted">
              {player.primaryPosition} -- {player.seasonYear} -- Bats: {player.battingHand} / Throws: {player.throwingHand}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-muted hover:text-ink"
          >
            X
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-sandstone px-gutter-lg">
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
        </div>

        {/* Body */}
        <div className="max-h-80 overflow-y-auto px-gutter-lg py-3">
          {activeTab === 'card' && <CardRatingsTab player={player} />}
          {activeTab === 'mlb' && <MlbStatsTab player={player} />}
        </div>
      </div>
    </div>
  );
}

export default PlayerProfileModal;
