/**
 * HTTP Method Guard
 *
 * Validates that the request uses an allowed HTTP method.
 * Returns a 405 Method Not Allowed response otherwise.
 *
 * Layer 2: API infrastructure.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Check if the request method matches the allowed method(s).
 * Returns true if the method is allowed, false if it responded with 405.
 *
 * Usage:
 *   if (!checkMethod(req, res, 'GET')) return;
 *   if (!checkMethod(req, res, ['GET', 'DELETE'])) return;
 */
export function checkMethod(
  req: VercelRequest,
  res: VercelResponse,
  allowed: string | string[],
): boolean {
  const methods = Array.isArray(allowed) ? allowed : [allowed];
  const method = req.method?.toUpperCase() ?? '';

  if (methods.includes(method)) {
    return true;
  }

  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${method} is not allowed. Use: ${methods.join(', ')}`,
    },
  });
  return false;
}
