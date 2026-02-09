/**
 * GET /api/leagues/:id/schedule -- Fetch league schedule
 *
 * Optional query param: ?day=N to filter by specific day
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { ok } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { snakeToCamel } from '../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'GET')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const leagueId = req.query.id as string;
    const dayParam = req.query.day as string | undefined;
    const supabase = createServerClient();

    let query = supabase
      .from('schedule')
      .select('*')
      .eq('league_id', leagueId)
      .order('day_number')
      .order('id');

    if (dayParam) {
      const day = parseInt(dayParam, 10);
      if (!isNaN(day)) {
        query = query.eq('day_number', day);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
    }

    ok(res, snakeToCamel(data ?? []), requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
