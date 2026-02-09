/**
 * Template Manager Explanation
 *
 * Generates explanations for in-game manager decisions using templates (REQ-AI-008).
 * Maps decision type x manager personality to explanation text.
 *
 * Layer 1: Pure logic, no I/O, no side effects.
 */

import type {
  ManagerExplanationRequest,
  ManagerExplanationResponse,
  ManagerDecisionType,
} from '../types/ai';
import type { ManagerStyle } from '../simulation/manager-profiles';

type ExplanationTemplates = Record<ManagerStyle, string>;

const DECISION_TEMPLATES: Record<ManagerDecisionType, ExplanationTemplates> = {
  steal: {
    conservative:
      '{manager} rarely calls for the steal, but with {context}, the risk-reward balance shifted just enough.',
    aggressive:
      '{manager} sends the runner. With {context}, the aggressive approach puts pressure on the defense.',
    balanced:
      '{manager} picks a spot to run. With {context}, this is the right time to be opportunistic.',
    analytical:
      '{manager} calculates the break-even point and sends the runner. With {context}, the expected value is positive.',
  },

  bunt: {
    conservative:
      '{manager} calls for the sacrifice bunt. With {context}, manufacturing a run the old-fashioned way is the priority.',
    aggressive:
      '{manager} surprises with a bunt. With {context}, the element of surprise keeps the defense guessing.',
    balanced:
      '{manager} lays one down. With {context}, moving the runner into scoring position is the right play.',
    analytical:
      '{manager} deploys the bunt based on the matchup data. With {context}, the situational numbers support it.',
  },

  intentional_walk: {
    conservative:
      '{manager} issues the intentional walk. With {context}, setting up the force play and avoiding the big bat is the safer route.',
    aggressive:
      '{manager} puts him on. With {context}, the aggressive skipper would rather face the next batter.',
    balanced:
      '{manager} gives the free pass. With {context}, loading the base makes the double play available.',
    analytical:
      '{manager} walks the batter intentionally. With {context}, the platoon advantage against the next hitter favors this move.',
  },

  pull_pitcher: {
    conservative:
      '{manager} makes the pitching change. With {context}, there is no sense pushing the starter when the bullpen is fresh.',
    aggressive:
      '{manager} yanks the pitcher quickly. With {context}, the quick hook keeps the game within reach.',
    balanced:
      '{manager} goes to the bullpen. With {context}, matching up with a fresh arm gives the team the best chance.',
    analytical:
      '{manager} pulls the pitcher based on times-through-the-order data. With {context}, the numbers say it is time for a change.',
  },
};

/**
 * Build the context string from the game situation.
 */
function buildContextString(request: ManagerExplanationRequest): string {
  const { inning, outs, scoreDiff } = request;
  const absDiff = Math.abs(scoreDiff);

  const parts: string[] = [];

  if (inning >= 8) {
    parts.push('late in the game');
  } else if (inning >= 5) {
    parts.push('in the middle innings');
  } else {
    parts.push('early in the game');
  }

  if (absDiff === 0) {
    parts.push('and the score tied');
  } else if (scoreDiff > 0) {
    parts.push(`and a ${absDiff}-run lead`);
  } else {
    parts.push(`and trailing by ${absDiff}`);
  }

  if (outs === 2) {
    parts.push('with two down');
  } else if (outs === 1) {
    parts.push('with one out');
  } else {
    parts.push('with nobody out');
  }

  return parts.join(' ');
}

/**
 * Generate a template-based manager decision explanation.
 */
export function generateManagerExplanationTemplate(
  request: ManagerExplanationRequest,
): ManagerExplanationResponse {
  const templates = DECISION_TEMPLATES[request.decision];
  const template = templates[request.managerStyle];

  const context = request.gameContext || buildContextString(request);

  const explanation = template
    .replace(/\{manager\}/g, request.managerName)
    .replace(/\{context\}/g, context);

  return {
    explanation,
    source: 'template',
  };
}
