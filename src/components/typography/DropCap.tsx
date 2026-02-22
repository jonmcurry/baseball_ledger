/**
 * DropCap
 *
 * Wraps a paragraph with the `.drop-cap` class for editorial first-letter styling.
 * The first letter floats left as a large Playfair Display character in crimson.
 *
 * Layer 6: Presentational component.
 */

import type { ReactNode } from 'react';

export interface DropCapProps {
  children: ReactNode;
  className?: string;
}

export function DropCap({ children, className = '' }: DropCapProps) {
  return (
    <p
      className={`drop-cap font-body text-base leading-relaxed text-[var(--text-primary)] ${className}`.trim()}
    >
      {children}
    </p>
  );
}

export default DropCap;
