/**
 * ManagerDecisionsPanel
 *
 * Displays detected manager decisions with template explanations.
 * Each decision has an optional "Enhance" button for Claude (REQ-AI-007).
 *
 * Layer 7: Feature composition. Composes hook + presentational elements.
 */

import type { ManagerStyle } from '@lib/simulation/manager-profiles';
import type { DetectedDecision } from '@lib/ai/decision-detector';
import { useManagerExplanations } from '@hooks/useManagerExplanations';

export interface ManagerDecisionsPanelProps {
  readonly decisions: readonly DetectedDecision[];
  readonly managerStyle: ManagerStyle;
  readonly managerName: string;
}

const DECISION_LABELS: Record<string, string> = {
  intentional_walk: 'Intentional Walk',
  steal: 'Stolen Base Attempt',
  bunt: 'Sacrifice Bunt',
  pull_pitcher: 'Pitching Change',
};

export function ManagerDecisionsPanel({
  decisions,
  managerStyle,
  managerName,
}: ManagerDecisionsPanelProps) {
  const { explanations, enhanceDecision } = useManagerExplanations(
    decisions,
    managerStyle,
    managerName,
  );

  if (explanations.length === 0) return null;

  return (
    <div className="rounded-card border border-sandstone bg-old-lace/50 px-gutter py-3">
      <h3 className="font-headline text-sm font-bold text-ballpark">Manager Decisions</h3>
      <div className="mt-2 space-y-2">
        {explanations.map((entry, i) => (
          <div key={i} className="border-l-2 border-sandstone pl-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">
                {DECISION_LABELS[entry.type] ?? entry.type}
              </span>
              <span className="text-[10px] text-muted">Inning {entry.inning}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">{entry.explanation}</p>
            {entry.source === 'template' && (
              <button
                type="button"
                className="mt-1 text-[10px] text-ballpark underline hover:text-ink"
                onClick={() => enhanceDecision(i)}
              >
                Enhance
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ManagerDecisionsPanel;
