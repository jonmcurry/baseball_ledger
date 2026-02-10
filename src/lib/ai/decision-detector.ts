/**
 * Decision Detector
 *
 * Scans play-by-play data for notable manager decisions:
 * intentional walks, stolen base attempts, sacrifice bunts, pitcher changes.
 *
 * Layer 1: Pure logic, no I/O, no side effects.
 */

import type { PlayByPlayEntry } from '../types/game';
import { OutcomeCategory } from '../types/game';
import type { ManagerDecisionType } from '../types/ai';

export interface DetectedDecision {
  readonly type: ManagerDecisionType;
  readonly playIndex: number;
  readonly inning: number;
  readonly outs: number;
  readonly scoreDiff: number;
}

export function detectDecisions(
  plays: readonly PlayByPlayEntry[],
): DetectedDecision[] {
  const decisions: DetectedDecision[] = [];

  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];
    const scoreDiff = play.scoreAfter.home - play.scoreAfter.away;

    // Intentional walk
    if (play.outcome === OutcomeCategory.WALK_INTENTIONAL) {
      decisions.push({
        type: 'intentional_walk',
        playIndex: i,
        inning: play.inning,
        outs: play.outs,
        scoreDiff,
      });
    }

    // Stolen base opportunity
    if (play.outcome === OutcomeCategory.STOLEN_BASE_OPP) {
      decisions.push({
        type: 'steal',
        playIndex: i,
        inning: play.inning,
        outs: play.outs,
        scoreDiff,
      });
    }

    // Sacrifice bunt
    if (play.outcome === OutcomeCategory.SACRIFICE) {
      decisions.push({
        type: 'bunt',
        playIndex: i,
        inning: play.inning,
        outs: play.outs,
        scoreDiff,
      });
    }

    // Pitcher change (different pitcher than previous play)
    if (i > 0 && play.pitcherId !== plays[i - 1].pitcherId) {
      decisions.push({
        type: 'pull_pitcher',
        playIndex: i,
        inning: play.inning,
        outs: play.outs,
        scoreDiff,
      });
    }
  }

  return decisions;
}
