/**
 * Decision Detector
 *
 * Scans play-by-play data for notable manager decisions:
 * intentional walks, stolen base attempts, sacrifice bunts, pitcher changes.
 *
 * Pitcher changes are tracked per half-inning side (top/bottom) to avoid
 * false positives when the pitching team switches between half-innings.
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
  readonly halfInning: 'top' | 'bottom';
  readonly outs: number;
  readonly scoreDiff: number;
}

export function detectDecisions(
  plays: readonly PlayByPlayEntry[],
): DetectedDecision[] {
  const decisions: DetectedDecision[] = [];

  // Track last pitcher for each half-inning side to detect real pitching changes.
  // Top half = home team pitches, bottom half = away team pitches.
  // Only flag a change when the same side's pitcher differs from its previous value.
  const lastPitcherByHalf: Record<string, string> = {};

  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];
    const scoreDiff = play.scoreAfter.home - play.scoreAfter.away;
    const half = play.halfInning;

    // Intentional walk
    if (play.outcome === OutcomeCategory.WALK_INTENTIONAL) {
      decisions.push({
        type: 'intentional_walk',
        playIndex: i,
        inning: play.inning,
        halfInning: half,
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
        halfInning: half,
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
        halfInning: half,
        outs: play.outs,
        scoreDiff,
      });
    }

    // Pitcher change: only when the same half-inning side has a different pitcher
    const prevPitcher = lastPitcherByHalf[half];
    if (prevPitcher && play.pitcherId !== prevPitcher) {
      decisions.push({
        type: 'pull_pitcher',
        playIndex: i,
        inning: play.inning,
        halfInning: half,
        outs: play.outs,
        scoreDiff,
      });
    }
    lastPitcherByHalf[half] = play.pitcherId;
  }

  return decisions;
}
