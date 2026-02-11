/**
 * GET /api/health -- Minimal import test
 *
 * Tests one import at a time to find what crashes the Vercel bundle.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../src/lib/supabase/server';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'test-1',
    createServerClient: typeof createServerClient === 'function',
  });
}
