/**
 * POST /api/leagues/:id/join -- Join a league via invite key
 *
 * Assigns the authenticated user to an unowned team.
 * Returns 200 OK with JoinLeagueResult.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { ok } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';

const JoinLeagueSchema = z.object({
  inviteKey: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    const { userId } = await requireAuth(req);
    const leagueId = req.query.id as string;
    const body = validateBody(req, JoinLeagueSchema);

    const supabase = createServerClient();

    // Verify league exists and invite key matches
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
    }

    if (league.invite_key !== body.inviteKey) {
      throw { category: 'VALIDATION', code: 'INVALID_INVITE_KEY', message: 'Invalid invite key' };
    }

    // Check user isn't already in the league
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .eq('owner_id', userId);

    if (existingTeams && existingTeams.length > 0) {
      throw { category: 'CONFLICT', code: 'ALREADY_MEMBER', message: 'Already a member of this league' };
    }

    // Find an unowned team
    const { data: unownedTeam, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', leagueId)
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

    ok(res, { teamId: unownedTeam.id, teamName: unownedTeam.name }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
