/**
 * Template Trade Evaluation
 *
 * Value-comparison trade evaluation with manager personality thresholds (REQ-AI-008).
 *
 * Thresholds by personality:
 *   conservative: requires +15% value surplus to accept
 *   aggressive:   accepts at -5% value deficit
 *   balanced:     requires +5% value surplus
 *   analytical:   requires +10% surplus with positional weighting
 *
 * Layer 1: Pure logic, no I/O, no side effects.
 */

import type { TradeEvaluationRequest, TradeEvaluationResponse } from '../types/ai';
import type { ManagerStyle } from '../simulation/manager-profiles';

/** Minimum value threshold (percentage) for each manager style to accept a trade. */
const ACCEPTANCE_THRESHOLDS: Record<ManagerStyle, number> = {
  conservative: 0.15,
  aggressive: -0.05,
  balanced: 0.05,
  analytical: 0.10,
};

/** Positional premium for analytical managers. Premium positions add extra value. */
const POSITIONAL_PREMIUMS: Record<string, number> = {
  SP: 1.15,
  C: 1.10,
  SS: 1.10,
  CF: 1.05,
  CL: 1.05,
};

/**
 * Calculate total value of a set of players, with optional positional weighting.
 */
function calculateSideValue(
  players: ReadonlyArray<{ readonly value: number; readonly position: string }>,
  usePositionalPremiums: boolean,
): number {
  return players.reduce((sum, p) => {
    const premium = usePositionalPremiums
      ? (POSITIONAL_PREMIUMS[p.position] ?? 1.0)
      : 1.0;
    return sum + p.value * premium;
  }, 0);
}

/**
 * Build reasoning text based on the evaluation result.
 */
function buildReasoning(
  request: TradeEvaluationRequest,
  valueDiff: number,
  recommendation: 'accept' | 'reject' | 'counter',
): string {
  const offeredNames = request.playersOffered.map((p) => p.name).join(', ');
  const requestedNames = request.playersRequested.map((p) => p.name).join(', ');
  const style = request.managerStyle;
  const diffPct = Math.abs(valueDiff * 100).toFixed(0);

  const needsMatch = request.playersRequested.some((p) =>
    request.teamNeeds.includes(p.position),
  );

  const parts: string[] = [];

  if (recommendation === 'accept') {
    parts.push(`${request.managerName} likes this deal.`);
    if (valueDiff > 0.1) {
      parts.push(`The incoming talent (${requestedNames}) represents a ${diffPct}% value upgrade.`);
    } else if (needsMatch) {
      parts.push(`The incoming players (${requestedNames}) fill a key positional need.`);
    } else {
      parts.push(`Trading ${offeredNames} for ${requestedNames} is a fair swap.`);
    }
  } else if (recommendation === 'reject') {
    parts.push(`${request.managerName} is not interested.`);
    parts.push(`Giving up ${offeredNames} for ${requestedNames} leaves the team ${diffPct}% worse off.`);
    if (style === 'conservative') {
      parts.push('A conservative approach demands clear value to make a deal.');
    } else if (style === 'analytical') {
      parts.push('The numbers do not support this trade.');
    }
  } else {
    parts.push(`${request.managerName} sees potential but wants more.`);
    parts.push(`The current offer of ${requestedNames} for ${offeredNames} is close but not quite there.`);
  }

  return parts.join(' ');
}

/**
 * Evaluate a proposed trade using template logic.
 */
export function evaluateTradeTemplate(request: TradeEvaluationRequest): TradeEvaluationResponse {
  const isAnalytical = request.managerStyle === 'analytical';

  const offeredValue = calculateSideValue(request.playersOffered, false);
  const requestedValue = calculateSideValue(request.playersRequested, isAnalytical);

  const valueDiff = offeredValue === 0
    ? 0
    : (requestedValue - offeredValue) / offeredValue;

  const threshold = ACCEPTANCE_THRESHOLDS[request.managerStyle];

  let recommendation: 'accept' | 'reject' | 'counter';
  if (valueDiff >= threshold) {
    recommendation = 'accept';
  } else if (valueDiff >= threshold - 0.10) {
    recommendation = 'counter';
  } else {
    recommendation = 'reject';
  }

  const reasoning = buildReasoning(request, valueDiff, recommendation);

  return {
    recommendation,
    reasoning,
    valueDiff: Math.round(valueDiff * 100) / 100,
    source: 'template',
  };
}
