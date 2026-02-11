/**
 * Commentary Prompt Builder
 *
 * Builds the Claude prompt for play-by-play commentary generation.
 *
 * Layer 2: API infrastructure.
 */

import type { CommentaryRequest } from '../../../src/lib/types/ai';
import type { ClaudeRequest } from '../claude-client';

const STYLE_INSTRUCTIONS: Record<string, string> = {
  newspaper:
    'Write in the style of a classic newspaper sportswriter. Use past tense, formal prose, and vivid but restrained language.',
  radio:
    'Write in the style of an excited radio play-by-play announcer. Use present tense, exclamations, and paint the picture for listeners.',
  modern:
    'Write in the style of a modern baseball analytics-aware commentator. Use casual tone, mention stats or exit velo when relevant, and keep it concise.',
};

export function buildCommentaryPrompt(request: CommentaryRequest): ClaudeRequest {
  const styleInstruction = STYLE_INSTRUCTIONS[request.style] ?? STYLE_INSTRUCTIONS.newspaper;

  return {
    system: `You are a baseball play-by-play commentator. Generate exactly ONE sentence of game commentary. ${styleInstruction} Do not add quotation marks or attribution.`,
    prompt: [
      `Batter: ${request.batterName}`,
      `Pitcher: ${request.pitcherName}`,
      `Outcome: ${outcomeLabel(request.outcome)}`,
      `Inning: ${request.halfInning === 'top' ? 'Top' : 'Bottom'} of the ${request.inning}`,
      `Outs: ${request.outs}`,
      `Score differential: ${request.scoreDiff > 0 ? `+${request.scoreDiff}` : request.scoreDiff}`,
      `Runners on base: ${request.runnersOn}`,
    ].join('\n'),
    maxTokens: 100,
  };
}

function outcomeLabel(outcome: number): string {
  const labels: Record<number, string> = {
    15: 'clean single',
    16: 'single, runner advances',
    17: 'double',
    18: 'triple',
    19: 'home run',
    20: 'home run (barely clears fence)',
    21: 'ground out',
    22: 'fly out',
    23: 'pop out',
    24: 'line out',
    25: 'strikeout looking',
    26: 'strikeout swinging',
    27: 'walk',
    28: 'intentional walk',
    29: 'hit by pitch',
    30: 'ground out, runner advances',
    31: 'sacrifice bunt',
    32: 'double play (ground)',
    33: 'double play (line drive)',
    34: 'reached on error',
    35: "fielder's choice",
    36: 'stolen base opportunity',
    37: 'wild pitch',
    38: 'balk',
    39: 'passed ball',
    40: 'special/unusual play',
  };
  return labels[outcome] ?? 'play';
}
