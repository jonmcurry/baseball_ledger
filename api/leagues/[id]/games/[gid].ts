/**
 * GET /api/leagues/:id/games/:gid -- Fetch full game detail
 *
 * Returns GameDetail with box score and play-by-play.
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
    const gameId = req.query.gid as string;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('game_logs')
      .select('*, home_team:teams!home_team_id(id, name, city), away_team:teams!away_team_id(id, name, city)')
      .eq('id', gameId)
      .single();

    if (error || !data) {
      throw { category: 'NOT_FOUND', code: 'GAME_NOT_FOUND', message: `Game ${gameId} not found` };
    }

    ok(res, snakeToCamel(data), requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
