/**
 * GET /api/health -- Deployment verification
 *
 * Uses the same static imports as api/leagues/index.ts (all relative paths)
 * to verify the Vercel function bundle resolves correctly.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from './_lib/method-guard';
import { requireAuth } from './_lib/auth';
import { validateBody } from './_lib/validate';
import { ok, created } from './_lib/response';
import { handleApiError } from './_lib/errors';
import { snakeToCamel } from './_lib/transform';
import { createServerClient } from '../src/lib/supabase/server';
import type { Json } from '../src/lib/types/database';
import { loadCsvFiles } from './_lib/load-csvs';
import { runCsvPipeline } from '../src/lib/csv/load-pipeline';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'imports-ok',
    timestamp: new Date().toISOString(),
    modules: {
      zod: typeof z.object === 'function',
      checkMethod: typeof checkMethod === 'function',
      requireAuth: typeof requireAuth === 'function',
      validateBody: typeof validateBody === 'function',
      ok: typeof ok === 'function',
      created: typeof created === 'function',
      handleApiError: typeof handleApiError === 'function',
      snakeToCamel: typeof snakeToCamel === 'function',
      createServerClient: typeof createServerClient === 'function',
      loadCsvFiles: typeof loadCsvFiles === 'function',
      runCsvPipeline: typeof runCsvPipeline === 'function',
    },
  });
}
