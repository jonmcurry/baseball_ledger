/**
 * GET /api/health -- Isolate crash cause
 *
 * Test 3: Import from api/_lib/ (local file within api/).
 * If this crashes, Vercel can't bundle ANY local imports.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ok } from './_lib/response';

export default function handler(req: VercelRequest, res: VercelResponse) {
  ok(res, { status: 'test-3-local-lib' }, 'health-check');
}
