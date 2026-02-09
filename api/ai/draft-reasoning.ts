/**
 * POST /api/ai/draft-reasoning -- Generate draft pick reasoning
 *
 * Calls Claude for reasoning, falls back to template on failure (REQ-AI-008).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../_lib/method-guard';
import { requireAuth } from '../_lib/auth';
import { validateBody } from '../_lib/validate';
import { ok } from '../_lib/response';
import { handleApiError } from '../_lib/errors';
import { callClaude } from '../_lib/claude-client';
import { buildDraftReasoningPrompt } from '../_lib/prompts/draft-reasoning-prompt';
import { generateDraftReasoningTemplate } from '@lib/ai/template-draft-reasoning';
import type { DraftReasoningRequest, AiSource } from '@lib/types/ai';

const DraftReasoningSchema = z.object({
  round: z.number().int().min(1),
  managerStyle: z.enum(['conservative', 'aggressive', 'balanced', 'analytical']),
  managerName: z.string().min(1),
  teamName: z.string().min(1),
  pickedPlayerName: z.string().min(1),
  pickedPlayerPosition: z.string().min(1),
  pickedPlayerValue: z.number(),
  alternativePlayers: z.array(z.object({
    name: z.string(),
    position: z.string(),
    value: z.number(),
  })),
  teamNeeds: z.array(z.string()),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const body = validateBody(req, DraftReasoningSchema) as DraftReasoningRequest;

    const claudeRequest = buildDraftReasoningPrompt(body);
    const claudeResponse = await callClaude(claudeRequest);

    let reasoning: string;
    let source: AiSource;

    if (claudeResponse) {
      reasoning = claudeResponse.text;
      source = 'claude';
    } else {
      const template = generateDraftReasoningTemplate(body);
      reasoning = template.reasoning;
      source = 'template';
    }

    ok(res, { reasoning, source }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
