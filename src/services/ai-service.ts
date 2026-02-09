/**
 * AI Service
 *
 * Layer 3 client for calling AI API endpoints (REQ-AI-006).
 * All 5 functions call apiPost and return typed responses.
 */

import { apiPost } from './api-client';
import type { ApiResponse } from '@lib/types/api';
import type {
  CommentaryRequest,
  CommentaryResponse,
  GameSummaryRequest,
  GameSummaryResponse,
  TradeEvaluationRequest,
  TradeEvaluationResponse,
  DraftReasoningRequest,
  DraftReasoningResponse,
  ManagerExplanationRequest,
  ManagerExplanationResponse,
} from '@lib/types/ai';

export async function generateCommentary(
  request: CommentaryRequest,
): Promise<ApiResponse<CommentaryResponse>> {
  return apiPost<CommentaryResponse>('/api/ai/commentary', request);
}

export async function generateGameSummary(
  request: GameSummaryRequest,
): Promise<ApiResponse<GameSummaryResponse>> {
  return apiPost<GameSummaryResponse>('/api/ai/game-summary', request);
}

export async function evaluateTrade(
  request: TradeEvaluationRequest,
): Promise<ApiResponse<TradeEvaluationResponse>> {
  return apiPost<TradeEvaluationResponse>('/api/ai/trade-eval', request);
}

export async function generateDraftReasoning(
  request: DraftReasoningRequest,
): Promise<ApiResponse<DraftReasoningResponse>> {
  return apiPost<DraftReasoningResponse>('/api/ai/draft-reasoning', request);
}

export async function explainManagerDecision(
  request: ManagerExplanationRequest,
): Promise<ApiResponse<ManagerExplanationResponse>> {
  return apiPost<ManagerExplanationResponse>('/api/ai/manager-explanation', request);
}
