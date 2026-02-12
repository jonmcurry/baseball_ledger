/**
 * SeasonCompletePanel
 *
 * Championship trophy display with vintage pennant styling.
 * Golden era celebration aesthetic with trophy animation.
 *
 * REQ-SCH-009: Season completion ceremony with stamp animation.
 *
 * Layer 7: Feature component. Presentational only.
 */

import { StampAnimation } from '@components/feedback/StampAnimation';

export interface SeasonCompletePanelProps {
  championName: string;
  isCommissioner: boolean;
  onArchive: () => void;
  isArchiving: boolean;
}

export function SeasonCompletePanel({
  championName,
  isCommissioner,
  onArchive,
  isArchiving,
}: SeasonCompletePanelProps) {
  return (
    <div data-testid="season-complete-panel" className="space-y-6">
      <StampAnimation isVisible={true} text="SEASON COMPLETED" />

      {/* Champion display - trophy card */}
      <div
        className="vintage-card relative overflow-hidden text-center"
        style={{
          background: 'linear-gradient(135deg, var(--color-leather) 0%, var(--color-leather-dark) 100%)',
          borderColor: 'var(--color-gold)',
          borderWidth: '2px',
        }}
      >
        {/* Decorative corners */}
        <div className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-[var(--color-gold)]/50" />
        <div className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-[var(--color-gold)]/50" />
        <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-[var(--color-gold)]/50" />
        <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-[var(--color-gold)]/50" />

        {/* Trophy icon */}
        <div className="mb-3 flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, var(--color-gold) 0%, #B8860B 100%)',
              boxShadow: '0 0 20px var(--color-gold), inset 0 2px 4px rgba(255,255,255,0.3)',
            }}
          >
            <svg
              className="h-8 w-8 text-[var(--color-ink)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
            </svg>
          </div>
        </div>

        <p className="mb-1 font-stat text-xs uppercase tracking-widest text-[var(--color-cream)]/60">
          World Series Champion
        </p>
        <p
          className="font-headline text-2xl font-bold uppercase tracking-wider text-[var(--color-gold)]"
          style={{
            textShadow: '0 0 10px var(--color-gold), 0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {championName}
        </p>

        {/* Decorative stars */}
        <div className="mt-3 flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className="h-4 w-4 text-[var(--color-gold)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          ))}
        </div>
      </div>

      {/* Archive action */}
      {isCommissioner ? (
        <div className="text-center">
          <button
            type="button"
            onClick={onArchive}
            disabled={isArchiving}
            className="btn-vintage-primary"
          >
            {isArchiving ? 'Archiving Season...' : 'Archive Season & Start New'}
          </button>
          <p className="mt-2 font-stat text-xs text-[var(--color-muted)]">
            Rosters will carry over to the new season
          </p>
        </div>
      ) : (
        <p className="text-center font-stat text-xs text-[var(--color-muted)]">
          The commissioner will archive this season when ready.
        </p>
      )}
    </div>
  );
}

export default SeasonCompletePanel;
