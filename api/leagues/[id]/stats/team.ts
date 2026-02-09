/**
 * GET /api/leagues/:id/stats/team -- Team aggregate statistics
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../../_lib/method-guard';
import { requireAuth } from '../../../_lib/auth';
import { ok } from '../../../_lib/response';
import { handleApiError } from '../../../_lib/errors';
import { snakeToCamel } from '../../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'GET')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const leagueId = req.query.id as string;
    const supabase = createServerClient();

    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, city, wins, losses, runs_scored, runs_allowed')
      .eq('league_id', leagueId);

    if (error) {
      throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
    }

    const teamStats = (teams ?? []).map((team) => ({
      team_id: team.id,
      team_name: team.name,
      runs_scored: team.runs_scored,
      runs_allowed: team.runs_allowed,
      run_differential: team.runs_scored - team.runs_allowed,
    }));

    ok(res, snakeToCamel(teamStats), requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
