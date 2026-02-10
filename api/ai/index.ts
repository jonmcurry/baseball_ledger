/**
 * POST /api/ai?feature=commentary|game-summary|trade-eval|draft-reasoning|manager-explanation
 *
 * Consolidated AI endpoint. Dispatches to the appropriate handler based on
 * the `feature` query parameter. Falls back to template on Claude failure (REQ-AI-008).
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
import { buildGameSummaryPrompt } from '../_lib/prompts/game-summary-prompt';
import { buildTradeEvalPrompt } from '../_lib/prompts/trade-eval-prompt';
import { buildDraftReasoningPrompt } from '../_lib/prompts/draft-reasoning-prompt';
import { buildManagerExplanationPrompt } from '../_lib/prompts/manager-explanation-prompt';
import { generateTemplateCommentary } from '@lib/ai/template-commentary';
import { generateTemplateSummary } from '@lib/ai/template-game-summary';
import { evaluateTradeTemplate } from '@lib/ai/template-trade-eval';
import { generateDraftReasoningTemplate } from '@lib/ai/template-draft-reasoning';
import { generateManagerExplanationTemplate } from '@lib/ai/template-manager-explanation';
import type {
  CommentaryRequest,
  GameSummaryRequest,
  TradeEvaluationRequest,
  DraftReasoningRequest,
  ManagerExplanationRequest,
  AiSource,
} from '@lib/types/ai';

// ---------- Schemas ----------

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

const ManagerExplanationSchema = z.object({
  managerName: z.string().min(1),
  managerStyle: z.enum(['conservative', 'aggressive', 'balanced', 'analytical']),
  decision: z.enum(['steal', 'bunt', 'intentional_walk', 'pull_pitcher']),
  inning: z.number().int().min(1),
  outs: z.number().int().min(0).max(2),
  scoreDiff: z.number().int(),
  gameContext: z.string(),
});

// ---------- Feature handlers ----------

async function handleCommentary(req: VercelRequest, res: VercelResponse, requestId: string) {
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
}

async function handleGameSummary(req: VercelRequest, res: VercelResponse, requestId: string) {
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
}

async function handleTradeEval(req: VercelRequest, res: VercelResponse, requestId: string) {
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
}

async function handleDraftReasoning(req: VercelRequest, res: VercelResponse, requestId: string) {
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
}

async function handleManagerExplanation(req: VercelRequest, res: VercelResponse, requestId: string) {
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
}

// ---------- Main handler ----------

const featureHandlers: Record<string, (req: VercelRequest, res: VercelResponse, requestId: string) => Promise<void>> = {
  'commentary': handleCommentary,
  'game-summary': handleGameSummary,
  'trade-eval': handleTradeEval,
  'draft-reasoning': handleDraftReasoning,
  'manager-explanation': handleManagerExplanation,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);

    const feature = req.query.feature as string | undefined;
    if (!feature || !featureHandlers[feature]) {
      res.status(400).json({
        error: {
          code: 'INVALID_FEATURE',
          message: `Invalid or missing feature parameter. Valid features: ${Object.keys(featureHandlers).join(', ')}`,
        },
      });
      return;
    }

    await featureHandlers[feature](req, res, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
