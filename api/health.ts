/**
 * GET /api/health -- Production health check
 *
 * Returns 200 with basic status. Used by monitoring and uptime checks.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
