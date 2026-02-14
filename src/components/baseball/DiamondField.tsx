/**
 * DiamondField
 *
 * SVG baseball diamond showing 9 defensive positions with player names.
 * Supports click-to-assign mode for lineup editing.
 * Optionally shows base runners and outs.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useRef, useCallback } from 'react';
import type { BaseState } from '@lib/types/game';

export interface FieldPosition {
  position: string;
  playerName: string;
}

export interface DiamondFieldProps {
  positions: readonly FieldPosition[];
  isEditable?: boolean;
  onPositionClick?: (position: string) => void;
  selectedPosition?: string;
  baseRunners?: BaseState;
  outs?: number;
}

// Position coordinates on the SVG field (viewBox 0 0 400 360)
const POSITION_COORDS: Record<string, { x: number; y: number }> = {
  C:  { x: 200, y: 310 },
  '1B': { x: 310, y: 210 },
  '2B': { x: 250, y: 150 },
  SS: { x: 150, y: 150 },
  '3B': { x: 90, y: 210 },
  LF: { x: 60, y: 80 },
  CF: { x: 200, y: 30 },
  RF: { x: 340, y: 80 },
  DH: { x: 370, y: 310 },
};

// Base diamond coordinates
const BASES = {
  first:  { x: 270, y: 230 },
  second: { x: 200, y: 170 },
  third:  { x: 130, y: 230 },
  home:   { x: 200, y: 290 },
};

function baseClass(occupied: boolean): string {
  return occupied ? 'fill-ballpark' : 'fill-sandstone/30';
}

/** Ordered position keys for arrow key navigation */
const POSITION_KEYS = Object.keys(POSITION_COORDS);

export function DiamondField({
  positions,
  isEditable = false,
  onPositionClick,
  selectedPosition,
  baseRunners,
  outs,
}: DiamondFieldProps) {
  const posMap = new Map(positions.map((p) => [p.position, p.playerName]));
  const positionRefs = useRef<(SVGGElement | null)[]>([]);

  const handleArrowKey = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const pos = POSITION_KEYS[index];
      onPositionClick?.(pos);
      return;
    }

    let nextIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % POSITION_KEYS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + POSITION_KEYS.length) % POSITION_KEYS.length;
    }

    if (nextIndex >= 0) {
      e.preventDefault();
      positionRefs.current[nextIndex]?.focus();
    }
  }, [onPositionClick]);

  return (
    <svg
      role="group"
      aria-label="Baseball diamond lineup"
      viewBox="0 0 400 360"
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto w-full max-w-md max-md:min-w-[280px]"
    >
      {/* Outfield arc */}
      <path
        d="M 30,100 Q 200,-30 370,100"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="text-sandstone"
      />

      {/* Infield diamond lines */}
      <polygon
        points={`${BASES.home.x},${BASES.home.y} ${BASES.first.x},${BASES.first.y} ${BASES.second.x},${BASES.second.y} ${BASES.third.x},${BASES.third.y}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-sandstone"
      />

      {/* Base diamonds */}
      {baseRunners && (
        <>
          <rect x={BASES.first.x - 6} y={BASES.first.y - 6} width={12} height={12} rx={1}
            transform={`rotate(45 ${BASES.first.x} ${BASES.first.y})`}
            className={baseClass(baseRunners.first !== null)} />
          <rect x={BASES.second.x - 6} y={BASES.second.y - 6} width={12} height={12} rx={1}
            transform={`rotate(45 ${BASES.second.x} ${BASES.second.y})`}
            className={baseClass(baseRunners.second !== null)} />
          <rect x={BASES.third.x - 6} y={BASES.third.y - 6} width={12} height={12} rx={1}
            transform={`rotate(45 ${BASES.third.x} ${BASES.third.y})`}
            className={baseClass(baseRunners.third !== null)} />
        </>
      )}

      {/* Home plate */}
      <rect x={BASES.home.x - 6} y={BASES.home.y - 6} width={12} height={12} rx={1}
        transform={`rotate(45 ${BASES.home.x} ${BASES.home.y})`}
        className="fill-old-lace stroke-sandstone" strokeWidth={1} />

      {/* Outs indicator */}
      {outs !== undefined && (
        <g>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={185 + i * 15} cy={340} r={5}
              className={i < outs ? 'fill-stitch-red' : 'fill-sandstone/30'}
              stroke="currentColor" strokeWidth={0.5} />
          ))}
          <text x={235} y={344} className="fill-muted text-[10px] font-stat">
            Outs
          </text>
        </g>
      )}

      {/* Position markers */}
      {Object.entries(POSITION_COORDS).map(([pos, coords], idx) => {
        const playerName = posMap.get(pos) ?? '';
        const hasPlayer = playerName.length > 0;
        const isSelected = selectedPosition === pos;

        return (
          <g key={pos}>
            {isEditable ? (
              <g
                ref={(el) => { positionRefs.current[idx] = el; }}
                role="button"
                tabIndex={0}
                aria-label={`${pos}: ${playerName || 'empty'}`}
                onClick={() => onPositionClick?.(pos)}
                onKeyDown={(e) => handleArrowKey(e, idx)}
                className="cursor-pointer"
              >
                <circle cx={coords.x} cy={coords.y} r={20}
                  className="stroke-ballpark"
                  style={{
                    fill: isSelected
                      ? 'var(--accent-primary)'
                      : hasPlayer
                        ? 'var(--accent-primary)'
                        : 'var(--color-sandstone)',
                    fillOpacity: isSelected ? 0.3 : hasPlayer ? 0.1 : 0.2,
                  }}
                  strokeWidth={isSelected ? 2.5 : 1.5} />
                <text x={coords.x} y={coords.y - 8} textAnchor="middle"
                  className="text-[10px] font-bold font-stat"
                  style={{ fill: 'var(--accent-primary)' }}>{pos}</text>
                <text x={coords.x} y={coords.y + 6} textAnchor="middle"
                  className="text-[8px] font-stat"
                  style={{ fill: 'var(--color-ink)' }}>
                  {playerName.length > 12 ? playerName.slice(0, 11) + '...' : playerName}
                </text>
              </g>
            ) : (
              <g aria-label={`${pos}: ${playerName || 'empty'}`}>
                <circle cx={coords.x} cy={coords.y} r={20}
                  className="stroke-sandstone"
                  style={{
                    fill: hasPlayer ? 'var(--accent-primary)' : 'var(--color-sandstone)',
                    fillOpacity: hasPlayer ? 0.1 : 0.2,
                  }}
                  strokeWidth={1} />
                <text x={coords.x} y={coords.y - 8} textAnchor="middle"
                  className="text-[10px] font-bold font-stat"
                  style={{ fill: 'var(--accent-primary)' }}>{pos}</text>
                <text x={coords.x} y={coords.y + 6} textAnchor="middle"
                  className="text-[8px] font-stat"
                  style={{ fill: 'var(--color-ink)' }}>
                  {playerName.length > 12 ? playerName.slice(0, 11) + '...' : playerName}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default DiamondField;
