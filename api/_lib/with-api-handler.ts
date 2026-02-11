/**
 * Global API Handler Wrapper (REQ-ERR-009)
 *
 * Defense-in-depth wrapper for Vercel serverless functions.
 * Generates a requestId, wraps the handler in try/catch, and
 * ensures all unhandled errors return a structured 500 response
 * with ERROR-level logging.
 *
 * Layer 2: API infrastructure.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleApiError } from './errors';
import { logger } from './logger';

type ApiHandler = (
  req: VercelRequest,
  res: VercelResponse,
  requestId: string,
) => void | Promise<void>;

/**
 * Wrap an API handler with global error handling.
 *
 * Per REQ-ERR-009: unhandled rejections in API functions MUST be caught
 * by a global handler that logs at ERROR level and returns a 500
 * ApiErrorResponse with code ERR_UNHANDLED.
 */
export function withApiHandler(handler: ApiHandler) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const requestId = crypto.randomUUID();
    try {
      await handler(req, res, requestId);
    } catch (err) {
      logger.error('Unhandled API error', {
        requestId,
        error: err instanceof Error ? err : undefined,
        operation: `${req.method} ${req.url}`,
      });
      handleApiError(res, err, requestId);
    }
  };
}
