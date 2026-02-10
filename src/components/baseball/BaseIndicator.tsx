/**
 * BaseIndicator
 *
 * SVG diamond showing base runner positions.
 * Occupied bases filled with ballpark green, empty with sandstone.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export interface BaseIndicatorProps {
  first: boolean;
  second: boolean;
  third: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 40, md: 60, lg: 80 } as const;

function buildAriaLabel(first: boolean, second: boolean, third: boolean): string {
  if (first && second && third) return 'Bases loaded';

  const occupied: string[] = [];
  if (first) occupied.push('first');
  if (second) occupied.push('second');
  if (third) occupied.push('third');

  if (occupied.length === 0) return 'Bases empty';
  if (occupied.length === 1) return `Runner on ${occupied[0]}`;
  return `Runners on ${occupied.join(', ')}`;
}

function baseClass(occupied: boolean): string {
  return occupied ? 'fill-ballpark' : 'fill-sandstone/50';
}

export function BaseIndicator({
  first,
  second,
  third,
  size = 'md',
}: BaseIndicatorProps) {
  const px = SIZE_MAP[size];
  const label = buildAriaLabel(first, second, third);

  // Diamond centers relative to viewBox 0 0 100 100:
  //   second: top center (50, 15)
  //   third:  left center (15, 50)
  //   first:  right center (85, 50)
  const baseSize = 18;

  return (
    <svg
      role="img"
      aria-label={label}
      width={px}
      height={px}
      viewBox="0 0 100 100"
      className="inline-block"
    >
      {/* Second base */}
      <rect
        data-base="second"
        x={50 - baseSize / 2}
        y={15 - baseSize / 2}
        width={baseSize}
        height={baseSize}
        rx={2}
        transform="rotate(45 50 15)"
        className={baseClass(second)}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      {/* Third base */}
      <rect
        data-base="third"
        x={15 - baseSize / 2}
        y={50 - baseSize / 2}
        width={baseSize}
        height={baseSize}
        rx={2}
        transform="rotate(45 15 50)"
        className={baseClass(third)}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      {/* First base */}
      <rect
        data-base="first"
        x={85 - baseSize / 2}
        y={50 - baseSize / 2}
        width={baseSize}
        height={baseSize}
        rx={2}
        transform="rotate(45 85 50)"
        className={baseClass(first)}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

export default BaseIndicator;
