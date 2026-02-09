/**
 * POST /api/ai/manager-explanation -- Explain a manager decision
 *
 * Calls Claude for explanation, falls back to template on failure (REQ-AI-008).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../_lib/method-guard';
import { requireAuth } from '../_lib/auth';
import { validateBody } from '../_lib/validate';
import { ok } from '../_lib/response';
import { handleApiError } from '../_lib/errors';
import { callClaude } from '../_lib/claude-client';
import { buildManagerExplanationPrompt } from '../_lib/prompts/manager-explanation-prompt';
import { generateManagerExplanationTemplate } from '@lib/ai/template-manager-explanation';
import type { ManagerExplanationRequest, AiSource } from '@lib/types/ai';

const ManagerExplanationSchema = z.object({
  managerName: z.string().min(1),
  managerStyle: z.enum(['conservative', 'aggressive', 'balanced', 'analytical']),
  decision: z.enum(['steal', 'bunt', 'intentional_walk', 'pull_pitcher']),
  inning: z.number().int().min(1),
  outs: z.number().int().min(0).max(2),
  scoreDiff: z.number().int(),
  gameContext: z.string(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const body = validateBody(req, ManagerExplanationSchema) as ManagerExplanationRequest;

    const claudeRequest = buildManagerExplanationPrompt(body);
    const claudeResponse = await callClaude(claudeRequest);

    let explanation: string;
    let source: AiSource;

    if (claudeResponse) {
      explanation = claudeResponse.text;
      source = 'claude';
    } else {
      const template = generateManagerExplanationTemplate(body);
      explanation = template.explanation;
      source = 'template';
    }

    ok(res, { explanation, source }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
