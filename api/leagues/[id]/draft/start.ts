/**
 * POST /api/leagues/:id/draft/start -- Start the draft
 *
 * Commissioner only. Sets league status to 'drafting'.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../../_lib/method-guard';
import { requireAuth } from '../../../_lib/auth';
import { ok } from '../../../_lib/response';
import { handleApiError } from '../../../_lib/errors';
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
      .select('commissioner_id, status')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
    }

    if (league.commissioner_id !== userId) {
      throw { category: 'AUTHORIZATION', code: 'NOT_COMMISSIONER', message: 'Only the commissioner can start the draft' };
    }

    if (league.status !== 'setup') {
      throw { category: 'VALIDATION', code: 'INVALID_STATUS', message: `Cannot start draft from ${league.status} status` };
    }

    const { error: updateError } = await supabase
      .from('leagues')
      .update({ status: 'drafting' })
      .eq('id', leagueId);

    if (updateError) {
      throw { category: 'DATA', code: 'UPDATE_FAILED', message: updateError.message };
    }

    ok(res, {
      leagueId,
      status: 'in_progress',
      currentRound: 1,
      currentPick: 1,
    }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
