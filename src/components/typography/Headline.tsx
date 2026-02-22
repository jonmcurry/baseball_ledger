/**
 * Headline
 *
 * Renders a heading element with Heritage Editorial styling.
 * Two variants:
 *   - 'section': `.pennant-header` (crimson underline accent)
 *   - 'breakout': `.broadsheet-breakout` (full-width crimson STOP THE PRESSES style)
 *
 * Layer 6: Presentational component.
 */

import type { ReactNode } from 'react';

export interface HeadlineProps {
  level?: 2 | 3 | 4;
  variant?: 'section' | 'breakout';
  children: ReactNode;
  className?: string;
}

export function Headline({
  level = 2,
  variant = 'section',
  children,
  className = '',
}: HeadlineProps) {
  const Tag = `h${level}` as const;
  const variantClass = variant === 'breakout' ? 'broadsheet-breakout' : 'pennant-header';

  return (
    <Tag className={`${variantClass} ${className}`.trim()}>
      {children}
    </Tag>
  );
}

export default Headline;
