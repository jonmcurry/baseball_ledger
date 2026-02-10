/**
 * CommentaryPanel
 *
 * Displays AI commentary for game plays (REQ-UI-010).
 * Uses TypewriterText for the latest entry.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { TypewriterText } from '@components/feedback/TypewriterText';

export interface CommentaryEntry {
  text: string;
  inning: number;
}

export interface CommentaryPanelProps {
  entries: readonly CommentaryEntry[];
}

export function CommentaryPanel({ entries }: CommentaryPanelProps) {
  if (entries.length === 0) return null;

  const previousEntries = entries.slice(0, -1);
  const latestEntry = entries[entries.length - 1];

  return (
    <div data-testid="commentary-panel" className="space-y-2">
      <h3 className="font-headline text-sm font-bold text-ballpark">Commentary</h3>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-card border border-sandstone/50 bg-old-lace/50 px-3 py-2">
        {previousEntries.map((entry, i) => (
          <div key={i} className="text-xs text-muted">
            <span className="mr-1 font-bold text-ink/60">Inning {entry.inning}:</span>
            {entry.text}
          </div>
        ))}
        {latestEntry && (
          <div className="text-xs text-ink">
            <span className="mr-1 font-bold text-ballpark">Inning {latestEntry.inning}:</span>
            <TypewriterText text={latestEntry.text} speed={30} />
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentaryPanel;
