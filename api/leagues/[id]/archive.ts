/**
 * GET  /api/leagues/:id/archive -- List archived seasons
 * POST /api/leagues/:id/archive -- Archive the current season (commissioner only)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { ok, noContent } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { snakeToCamel } from '../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, ['GET', 'POST'])) return;

  const requestId = crypto.randomUUID();
  try {
    if (req.method === 'GET') {
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
    } else {
      // POST -- archive season
      const { userId } = await requireAuth(req);
      const leagueId = req.query.id as string;
      const supabase = createServerClient();

      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('commissioner_id, status, season_year')
        .eq('id', leagueId)
        .single();

      if (leagueError || !league) {
        throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
      }

      if (league.commissioner_id !== userId) {
        throw { category: 'AUTHORIZATION', code: 'NOT_COMMISSIONER', message: 'Only the commissioner can archive a season' };
      }

      if (league.status !== 'completed') {
        throw { category: 'VALIDATION', code: 'SEASON_NOT_COMPLETE', message: 'Season must be completed before archiving' };
      }

      // Get final standings for archive
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId);

      // Create archive record
      await supabase.from('archives').insert({
        league_id: leagueId,
        season_number: league.season_year,
        standings: { teams: teams ?? [] },
      });

      // Increment season year and reset status
      await supabase
        .from('leagues')
        .update({ season_year: league.season_year + 1, status: 'setup', current_day: 0 })
        .eq('id', leagueId);

      noContent(res, requestId);
    }
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
