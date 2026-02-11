/**
 * GET /api/health -- Isolate crash cause
 *
 * Test 2: Import npm package directly (not through src/lib wrapper).
 * If this works but ../src/lib/supabase/server doesn't, the issue
 * is with how Vercel bundles imports from outside api/.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'test-2-npm-direct',
    hasCreateClient: typeof createClient === 'function',
  });
}
