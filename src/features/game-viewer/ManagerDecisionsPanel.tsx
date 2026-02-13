/**
 * ManagerDecisionsPanel
 *
 * Displays detected manager decisions with template explanations.
 * Attributes each decision to the correct team's manager based on
 * half-inning side and decision type (pitching vs batting decisions).
 *
 * Layer 7: Feature composition. Composes hook + presentational elements.
 */

import type { ManagerStyle } from '@lib/simulation/manager-profiles';
import type { DetectedDecision } from '@lib/ai/decision-detector';
import { useManagerExplanations } from '@hooks/useManagerExplanations';

export interface ManagerDecisionsPanelProps {
  readonly decisions: readonly DetectedDecision[];
  readonly managerStyle: ManagerStyle;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
}

const DECISION_LABELS: Record<string, string> = {
  intentional_walk: 'Intentional Walk',
  steal: 'Stolen Base Attempt',
  bunt: 'Sacrifice Bunt',
  pull_pitcher: 'Pitching Change',
};

/**
 * Determine which team's manager made the decision.
 * Pitching decisions (pull_pitcher, IBB) come from the defending team.
 * Batting decisions (steal, bunt) come from the offensive team.
 */
function getDecisionTeam(
  decision: DetectedDecision,
  homeTeam: string,
  awayTeam: string,
): string {
  const isPitchingDecision = decision.type === 'pull_pitcher'
    || decision.type === 'intentional_walk';
  if (isPitchingDecision) {
    // Top half: home team is pitching (defending)
    // Bottom half: away team is pitching (defending)
    return decision.halfInning === 'top' ? homeTeam : awayTeam;
  }
  // Top half: away team is batting (offensive)
  // Bottom half: home team is batting (offensive)
  return decision.halfInning === 'top' ? awayTeam : homeTeam;
}

export function ManagerDecisionsPanel({
  decisions,
  managerStyle,
  homeTeamName,
  awayTeamName,
}: ManagerDecisionsPanelProps) {
  // Use a generic manager name for template generation; the team label
  // in the UI provides the real attribution.
  const { explanations, enhanceDecision } = useManagerExplanations(
    decisions,
    managerStyle,
    'The manager',
  );

  if (explanations.length === 0) return null;

  return (
    <div className="rounded-card border border-sandstone bg-old-lace/50 px-gutter py-3">
      <h3 className="font-headline text-sm font-bold text-ballpark">Manager Decisions</h3>
      <div className="mt-2 space-y-2">
        {explanations.map((entry, i) => {
          const teamName = getDecisionTeam(decisions[i], homeTeamName, awayTeamName);
          return (
            <div key={i} className="border-l-2 border-sandstone pl-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink">
                  {DECISION_LABELS[entry.type] ?? entry.type}
                </span>
                <span className="text-[10px] text-muted">
                  {teamName} -- {entry.inning === 0 ? '' : `${decisions[i].halfInning === 'top' ? 'Top' : 'Bot'} ${entry.inning}`}
                </span>
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
          );
        })}
      </div>
    </div>
  );
}

export default ManagerDecisionsPanel;
