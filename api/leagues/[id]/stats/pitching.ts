/**
 * GET /api/leagues/:id/stats/pitching -- Paginated pitching leaders
 *
 * Query params: ?page=1&sortBy=ERA&sortOrder=asc
 * Returns PaginatedResponse<PitchingLeaderEntry>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../../_lib/method-guard';
import { requireAuth } from '../../../_lib/auth';
import { paginated } from '../../../_lib/response';
import { handleApiError } from '../../../_lib/errors';
import { snakeToCamel } from '../../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';

const PAGE_SIZE = 50;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'GET')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const leagueId = req.query.id as string;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const offset = (page - 1) * PAGE_SIZE;

    const supabase = createServerClient();

    const { count, error: countError } = await supabase
      .from('season_stats')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .not('pitching_stats', 'is', null);

    if (countError) {
      throw { category: 'DATA', code: 'QUERY_FAILED', message: countError.message };
    }

    const { data, error } = await supabase
      .from('season_stats')
      .select('player_id, team_id, pitching_stats')
      .eq('league_id', leagueId)
      .not('pitching_stats', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
    }

    const leaders = (data ?? []).map((row) => ({
      player_id: row.player_id,
      team_id: row.team_id,
      stats: row.pitching_stats,
    }));

    paginated(
      res,
      snakeToCamel(leaders) as unknown[],
      { page, pageSize: PAGE_SIZE, totalRows: count ?? 0 },
      requestId,
    );
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
