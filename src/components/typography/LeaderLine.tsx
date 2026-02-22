/**
 * LeaderLine
 *
 * A table-of-contents style entry with a label, dotted leader line, and value.
 * Renders as a button when onClick is provided, span otherwise.
 *
 * Layer 6: Presentational component.
 */

export interface LeaderLineProps {
  label: string;
  value: string;
  onClick?: () => void;
  className?: string;
}

export function LeaderLine({ label, value, onClick, className = '' }: LeaderLineProps) {
  const content = (
    <>
      <span className="leader-line-label">{label}</span>
      <span className="leader-line-dots" />
      <span className="leader-line-value">{value}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`leader-line w-full text-left ${className}`.trim()}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={`leader-line ${className}`.trim()}>
      {content}
    </span>
  );
}

export default LeaderLine;
