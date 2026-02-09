/**
 * GET /api/leagues/:id/teams/:tid/roster -- Fetch team roster
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../../../_lib/method-guard';
import { requireAuth } from '../../../../_lib/auth';
import { ok } from '../../../../_lib/response';
import { handleApiError } from '../../../../_lib/errors';
import { snakeToCamel } from '../../../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'GET')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const teamId = req.query.tid as string;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('rosters')
      .select('*')
      .eq('team_id', teamId)
      .order('lineup_order', { nullsFirst: false });

    if (error) {
      throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
    }

    ok(res, snakeToCamel(data ?? []), requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
