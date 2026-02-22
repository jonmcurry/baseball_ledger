/**
 * Byline
 *
 * Editorial attribution line: "Filed by Manager Analytics -- April 12, 1927"
 * Used for game events, transaction logs, AI reports.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export interface BylineProps {
  /** Author or source name */
  author: string;
  /** Date or context string */
  date?: string;
  className?: string;
}

export function Byline({
  author,
  date,
  className = '',
}: BylineProps) {
  return (
    <p className={`byline ${className}`.trim()}>
      Filed by {author}
      {date && <> -- {date}</>}
    </p>
  );
}

export default Byline;
