/**
 * POST /api/leagues/join -- Join a league by invite key
 *
 * Looks up the league by invite_key, assigns an unowned team to the user.
 * Returns { leagueId, teamId, teamName }.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../_lib/method-guard';
import { requireAuth } from '../_lib/auth';
import { validateBody } from '../_lib/validate';
import { ok } from '../_lib/response';
import { handleApiError } from '../_lib/errors';
import { createServerClient } from '@lib/supabase/server';

const JoinByKeySchema = z.object({
  inviteKey: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    const { userId } = await requireAuth(req);
    const body = validateBody(req, JoinByKeySchema);
    const supabase = createServerClient();

    // Look up league by invite key
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, invite_key')
      .eq('invite_key', body.inviteKey)
      .single();

    if (leagueError || !league) {
      throw { category: 'NOT_FOUND', code: 'INVALID_INVITE_KEY', message: 'No league found with that invite code' };
    }

    // Check user isn't already in the league
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', league.id)
      .eq('owner_id', userId);

    if (existingTeams && existingTeams.length > 0) {
      throw { category: 'CONFLICT', code: 'ALREADY_MEMBER', message: 'You are already a member of this league' };
    }

    // Find an unowned team
    const { data: unownedTeam, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('league_id', league.id)
      .is('owner_id', null)
      .limit(1)
      .single();

    if (teamError || !unownedTeam) {
      throw { category: 'CONFLICT', code: 'NO_AVAILABLE_TEAMS', message: 'No available teams in this league' };
    }

    // Assign the team to the user
    const { error: updateError } = await supabase
      .from('teams')
      .update({ owner_id: userId })
      .eq('id', unownedTeam.id);

    if (updateError) {
      throw { category: 'DATA', code: 'JOIN_FAILED', message: updateError.message };
    }

    ok(res, {
      leagueId: league.id,
      teamId: unownedTeam.id,
      teamName: unownedTeam.name,
    }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
