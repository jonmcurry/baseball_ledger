/**
 * PlayByPlayFeed
 *
 * Scrolling play-by-play entries with auto-scroll.
 * Feature-scoped sub-component. No store imports.
 */

import { useEffect, useRef } from 'react';
import type { PlayByPlayEntry } from '@lib/types/game';

export interface PlayByPlayFeedProps {
  readonly plays: readonly PlayByPlayEntry[];
  readonly teams: ReadonlyMap<string, string>;
}

export function PlayByPlayFeed({ plays }: PlayByPlayFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [plays.length]);

  return (
    <div className="space-y-1">
      <h3 className="font-headline text-sm font-bold text-ballpark">Play-by-Play</h3>
      {plays.length === 0 && (
        <p className="text-xs text-muted">No plays recorded</p>
      )}
      <div ref={feedRef} className="max-h-96 space-y-1 overflow-y-auto" role="log" aria-label="Play-by-play feed">
        {plays.map((play, idx) => (
          <div
            key={idx}
            className="rounded-card border border-sandstone/50 px-2 py-1 text-xs"
          >
            <div className="flex items-center gap-2 text-muted">
              <span className="font-stat">
                {play.halfInning === 'top' ? 'Top' : 'Bot'} {play.inning}
              </span>
              <span>{play.outs} out{play.outs !== 1 ? 's' : ''}</span>
              <span className="ml-auto font-stat">
                {play.scoreAfter.away}-{play.scoreAfter.home}
              </span>
            </div>
            <p className="mt-0.5 text-ink">{play.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
