/**
 * Claude API Client
 *
 * Wraps the Anthropic SDK with timeout, retry, and graceful degradation (REQ-AI-007/008).
 *
 * - 10s timeout per call (REQ-NFR-006)
 * - 3 retries with exponential backoff (1s, 2s, 4s)
 * - Returns null on final failure (callers fall back to templates)
 *
 * Layer 2: API infrastructure.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getServerConfig } from './config';

export interface ClaudeRequest {
  readonly system: string;
  readonly prompt: string;
  readonly maxTokens?: number;
}

export interface ClaudeResponse {
  readonly text: string;
}

const DEFAULT_MAX_TOKENS = 256;
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1_000;
const MODEL = 'claude-sonnet-4-5-20250929';

let clientInstance: Anthropic | null = null;

/**
 * Check if the Claude API is available (API key is set).
 */
export function isClaudeAvailable(): boolean {
  const config = getServerConfig();
  return typeof config.anthropicApiKey === 'string'
    && config.anthropicApiKey.length > 0;
}

/**
 * Get or create the Anthropic client singleton.
 * Returns null if the API key is not configured.
 */
function getClient(): Anthropic | null {
  if (!isClaudeAvailable()) return null;
  if (!clientInstance) {
    const config = getServerConfig();
    clientInstance = new Anthropic({
      apiKey: config.anthropicApiKey,
      timeout: TIMEOUT_MS,
    });
  }
  return clientInstance;
}

/**
 * Sleep for the specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract text content from Claude's response.
 */
function extractText(response: Anthropic.Message): string | null {
  for (const block of response.content) {
    if (block.type === 'text') {
      return block.text;
    }
  }
  return null;
}

/**
 * Call the Claude API with retry and timeout.
 *
 * Returns null if:
 * - API key is not configured
 * - All retries are exhausted
 * - Response is malformed (no text block)
 */
export async function callClaude(request: ClaudeRequest): Promise<ClaudeResponse | null> {
  const client = getClient();
  if (!client) return null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
      });

      const text = extractText(response);
      if (text === null) return null;

      return { text };
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt);
        await sleep(backoff);
      }
    }
  }

  return null;
}

/**
 * Reset the client singleton (for testing).
 */
export function _resetClient(): void {
  clientInstance = null;
}
