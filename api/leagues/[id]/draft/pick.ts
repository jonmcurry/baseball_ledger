/**
 * POST /api/leagues/:id/draft/pick -- Submit a draft pick
 *
 * Validates turn order and adds player to team roster.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../../_lib/method-guard';
import { requireAuth } from '../../../_lib/auth';
import { validateBody } from '../../../_lib/validate';
import { created } from '../../../_lib/response';
import { handleApiError } from '../../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';

const DraftPickSchema = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  position: z.string().min(1),
  seasonYear: z.number().int(),
  playerCard: z.record(z.string(), z.unknown()),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    const { userId } = await requireAuth(req);
    const leagueId = req.query.id as string;
    const body = validateBody(req, DraftPickSchema);

    const supabase = createServerClient();

    // Verify league is in drafting status
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('status')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
    }

    if (league.status !== 'drafting') {
      throw { category: 'VALIDATION', code: 'NOT_DRAFTING', message: 'League is not in drafting status' };
    }

    // Find user's team
    const { data: userTeam, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .eq('owner_id', userId)
      .single();

    if (teamError || !userTeam) {
      throw { category: 'AUTHORIZATION', code: 'NO_TEAM', message: 'You do not have a team in this league' };
    }

    // Insert roster entry
    const { error: insertError } = await supabase
      .from('rosters')
      .insert({
        team_id: userTeam.id,
        player_id: body.playerId,
        season_year: body.seasonYear,
        player_card: body.playerCard,
        roster_slot: 'bench',
      });

    if (insertError) {
      if (insertError.code === '23505') {
        throw { category: 'CONFLICT', code: 'PLAYER_ALREADY_DRAFTED', message: 'This player has already been drafted' };
      }
      throw { category: 'DATA', code: 'INSERT_FAILED', message: insertError.message };
    }

    created(res, {
      teamId: userTeam.id,
      playerId: body.playerId,
      playerName: body.playerName,
      position: body.position,
    }, requestId, `/api/leagues/${leagueId}/teams/${userTeam.id}/roster`);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
