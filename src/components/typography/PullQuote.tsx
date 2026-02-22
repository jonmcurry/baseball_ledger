/**
 * PullQuote
 *
 * Large inset quotation with crimson left border.
 * Used for game commentary, AI analysis, player bio excerpts.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import type { ReactNode } from 'react';

export interface PullQuoteProps {
  children: ReactNode;
  /** Attribution line displayed below the quote */
  attribution?: string;
  className?: string;
}

export function PullQuote({
  children,
  attribution,
  className = '',
}: PullQuoteProps) {
  return (
    <blockquote className={`pull-quote ${className}`.trim()}>
      <p>{children}</p>
      {attribution && (
        <cite className="pull-quote-attribution block not-italic">
          -- {attribution}
        </cite>
      )}
    </blockquote>
  );
}

export default PullQuote;
