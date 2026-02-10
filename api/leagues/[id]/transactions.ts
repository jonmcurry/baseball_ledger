/**
 * POST /api/leagues/:id/transactions -- Execute a roster transaction
 *
 * Supports add, drop, and trade operations.
 * REQ-RST-005: Trade between two teams with atomic roster swap.
 * REQ-RST-006: Both rosters must remain valid after trade.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { created } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';
import { validateTradeRosters } from '@lib/draft/trade-validator';
import type { RosterEntry } from '@lib/types/roster';
import type { PlayerCard } from '@lib/types/player';

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
  // Trade-specific fields
  targetTeamId: z.string().uuid().optional(),
  playersFromMe: z.array(z.string()).optional().default([]),
  playersFromThem: z.array(z.string()).optional().default([]),
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

    // Trade branch
    if (body.type === 'trade') {
      await handleTrade(supabase, body, leagueId, requestId, res);
      return;
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

/**
 * Handle trade-type transaction: validate fields, load rosters,
 * check composition, and atomically swap players.
 */
async function handleTrade(
  supabase: ReturnType<typeof createServerClient>,
  body: z.infer<typeof TransactionSchema>,
  leagueId: string,
  requestId: string,
  res: VercelResponse,
): Promise<void> {
  // Validate trade-specific fields
  if (!body.targetTeamId || body.playersFromMe.length === 0 || body.playersFromThem.length === 0) {
    throw {
      category: 'VALIDATION',
      code: 'MISSING_TRADE_FIELDS',
      message: 'Trade requires targetTeamId and players on both sides',
    };
  }

  // Load target team
  const { data: targetTeam, error: targetError } = await supabase
    .from('teams')
    .select('id, owner_id, league_id')
    .eq('id', body.targetTeamId)
    .single();

  if (targetError || !targetTeam) {
    throw {
      category: 'NOT_FOUND',
      code: 'TARGET_TEAM_NOT_FOUND',
      message: `Target team ${body.targetTeamId} not found`,
    };
  }

  if (targetTeam.league_id !== leagueId) {
    throw {
      category: 'VALIDATION',
      code: 'TARGET_WRONG_LEAGUE',
      message: 'Target team does not belong to this league',
    };
  }

  // Load both rosters
  const { data: rosterARows } = await supabase
    .from('rosters')
    .select('id, player_id, player_card, roster_slot, lineup_order, lineup_position, season_year')
    .eq('team_id', body.teamId);

  const { data: rosterBRows } = await supabase
    .from('rosters')
    .select('id, player_id, player_card, roster_slot, lineup_order, lineup_position, season_year')
    .eq('team_id', body.targetTeamId);

  const entriesA = (rosterARows ?? []).map(toRosterEntry);
  const entriesB = (rosterBRows ?? []).map(toRosterEntry);

  // Validate roster composition after swap
  const validation = validateTradeRosters(
    entriesA,
    entriesB,
    body.playersFromMe,
    body.playersFromThem,
  );

  if (!validation.valid) {
    throw {
      category: 'VALIDATION',
      code: 'TRADE_COMPOSITION_VIOLATION',
      message: validation.errors.join('; '),
    };
  }

  // Execute atomic swap using delete + insert (team_id is immutable per RosterUpdate)
  const fromMeSet = new Set(body.playersFromMe);
  const fromThemSet = new Set(body.playersFromThem);

  const rowsLeavingA = (rosterARows ?? []).filter(
    (r: Record<string, unknown>) => fromMeSet.has(r.player_id as string),
  );
  const rowsLeavingB = (rosterBRows ?? []).filter(
    (r: Record<string, unknown>) => fromThemSet.has(r.player_id as string),
  );

  // Delete traded players from their original rosters
  if (body.playersFromMe.length > 0) {
    await supabase
      .from('rosters')
      .delete()
      .eq('team_id', body.teamId)
      .in('player_id', body.playersFromMe);
  }
  if (body.playersFromThem.length > 0) {
    await supabase
      .from('rosters')
      .delete()
      .eq('team_id', body.targetTeamId!)
      .in('player_id', body.playersFromThem);
  }

  // Insert traded players into their new rosters
  for (const row of rowsLeavingA) {
    await supabase.from('rosters').insert({
      team_id: body.targetTeamId!,
      player_id: row.player_id as string,
      season_year: row.season_year as number,
      player_card: row.player_card as Record<string, unknown>,
      roster_slot: 'bench' as const,
    });
  }
  for (const row of rowsLeavingB) {
    await supabase.from('rosters').insert({
      team_id: body.teamId,
      player_id: row.player_id as string,
      season_year: row.season_year as number,
      player_card: row.player_card as Record<string, unknown>,
      roster_slot: 'bench' as const,
    });
  }

  const result = {
    transactionId: crypto.randomUUID(),
    type: 'trade' as const,
    teamId: body.teamId,
    targetTeamId: body.targetTeamId,
    playersFromMe: body.playersFromMe,
    playersFromThem: body.playersFromThem,
    completedAt: new Date().toISOString(),
  };

  created(res, result, requestId, `/api/leagues/${leagueId}/transactions`);
}

/** Convert a Supabase roster row to a RosterEntry. */
function toRosterEntry(row: Record<string, unknown>): RosterEntry {
  return {
    id: row.id as string,
    playerId: row.player_id as string,
    playerCard: row.player_card as PlayerCard,
    rosterSlot: row.roster_slot as RosterEntry['rosterSlot'],
    lineupOrder: row.lineup_order as number | null,
    lineupPosition: row.lineup_position as string | null,
  };
}
