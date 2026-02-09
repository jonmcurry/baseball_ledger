/**
 * POST /api/ai/game-summary -- Generate post-game summary
 *
 * Calls Claude for summary, falls back to template on failure (REQ-AI-008).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../_lib/method-guard';
import { requireAuth } from '../_lib/auth';
import { validateBody } from '../_lib/validate';
import { ok } from '../_lib/response';
import { handleApiError } from '../_lib/errors';
import { callClaude } from '../_lib/claude-client';
import { buildGameSummaryPrompt } from '../_lib/prompts/game-summary-prompt';
import { generateTemplateSummary } from '@lib/ai/template-game-summary';
import type { GameSummaryRequest, AiSource } from '@lib/types/ai';

const GameSummarySchema = z.object({
  homeTeamName: z.string().min(1),
  awayTeamName: z.string().min(1),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  innings: z.number().int().min(1),
  winningPitcherName: z.string().min(1),
  losingPitcherName: z.string().min(1),
  savePitcherName: z.string().nullable(),
  keyPlays: z.array(z.object({
    inning: z.number().int(),
    description: z.string(),
  })),
  boxScore: z.object({
    lineScore: z.object({
      away: z.array(z.number()),
      home: z.array(z.number()),
    }),
    awayHits: z.number().int(),
    homeHits: z.number().int(),
    awayErrors: z.number().int(),
    homeErrors: z.number().int(),
  }),
  playerHighlights: z.array(z.object({
    playerName: z.string(),
    statLine: z.string(),
  })),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const body = validateBody(req, GameSummarySchema) as GameSummaryRequest;

    const claudeRequest = buildGameSummaryPrompt(body);
    const claudeResponse = await callClaude(claudeRequest);

    let headline: string;
    let summary: string;
    let source: AiSource;

    if (claudeResponse) {
      const lines = claudeResponse.text.split('\n');
      headline = lines[0] ?? 'Game Recap';
      summary = lines.slice(1).join('\n').trim() || claudeResponse.text;
      source = 'claude';
    } else {
      const template = generateTemplateSummary(body);
      headline = template.headline;
      summary = template.summary;
      source = 'template';
    }

    ok(res, { headline, summary, source }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
