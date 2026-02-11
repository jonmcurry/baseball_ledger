/**
 * GET /api/health -- Import diagnostic
 *
 * Uses dynamic imports with try/catch to identify which specific
 * import causes FUNCTION_INVOCATION_FAILED on Vercel.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: Record<string, string> = {};

  // Test each import individually with dynamic import + try/catch
  try {
    await import('zod');
    results.zod = 'ok';
  } catch (e: unknown) {
    results.zod = e instanceof Error ? e.message : String(e);
  }

  try {
    await import('./_lib/method-guard');
    results.methodGuard = 'ok';
  } catch (e: unknown) {
    results.methodGuard = e instanceof Error ? e.message : String(e);
  }

  try {
    await import('./_lib/auth');
    results.auth = 'ok';
  } catch (e: unknown) {
    results.auth = e instanceof Error ? e.message : String(e);
  }

  try {
    await import('./_lib/validate');
    results.validate = 'ok';
  } catch (e: unknown) {
    results.validate = e instanceof Error ? e.message : String(e);
  }

  try {
    await import('./_lib/response');
    results.response = 'ok';
  } catch (e: unknown) {
    results.response = e instanceof Error ? e.message : String(e);
  }

  try {
    await import('./_lib/errors');
    results.errors = 'ok';
  } catch (e: unknown) {
    results.errors = e instanceof Error ? e.message : String(e);
  }

  try {
    await import('./_lib/transform');
    results.transform = 'ok';
  } catch (e: unknown) {
    results.transform = e instanceof Error ? e.message : String(e);
  }

  try {
    await import('./_lib/load-csvs');
    results.loadCsvs = 'ok';
  } catch (e: unknown) {
    results.loadCsvs = e instanceof Error ? e.message : String(e);
  }

  // The ../src/lib/* path alias imports -- most likely culprits
  try {
    await import('../src/lib/supabase/server');
    results.supabaseServer = 'ok';
  } catch (e: unknown) {
    results.supabaseServer = e instanceof Error ? e.message : String(e);
  }

  try {
    await import('../src/lib/csv/load-pipeline');
    results.csvPipeline = 'ok';
  } catch (e: unknown) {
    results.csvPipeline = e instanceof Error ? e.message : String(e);
  }

  res.status(200).json({
    status: 'diagnostic',
    timestamp: new Date().toISOString(),
    imports: results,
  });
}
