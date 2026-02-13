/**
 * ReplayControls
 *
 * Transport-style controls for animated game replay.
 * Play/pause, speed selection, progress indicator, and exit.
 *
 * Layer 6: Presentational component. No store imports.
 */

export type ReplaySpeed = '1x' | '2x' | '5x' | 'Max';
const SPEEDS: ReplaySpeed[] = ['1x', '2x', '5x', 'Max'];

export interface ReplayControlsProps {
  currentPlay: number;
  totalPlays: number;
  isPlaying: boolean;
  speed: ReplaySpeed;
  onTogglePlay: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
  onSkipToEnd: () => void;
  onExit: () => void;
}

export function ReplayControls({
  currentPlay,
  totalPlays,
  isPlaying,
  speed,
  onTogglePlay,
  onSpeedChange,
  onSkipToEnd,
  onExit,
}: ReplayControlsProps) {
  const progress = totalPlays > 0 ? (currentPlay / totalPlays) * 100 : 0;
  const isComplete = currentPlay >= totalPlays;

  return (
    <div
      className="rounded-card border border-sandstone bg-old-lace px-gutter py-2 shadow-card"
      role="toolbar"
      aria-label="Replay controls"
    >
      {/* Progress bar */}
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded bg-sandstone/50">
        <div
          className="h-full rounded bg-stitch-red transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-gutter">
        {/* Play/Pause */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sandstone bg-white text-ink hover:bg-sandstone/20 transition-colors"
          onClick={onTogglePlay}
          aria-label={isComplete ? 'Restart' : isPlaying ? 'Pause' : 'Play'}
          title={isComplete ? 'Restart' : isPlaying ? 'Pause' : 'Play'}
        >
          {isComplete ? (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
              <path d="M4 2l1.5 1.5L3 6l2.5 2.5L4 10 0 6z M8 2l1.5 1.5L7 6l2.5 2.5L8 10 4 6z" transform="translate(2, 3)" />
            </svg>
          ) : isPlaying ? (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
              <rect x="3" y="2" width="3.5" height="12" rx="0.5" />
              <rect x="9.5" y="2" width="3.5" height="12" rx="0.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
              <path d="M4 2l10 6-10 6z" />
            </svg>
          )}
        </button>

        {/* Speed selector */}
        <div className="flex gap-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={`rounded px-1.5 py-0.5 font-stat text-[10px] transition-colors ${
                speed === s
                  ? 'bg-ballpark text-white'
                  : 'bg-sandstone/30 text-muted hover:bg-sandstone/50'
              }`}
              onClick={() => onSpeedChange(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Progress text */}
        <span className="font-stat text-xs text-muted">
          {currentPlay} / {totalPlays}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Skip to end */}
        <button
          type="button"
          className="rounded px-2 py-0.5 font-stat text-[10px] text-muted hover:text-ink transition-colors"
          onClick={onSkipToEnd}
          title="Skip to end"
        >
          Skip
        </button>

        {/* Exit replay */}
        <button
          type="button"
          className="rounded px-2 py-0.5 font-stat text-[10px] text-muted hover:text-ink transition-colors"
          onClick={onExit}
          title="Exit replay mode"
        >
          Exit
        </button>
      </div>
    </div>
  );
}

export default ReplayControls;
