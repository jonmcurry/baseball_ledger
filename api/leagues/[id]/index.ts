/**
 * GET /api/leagues/:id -- Fetch league details
 * DELETE /api/leagues/:id -- Delete league (commissioner only)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { ok, noContent } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { snakeToCamel } from '../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, ['GET', 'DELETE'])) return;

  const requestId = crypto.randomUUID();
  try {
    const { userId } = await requireAuth(req);
    const leagueId = req.query.id as string;
    const supabase = createServerClient();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (error || !data) {
        throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
      }

      // Verify membership (commissioner or team owner)
      const { data: teams } = await supabase
        .from('teams')
        .select('owner_id')
        .eq('league_id', leagueId);

      const isMember = data.commissioner_id === userId ||
        teams?.some((t) => t.owner_id === userId);

      if (!isMember) {
        throw { category: 'AUTHORIZATION', code: 'NOT_LEAGUE_MEMBER', message: 'Not a member of this league' };
      }

      ok(res, snakeToCamel(data), requestId);
    } else {
      // DELETE
      const { data, error } = await supabase
        .from('leagues')
        .select('commissioner_id')
        .eq('id', leagueId)
        .single();

      if (error || !data) {
        throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
      }

      if (data.commissioner_id !== userId) {
        throw { category: 'AUTHORIZATION', code: 'NOT_COMMISSIONER', message: 'Only the commissioner can delete this league' };
      }

      const { error: deleteError } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId);

      if (deleteError) {
        throw { category: 'DATA', code: 'DELETE_FAILED', message: deleteError.message };
      }

      noContent(res, requestId);
    }
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
