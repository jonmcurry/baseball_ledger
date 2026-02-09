/**
 * POST /api/leagues/:id/archive -- Archive the current season
 *
 * Commissioner only. Creates an archive record and resets the league.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { noContent } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
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
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
