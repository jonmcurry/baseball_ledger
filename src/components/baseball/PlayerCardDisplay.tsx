/**
 * PlayerCardDisplay
 *
 * Modal displaying a "Digital Baseball Card" with vintage styling.
 * Shows player identity, position, key stats, and card ratings.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useEffect, useRef } from 'react';
import type { PlayerCard } from '@lib/types/player';

export interface PlayerCardDisplayProps {
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

export function PlayerCardDisplay({ player, isOpen, onClose }: PlayerCardDisplayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      closeRef.current?.focus();
    } else if (previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPitcher = player.isPitcher && player.pitching;
  const powerLabel = POWER_LABELS[player.powerRating] ?? `Rating ${player.powerRating}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.nameFirst} ${player.nameLast} player card`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-card border-2 border-sandstone bg-old-lace shadow-ledger">
        {/* Card header */}
        <div className="flex items-center justify-between border-b-2 border-sandstone bg-ballpark px-gutter py-3">
          <div>
            <h3 className="font-headline text-lg font-bold text-old-lace">
              {player.nameFirst} {player.nameLast}
            </h3>
            <p className="text-xs text-old-lace/80">
              {player.seasonYear} -- {player.primaryPosition} -- Bats: {player.battingHand} / Throws: {player.throwingHand}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close player card"
            className="text-old-lace/80 hover:text-old-lace"
          >
            &#x2715;
          </button>
        </div>

        {/* Card body */}
        <div className="space-y-gutter p-gutter">
          {/* Positions */}
          <div>
            <p className="text-xs font-medium text-muted">Eligible Positions</p>
            <div className="mt-1 flex gap-1">
              {player.eligiblePositions.map((pos) => (
                <span key={pos} className="rounded-button border border-sandstone px-2 py-0.5 font-stat text-xs text-ink">
                  {pos}
                </span>
              ))}
            </div>
          </div>

          {/* Key stats */}
          {isPitcher ? (
            <div className="grid grid-cols-3 gap-gutter">
              <StatCell label="ERA" value={player.pitching!.era.toFixed(2)} />
              <StatCell label="WHIP" value={player.pitching!.whip.toFixed(2)} />
              <StatCell label="K/9" value={player.pitching!.k9.toFixed(1)} />
              <StatCell label="Grade" value={String(player.pitching!.grade)} />
              <StatCell label="Stamina" value={String(player.pitching!.stamina)} />
              <StatCell label="Role" value={player.pitching!.role} />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-gutter">
              <StatCell label="Speed" value={(player.speed * 100).toFixed(0)} />
              <StatCell label="Power" value={powerLabel} />
              <StatCell label="Contact" value={(player.contactRate * 100).toFixed(0)} />
              <StatCell label="Discipline" value={(player.discipline * 100).toFixed(0)} />
              <StatCell label="Fielding" value={(player.fieldingPct * 1000).toFixed(0)} />
              <StatCell label="Range" value={(player.range * 100).toFixed(0)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium text-muted">{label}</p>
      <p className="font-stat text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

export default PlayerCardDisplay;
