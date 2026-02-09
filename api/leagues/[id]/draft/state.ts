/**
 * GET /api/leagues/:id/draft/state -- Get current draft state
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../../_lib/method-guard';
import { requireAuth } from '../../../_lib/auth';
import { ok } from '../../../_lib/response';
import { handleApiError } from '../../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'GET')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const leagueId = req.query.id as string;
    const supabase = createServerClient();

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('status, team_count')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
    }

    // Count total picks made
    const { count: pickCount } = await supabase
      .from('rosters')
      .select('*', { count: 'exact', head: true })
      .in('team_id', (
        await supabase.from('teams').select('id').eq('league_id', leagueId)
      ).data?.map((t) => t.id) ?? []);

    const totalRounds = 21;
    const totalPicks = pickCount ?? 0;
    const currentRound = Math.floor(totalPicks / league.team_count) + 1;
    const currentPick = (totalPicks % league.team_count) + 1;

    ok(res, {
      leagueId,
      status: league.status === 'drafting' ? 'in_progress' : league.status === 'setup' ? 'not_started' : 'completed',
      currentRound: Math.min(currentRound, totalRounds),
      currentPick,
      totalRounds,
      totalPicks,
    }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
