/**
 * POST /api/ai/commentary -- Generate play-by-play commentary
 *
 * Calls Claude for commentary, falls back to template on failure (REQ-AI-008).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../_lib/method-guard';
import { requireAuth } from '../_lib/auth';
import { validateBody } from '../_lib/validate';
import { ok } from '../_lib/response';
import { handleApiError } from '../_lib/errors';
import { callClaude } from '../_lib/claude-client';
import { buildCommentaryPrompt } from '../_lib/prompts/commentary-prompt';
import { generateTemplateCommentary } from '@lib/ai/template-commentary';
import type { CommentaryRequest, AiSource } from '@lib/types/ai';

const CommentarySchema = z.object({
  batterId: z.string().min(1),
  batterName: z.string().min(1),
  pitcherId: z.string().min(1),
  pitcherName: z.string().min(1),
  outcome: z.number().int().min(15).max(40),
  inning: z.number().int().min(1),
  halfInning: z.enum(['top', 'bottom']),
  outs: z.number().int().min(0).max(2),
  scoreDiff: z.number().int(),
  runnersOn: z.number().int().min(0).max(3),
  style: z.enum(['newspaper', 'radio', 'modern']),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const body = validateBody(req, CommentarySchema) as CommentaryRequest;

    const claudeRequest = buildCommentaryPrompt(body);
    const claudeResponse = await callClaude(claudeRequest);

    let text: string;
    let source: AiSource;

    if (claudeResponse) {
      text = claudeResponse.text;
      source = 'claude';
    } else {
      const template = generateTemplateCommentary(body);
      text = template.text;
      source = 'template';
    }

    ok(res, { text, source }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
