/**
 * Claude Client Tests
 */

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
      constructor(_opts: unknown) {
        // noop
      }
    },
  };
});

import {
  isClaudeAvailable,
  callClaude,
  _resetClient,
} from '../../../../api/_lib/claude-client';

describe('claude-client', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    _resetClient();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    vi.useRealTimers();
  });

  describe('isClaudeAvailable', () => {
    it('returns true when API key is set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      expect(isClaudeAvailable()).toBe(true);
    });

    it('returns false when API key is empty', () => {
      process.env.ANTHROPIC_API_KEY = '';
      expect(isClaudeAvailable()).toBe(false);
    });

    it('returns false when API key is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(isClaudeAvailable()).toBe(false);
    });
  });

  describe('callClaude', () => {
    it('returns null when API key is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const result = await callClaude({ system: 'test', prompt: 'test' });
      expect(result).toBeNull();
    });

    it('returns text on successful response', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'A sharp single by Trout.' }],
      });

      const result = await callClaude({ system: 'You are a commentator.', prompt: 'Generate commentary.' });
      expect(result).toEqual({ text: 'A sharp single by Trout.' });
    });

    it('returns null when response has no text block', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'image', source: {} }],
      });

      const result = await callClaude({ system: 'test', prompt: 'test' });
      expect(result).toBeNull();
    });

    it('retries on failure and succeeds on second attempt', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      mockCreate
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Recovered response.' }],
        });

      vi.useFakeTimers();
      const promise = callClaude({ system: 'test', prompt: 'test' });
      await vi.advanceTimersByTimeAsync(1500);
      const result = await promise;

      expect(result).toEqual({ text: 'Recovered response.' });
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('returns null after all retries exhausted', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      mockCreate.mockRejectedValue(new Error('persistent failure'));

      vi.useFakeTimers();
      const promise = callClaude({ system: 'test', prompt: 'test' });
      await vi.advanceTimersByTimeAsync(8000);
      const result = await promise;

      expect(result).toBeNull();
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('passes maxTokens to the API', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response.' }],
      });

      await callClaude({ system: 'sys', prompt: 'p', maxTokens: 500 });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 500 }),
      );
    });

    it('uses default maxTokens of 256 when not specified', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response.' }],
      });

      await callClaude({ system: 'sys', prompt: 'p' });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 256 }),
      );
    });
  });
});
