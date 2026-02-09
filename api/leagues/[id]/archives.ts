/**
 * GET /api/leagues/:id/archives -- List archived seasons
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
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('archives')
      .select('id, league_id, season_number, champion, created_at')
      .eq('league_id', leagueId)
      .order('season_number', { ascending: false });

    if (error) {
      throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
    }

    ok(res, snakeToCamel(data ?? []), requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
