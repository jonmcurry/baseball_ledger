/**
 * TeamLogo
 *
 * Auto-generated SVG monogram logo for a team. Derives a deterministic
 * background color from the team name and displays the mascot initial
 * inside a circle.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

// 16 palette colors -- high saturation, good contrast with white text
const PALETTE = [
  '#c41e3a', // cardinal red
  '#003DA5', // royal blue
  '#00563F', // forest green
  '#E66100', // burnt orange
  '#5C2D91', // deep purple
  '#BA0C2F', // crimson
  '#0057B8', // cobalt
  '#1B5E20', // pine
  '#C6A664', // sand gold
  '#00838F', // teal
  '#4A148C', // plum
  '#BF360C', // rust
  '#004D40', // emerald
  '#1565C0', // steel blue
  '#880E4F', // magenta
  '#33691E', // olive
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getMascotInitial(teamName: string): string {
  const words = teamName.trim().split(/\s+/);
  // Use the last word (mascot) initial, e.g. "Fresno Herons" -> "H"
  const mascot = words[words.length - 1];
  return mascot.charAt(0).toUpperCase();
}

export interface TeamLogoProps {
  teamName: string;
  size?: number;
}

export function TeamLogo({ teamName, size = 48 }: TeamLogoProps) {
  const color = PALETTE[hashName(teamName) % PALETTE.length];
  const initial = getMascotInitial(teamName);
  const fontSize = size * 0.48;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-label={`${teamName} logo`}
      role="img"
    >
      <circle cx={24} cy={24} r={23} fill={color} />
      <circle cx={24} cy={24} r={21} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      <text
        x={24}
        y={24}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontFamily="var(--font-headline)"
        fontWeight={700}
        fontSize={fontSize}
      >
        {initial}
      </text>
    </svg>
  );
}

export default TeamLogo;
