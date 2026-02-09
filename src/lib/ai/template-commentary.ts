/**
 * Template Commentary Engine
 *
 * Generates play-by-play commentary using template strings (REQ-AI-008).
 * Deterministic selection via hash of (batterId + inning + outs).
 *
 * Layer 1: Pure logic, no I/O, no side effects.
 */

import type { CommentaryRequest, CommentaryResponse, CommentaryStyle } from '../types/ai';
import { COMMENTARY_TEMPLATES, type TemplatePool } from './commentary-templates';

export type SituationTag = 'routine' | 'clutch' | 'dramatic';

/**
 * Determine the situation tag based on game context.
 *
 * - dramatic: 8th inning or later AND score within 2 runs AND 2 outs
 * - clutch:   6th inning or later AND score within 3 runs, OR runners on with < 3 run lead
 * - routine:  everything else
 */
export function getSituationTag(request: CommentaryRequest): SituationTag {
  const { inning, outs, scoreDiff, runnersOn } = request;
  const absDiff = Math.abs(scoreDiff);

  if (inning >= 8 && absDiff <= 2 && outs === 2) {
    return 'dramatic';
  }

  if ((inning >= 6 && absDiff <= 3) || (runnersOn > 0 && absDiff < 3)) {
    return 'clutch';
  }

  return 'routine';
}

/**
 * Simple string hash for deterministic template selection.
 * Returns a non-negative integer.
 */
export function hashSelection(batterId: string, inning: number, outs: number): number {
  const key = `${batterId}:${inning}:${outs}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Select a template string from the pool for the given outcome, style, and situation.
 * Returns null if no template exists for the outcome.
 */
export function selectTemplate(
  outcomeKey: string,
  style: CommentaryStyle,
  situation: SituationTag,
  hash: number,
): string | null {
  const outcomeTemplates = COMMENTARY_TEMPLATES[outcomeKey];
  if (!outcomeTemplates) return null;

  const stylePool: TemplatePool = outcomeTemplates[style];
  if (!stylePool) return null;

  const templates = stylePool[situation];
  if (!templates || templates.length === 0) return null;

  return templates[hash % templates.length];
}

/**
 * Interpolate placeholders in a template string.
 *
 * Supported placeholders: {batter}, {pitcher}, {team}, {opponent}
 */
export function interpolateTemplate(
  template: string,
  values: {
    batter: string;
    pitcher: string;
    team?: string;
    opponent?: string;
  },
): string {
  return template
    .replace(/\{batter\}/g, values.batter)
    .replace(/\{pitcher\}/g, values.pitcher)
    .replace(/\{team\}/g, values.team ?? 'the team')
    .replace(/\{opponent\}/g, values.opponent ?? 'the opposition');
}

/**
 * Generate template-based play-by-play commentary.
 *
 * Falls back to a generic message if no template exists for the outcome.
 */
export function generateTemplateCommentary(request: CommentaryRequest): CommentaryResponse {
  const situation = getSituationTag(request);
  const hash = hashSelection(request.batterId, request.inning, request.outs);
  const outcomeKey = String(request.outcome);

  const template = selectTemplate(outcomeKey, request.style, situation, hash);

  if (!template) {
    return {
      text: `${request.batterName} steps to the plate against ${request.pitcherName}.`,
      source: 'template',
    };
  }

  const text = interpolateTemplate(template, {
    batter: request.batterName,
    pitcher: request.pitcherName,
  });

  return { text, source: 'template' };
}
