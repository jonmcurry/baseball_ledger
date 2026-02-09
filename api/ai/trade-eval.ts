/**
 * POST /api/ai/trade-eval -- Evaluate a proposed trade
 *
 * Calls Claude for evaluation, falls back to template on failure (REQ-AI-008).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../_lib/method-guard';
import { requireAuth } from '../_lib/auth';
import { validateBody } from '../_lib/validate';
import { ok } from '../_lib/response';
import { handleApiError } from '../_lib/errors';
import { callClaude } from '../_lib/claude-client';
import { buildTradeEvalPrompt } from '../_lib/prompts/trade-eval-prompt';
import { evaluateTradeTemplate } from '@lib/ai/template-trade-eval';
import type { TradeEvaluationRequest, AiSource } from '@lib/types/ai';

const PlayerSchema = z.object({
  name: z.string().min(1),
  position: z.string().min(1),
  value: z.number(),
});

const TradeEvalSchema = z.object({
  managerStyle: z.enum(['conservative', 'aggressive', 'balanced', 'analytical']),
  managerName: z.string().min(1),
  teamName: z.string().min(1),
  playersOffered: z.array(PlayerSchema).min(1),
  playersRequested: z.array(PlayerSchema).min(1),
  teamNeeds: z.array(z.string()),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const body = validateBody(req, TradeEvalSchema) as TradeEvaluationRequest;

    const claudeRequest = buildTradeEvalPrompt(body);
    const claudeResponse = await callClaude(claudeRequest);

    let recommendation: 'accept' | 'reject' | 'counter';
    let reasoning: string;
    let valueDiff: number;
    let source: AiSource;

    if (claudeResponse) {
      const lines = claudeResponse.text.split('\n').map((l) => l.trim());
      const recLine = (lines[0] ?? '').toUpperCase();
      recommendation = recLine.includes('ACCEPT') ? 'accept'
        : recLine.includes('COUNTER') ? 'counter'
        : 'reject';
      reasoning = lines[1] ?? claudeResponse.text;
      valueDiff = parseFloat(lines[2] ?? '0') || 0;
      source = 'claude';
    } else {
      const template = evaluateTradeTemplate(body);
      recommendation = template.recommendation;
      reasoning = template.reasoning;
      valueDiff = template.valueDiff;
      source = 'template';
    }

    ok(res, { recommendation, reasoning, valueDiff, source }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
