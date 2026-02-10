/**
 * CommentarySection
 *
 * Wraps CommentaryPanel with useCommentary hook and "Enhance with AI" button.
 * Template-first pattern: template commentary renders immediately,
 * AI enhancement is opt-in per REQ-AI-007.
 *
 * Layer 7: Feature composition. Composes hook + presentational component.
 */

import type { PlayByPlayEntry } from '@lib/types/game';
import type { CommentaryStyle } from '@lib/types/ai';
import { useCommentary } from '@hooks/useCommentary';
import { CommentaryPanel } from './CommentaryPanel';

export interface CommentarySectionProps {
  readonly plays: readonly PlayByPlayEntry[];
  readonly playerNames: Record<string, string>;
  readonly style: CommentaryStyle;
}

export function CommentarySection({ plays, playerNames, style }: CommentarySectionProps) {
  const { entries, enhancePlay } = useCommentary(plays, playerNames, style);

  if (entries.length === 0) return null;

  const latestEntry = entries[entries.length - 1];
  const latestIsTemplate = latestEntry.source === 'template';

  return (
    <div>
      <CommentaryPanel entries={entries} />
      {latestIsTemplate && (
        <button
          type="button"
          className="mt-1 text-xs text-ballpark underline hover:text-ink"
          onClick={() => enhancePlay(entries.length - 1)}
        >
          Enhance with AI
        </button>
      )}
    </div>
  );
}

export default CommentarySection;
