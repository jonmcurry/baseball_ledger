/**
 * POST /api/leagues/:id/transactions -- Execute a roster transaction
 *
 * Supports add, drop, and trade operations.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { created } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';

const TransactionSchema = z.object({
  type: z.enum(['add', 'drop', 'trade']),
  teamId: z.string().uuid(),
  playersToAdd: z.array(z.object({
    playerId: z.string(),
    playerName: z.string(),
    seasonYear: z.number().int(),
    playerCard: z.record(z.string(), z.unknown()),
  })).optional().default([]),
  playersToDrop: z.array(z.string()).optional().default([]),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    const { userId } = await requireAuth(req);
    const leagueId = req.query.id as string;
    const body = validateBody(req, TransactionSchema);

    const supabase = createServerClient();

    // Verify team ownership
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, owner_id, league_id')
      .eq('id', body.teamId)
      .single();

    if (teamError || !team) {
      throw { category: 'NOT_FOUND', code: 'TEAM_NOT_FOUND', message: `Team ${body.teamId} not found` };
    }

    if (team.league_id !== leagueId) {
      throw { category: 'VALIDATION', code: 'WRONG_LEAGUE', message: 'Team does not belong to this league' };
    }

    if (team.owner_id !== userId) {
      throw { category: 'AUTHORIZATION', code: 'NOT_TEAM_OWNER', message: 'Only the team owner can make transactions' };
    }

    // Execute drops
    if (body.playersToDrop.length > 0) {
      await supabase
        .from('rosters')
        .delete()
        .eq('team_id', body.teamId)
        .in('player_id', body.playersToDrop);
    }

    // Execute adds
    const addedPlayers: Array<{ playerId: string; playerName: string }> = [];
    for (const player of body.playersToAdd) {
      const { error: insertError } = await supabase
        .from('rosters')
        .insert({
          team_id: body.teamId,
          player_id: player.playerId,
          season_year: player.seasonYear,
          player_card: player.playerCard,
          roster_slot: 'bench',
        });

      if (insertError) {
        throw { category: 'DATA', code: 'INSERT_FAILED', message: insertError.message };
      }
      addedPlayers.push({ playerId: player.playerId, playerName: player.playerName });
    }

    const result = {
      transactionId: crypto.randomUUID(),
      type: body.type,
      teamId: body.teamId,
      playersAdded: addedPlayers,
      playersDropped: body.playersToDrop.map((id) => ({ playerId: id, playerName: '' })),
      completedAt: new Date().toISOString(),
    };

    created(res, result, requestId, `/api/leagues/${leagueId}/transactions`);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
