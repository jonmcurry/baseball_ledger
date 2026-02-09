/**
 * AI Types
 *
 * Request/response interfaces for all AI features (REQ-AI-006).
 * Used by both template fallbacks (Layer 1) and Claude API endpoints (Layer 2).
 *
 * Layer 0: Pure types, no logic, no side effects.
 */

import type { OutcomeCategory, BoxScore } from './game';
import type { ManagerStyle } from '../simulation/manager-profiles';

/** Commentary style per SRD REQ-AI-006 */
export type CommentaryStyle = 'newspaper' | 'radio' | 'modern';

/** Source of AI content: template fallback vs Claude API */
export type AiSource = 'template' | 'claude';

// --- Play-by-Play Commentary ---

export interface CommentaryRequest {
  readonly batterId: string;
  readonly batterName: string;
  readonly pitcherId: string;
  readonly pitcherName: string;
  readonly outcome: OutcomeCategory;
  readonly inning: number;
  readonly halfInning: 'top' | 'bottom';
  readonly outs: number;
  readonly scoreDiff: number;
  readonly runnersOn: number;
  readonly style: CommentaryStyle;
}

export interface CommentaryResponse {
  readonly text: string;
  readonly source: AiSource;
}

// --- Game Summary ---

export interface GameSummaryRequest {
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly innings: number;
  readonly winningPitcherName: string;
  readonly losingPitcherName: string;
  readonly savePitcherName: string | null;
  readonly keyPlays: ReadonlyArray<{
    readonly inning: number;
    readonly description: string;
  }>;
  readonly boxScore: BoxScore;
  readonly playerHighlights: ReadonlyArray<{
    readonly playerName: string;
    readonly statLine: string;
  }>;
}

export interface GameSummaryResponse {
  readonly headline: string;
  readonly summary: string;
  readonly source: AiSource;
}

// --- Trade Evaluation ---

export interface TradeEvaluationRequest {
  readonly managerStyle: ManagerStyle;
  readonly managerName: string;
  readonly teamName: string;
  readonly playersOffered: ReadonlyArray<{
    readonly name: string;
    readonly position: string;
    readonly value: number;
  }>;
  readonly playersRequested: ReadonlyArray<{
    readonly name: string;
    readonly position: string;
    readonly value: number;
  }>;
  readonly teamNeeds: ReadonlyArray<string>;
}

export interface TradeEvaluationResponse {
  readonly recommendation: 'accept' | 'reject' | 'counter';
  readonly reasoning: string;
  readonly valueDiff: number;
  readonly source: AiSource;
}

// --- Draft Pick Reasoning ---

export interface DraftReasoningRequest {
  readonly round: number;
  readonly managerStyle: ManagerStyle;
  readonly managerName: string;
  readonly teamName: string;
  readonly pickedPlayerName: string;
  readonly pickedPlayerPosition: string;
  readonly pickedPlayerValue: number;
  readonly alternativePlayers: ReadonlyArray<{
    readonly name: string;
    readonly position: string;
    readonly value: number;
  }>;
  readonly teamNeeds: ReadonlyArray<string>;
}

export interface DraftReasoningResponse {
  readonly reasoning: string;
  readonly source: AiSource;
}

// --- Manager Decision Explanation ---

export type ManagerDecisionType = 'steal' | 'bunt' | 'intentional_walk' | 'pull_pitcher';

export interface ManagerExplanationRequest {
  readonly managerName: string;
  readonly managerStyle: ManagerStyle;
  readonly decision: ManagerDecisionType;
  readonly inning: number;
  readonly outs: number;
  readonly scoreDiff: number;
  readonly gameContext: string;
}

export interface ManagerExplanationResponse {
  readonly explanation: string;
  readonly source: AiSource;
}
