/**
 * SectionOpener
 *
 * Newspaper-style section header block used at the top of every page.
 * Renders: kicker (small caps label) -> headline -> deck (italic summary)
 * -> dateline -> double rule.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import type { ReactNode } from 'react';

export interface SectionOpenerProps {
  /** Small caps label above headline (e.g. "THE MORNING EDITION") */
  kicker?: string;
  /** Main headline text */
  headline: string;
  /** Italic summary below headline (1-2 sentences) */
  deck?: ReactNode;
  /** Date/context line (e.g. "Season 1927 -- Day 45 of 162") */
  dateline?: string;
  /** Size variant: 'page' for main page headers, 'section' for sub-sections */
  size?: 'page' | 'section';
  className?: string;
}

export function SectionOpener({
  kicker,
  headline,
  deck,
  dateline,
  size = 'page',
  className = '',
}: SectionOpenerProps) {
  const Tag = size === 'page' ? 'h2' : 'h3';
  const headlineSize = size === 'page'
    ? 'text-type-4 md:text-type-5'
    : 'text-type-3 md:text-type-4';

  return (
    <div className={`mb-gutter ${className}`.trim()}>
      {kicker && (
        <p className="kicker">{kicker}</p>
      )}

      <Tag className={`font-headline font-black tracking-tight leading-none text-[var(--text-primary)] ${headlineSize}`}>
        {headline}
      </Tag>

      {deck && (
        <p className="deck">{deck}</p>
      )}

      {dateline && (
        <p className="dateline mt-1">{dateline}</p>
      )}

      <hr className="rule-hairline mt-2" />
    </div>
  );
}

export default SectionOpener;
