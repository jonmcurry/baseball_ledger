/**
 * ProgressBar
 *
 * Linear progress indicator for simulation and bulk operations.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPct?: boolean;
}

export function ProgressBar({
  current,
  total,
  label,
  showPct = true,
}: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);

  return (
    <div role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total} aria-label={label ?? 'Progress'}>
      {(label || showPct) && (
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          {label && <span>{label}</span>}
          {showPct && <span>{pct}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-sandstone/30">
        <div
          className="h-full rounded-full bg-ballpark transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
