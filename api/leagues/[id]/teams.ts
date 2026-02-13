/**
 * GET   /api/leagues/:id/teams          -- List teams
 * GET   /api/leagues/:id/teams?tid=X&include=roster -- Get team roster
 * PATCH /api/leagues/:id/teams?tid=X    -- Update team metadata
 * PATCH /api/leagues/:id/teams?tid=X&include=roster -- Update lineup (REQ-RST-002)
 * POST  /api/leagues/:id/teams          -- Execute a roster transaction (add/drop/trade)
 *
 * REQ-RST-002: Lineup management (save lineup order, positions, roster slots).
 * REQ-RST-005: Trade between two teams with atomic roster swap.
 * REQ-RST-006: Both rosters must remain valid after trade.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { ok, created } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { snakeToCamel, camelToSnake } from '../../_lib/transform';
import { createServerClient } from '../../../src/lib/supabase/server';
import type { Database, Json } from '../../../src/lib/types/database';
import { validateTradeRosters } from '../../../src/lib/draft/trade-validator';
import { transformTransactionRows } from '../../../src/lib/transforms/transaction-transform';
import { buildTradeEvalRequest } from '../../../src/lib/transforms/trade-eval-request-builder';
import { evaluateTradeTemplate } from '../../../src/lib/ai/template-trade-eval';
import { MANAGER_PROFILES } from '../../../src/lib/simulation/manager-profiles';
import type { ManagerStyle } from '../../../src/lib/simulation/manager-profiles';
import type { RosterEntry } from '../../../src/lib/types/roster';
import type { PlayerCard } from '../../../src/lib/types/player';

const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  city: z.string().min(1).max(100).optional(),
  managerProfile: z.enum(['conservative', 'aggressive', 'balanced', 'analytical']).optional(),
});

const LineupUpdateSchema = z.object({
  updates: z.array(z.object({
    rosterId: z.string().uuid(),
    lineupOrder: z.number().int().min(1).max(9).nullable(),
    lineupPosition: z.enum([
      'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'OF', 'DH',
    ]).nullable(),
    rosterSlot: z.enum(['starter', 'bench', 'rotation', 'bullpen']),
  })),
});

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
  targetTeamId: z.string().uuid().optional(),
  playersFromMe: z.array(z.string()).optional().default([]),
  playersFromThem: z.array(z.string()).optional().default([]),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, ['GET', 'PATCH', 'POST'])) return;

  const requestId = crypto.randomUUID();
  try {
    const leagueId = req.query.id as string;
    const tid = req.query.tid as string | undefined;
    const include = req.query.include as string | undefined;

    if (req.method === 'GET') {
      await requireAuth(req);
      const supabase = createServerClient();

      if (include === 'history') {
        // REQ-RST-005: Transaction history
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('league_id', leagueId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
        }

        const entries = transformTransactionRows(data ?? []);
        ok(res, entries, requestId);
        return;
      }

      if (tid && include === 'roster') {
        // Get roster for a specific team
        const { data, error } = await supabase
          .from('rosters')
          .select('*')
          .eq('team_id', tid)
          .order('lineup_order', { nullsFirst: false });

        if (error) {
          throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
        }

        ok(res, snakeToCamel(data ?? []), requestId);
      } else {
        // List all teams
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .eq('league_id', leagueId)
          .order('league_division')
          .order('division')
          .order('wins', { ascending: false });

        if (error) {
          throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
        }

        ok(res, snakeToCamel(data ?? []), requestId);
      }
    } else if (req.method === 'POST') {
      await handleTransaction(req, res, requestId);
    } else {
      // PATCH
      const { userId } = await requireAuth(req);
      const teamId = tid as string;

      if (include === 'roster') {
        await handleLineupUpdate(req, res, userId, teamId, requestId);
      } else {
        // Update team metadata
        const body = validateBody(req, UpdateTeamSchema);

        const supabase = createServerClient();

        // Verify ownership
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('*, leagues!inner(commissioner_id)')
          .eq('id', teamId)
          .single();

        if (teamError || !team) {
          throw { category: 'NOT_FOUND', code: 'TEAM_NOT_FOUND', message: `Team ${teamId} not found` };
        }

        const teamData = team as unknown as { owner_id: string; leagues: { commissioner_id: string } };
        const isOwner = teamData.owner_id === userId;
        const isCommissioner = teamData.leagues.commissioner_id === userId;

        if (!isOwner && !isCommissioner) {
          throw { category: 'AUTHORIZATION', code: 'NOT_TEAM_OWNER', message: 'Only the team owner or commissioner can update this team' };
        }

        const updateData = camelToSnake(body) as Record<string, unknown>;
        const { data: updated, error: updateError } = await supabase
          .from('teams')
          .update(updateData as Database['public']['Tables']['teams']['Update'])
          .eq('id', teamId)
          .select('*')
          .single();

        if (updateError || !updated) {
          throw { category: 'DATA', code: 'UPDATE_FAILED', message: updateError?.message ?? 'Update failed' };
        }

        ok(res, snakeToCamel(updated), requestId);
      }
    }
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}

// ---------- PATCH: Lineup update (REQ-RST-002) ----------

async function handleLineupUpdate(
  req: VercelRequest,
  res: VercelResponse,
  userId: string,
  teamId: string,
  requestId: string,
): Promise<void> {
  const body = validateBody(req, LineupUpdateSchema);
  const supabase = createServerClient();

  // Verify ownership (owner OR commissioner)
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*, leagues!inner(commissioner_id)')
    .eq('id', teamId)
    .single();

  if (teamError || !team) {
    throw { category: 'NOT_FOUND', code: 'TEAM_NOT_FOUND', message: `Team ${teamId} not found` };
  }

  const teamData = team as unknown as { owner_id: string; leagues: { commissioner_id: string } };
  const isOwner = teamData.owner_id === userId;
  const isCommissioner = teamData.leagues.commissioner_id === userId;

  if (!isOwner && !isCommissioner) {
    throw { category: 'AUTHORIZATION', code: 'NOT_TEAM_OWNER', message: 'Only the team owner or commissioner can update this team' };
  }

  if (body.updates.length > 0) {
    // Verify all roster IDs belong to this team
    const { data: rosterRows } = await supabase
      .from('rosters')
      .select('id')
      .eq('team_id', teamId);

    const validIds = new Set((rosterRows ?? []).map((r: Record<string, unknown>) => r.id as string));
    for (const update of body.updates) {
      if (!validIds.has(update.rosterId)) {
        throw {
          category: 'VALIDATION',
          code: 'INVALID_ROSTER_ID',
          message: `Roster entry ${update.rosterId} does not belong to team ${teamId}`,
        };
      }
    }

    // Apply updates
    for (const update of body.updates) {
      await supabase
        .from('rosters')
        .update({
          roster_slot: update.rosterSlot,
          lineup_order: update.lineupOrder,
          lineup_position: update.lineupPosition,
        })
        .eq('id', update.rosterId);
    }
  }

  // Re-fetch and return full roster
  const { data: roster, error: rosterError } = await supabase
    .from('rosters')
    .select('*')
    .eq('team_id', teamId)
    .order('lineup_order', { nullsFirst: false });

  if (rosterError) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: rosterError.message };
  }

  ok(res, snakeToCamel(roster ?? []), requestId);
}

// ---------- POST: Roster transactions (add/drop/trade) ----------

async function handleTransaction(req: VercelRequest, res: VercelResponse, requestId: string) {
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

    // REQ-RST-005: Return all seasons of dropped players to the pool
    for (const playerId of body.playersToDrop) {
      await supabase
        .from('player_pool')
        .update({ is_drafted: false, drafted_by_team_id: null })
        .eq('league_id', leagueId)
        .eq('player_id', playerId);
    }
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
        player_card: player.playerCard as unknown as Json,
        roster_slot: determineRosterSlot(player.playerCard),
      });

    if (insertError) {
      throw { category: 'DATA', code: 'INSERT_FAILED', message: insertError.message };
    }
    addedPlayers.push({ playerId: player.playerId, playerName: player.playerName });

    // REQ-RST-005/REQ-DFT-001a: Mark all seasons of this player as drafted
    await supabase
      .from('player_pool')
      .update({ is_drafted: true, drafted_by_team_id: body.teamId })
      .eq('league_id', leagueId)
      .eq('player_id', player.playerId);
  }

  const result = {
    transactionId: crypto.randomUUID(),
    type: body.type,
    teamId: body.teamId,
    playersAdded: addedPlayers,
    playersDropped: body.playersToDrop.map((id) => ({ playerId: id, playerName: '' })),
    completedAt: new Date().toISOString(),
  };

  // REQ-RST-005: Log transaction for audit history
  await supabase.from('transactions').insert({
    league_id: leagueId,
    team_id: body.teamId,
    type: body.type,
    details: {
      playersAdded: addedPlayers,
      playersDropped: body.playersToDrop,
    } as unknown as Json,
  });

  created(res, result, requestId, `/api/leagues/${leagueId}/teams`);
}

async function handleTrade(
  supabase: ReturnType<typeof createServerClient>,
  body: z.infer<typeof TransactionSchema>,
  leagueId: string,
  requestId: string,
  res: VercelResponse,
): Promise<void> {
  if (!body.targetTeamId || body.playersFromMe.length === 0 || body.playersFromThem.length === 0) {
    throw {
      category: 'VALIDATION',
      code: 'MISSING_TRADE_FIELDS',
      message: 'Trade requires targetTeamId and players on both sides',
    };
  }

  const { data: targetTeam, error: targetError } = await supabase
    .from('teams')
    .select('id, owner_id, league_id, manager_profile, name, city')
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

  // REQ-RST-005, REQ-AI-006: CPU trade auto-evaluation
  if (targetTeam.owner_id === null) {
    const managerStyle = (targetTeam.manager_profile ?? 'balanced') as ManagerStyle;
    const managerName = MANAGER_PROFILES[managerStyle].name;
    const teamName = `${targetTeam.city} ${targetTeam.name}`;

    const evalRequest = buildTradeEvalRequest({
      managerStyle,
      managerName,
      teamName,
      rosterA: entriesA,
      rosterB: entriesB,
      playersFromA: body.playersFromMe,
      playersFromB: body.playersFromThem,
    });

    const evaluation = evaluateTradeTemplate(evalRequest);

    if (evaluation.recommendation !== 'accept') {
      await supabase.from('transactions').insert({
        league_id: leagueId,
        team_id: body.teamId,
        type: 'trade',
        details: {
          targetTeamId: body.targetTeamId,
          playersFromMe: body.playersFromMe,
          playersFromThem: body.playersFromThem,
          status: 'rejected',
          evaluation,
        } as unknown as Json,
      });

      throw {
        category: 'CONFLICT' as const,
        code: 'TRADE_REJECTED',
        message: evaluation.reasoning,
      };
    }
  }

  const fromMeSet = new Set(body.playersFromMe);
  const fromThemSet = new Set(body.playersFromThem);

  const rowsLeavingA = (rosterARows ?? []).filter(
    (r: Record<string, unknown>) => fromMeSet.has(r.player_id as string),
  );
  const rowsLeavingB = (rosterBRows ?? []).filter(
    (r: Record<string, unknown>) => fromThemSet.has(r.player_id as string),
  );

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

  for (const row of rowsLeavingA) {
    await supabase.from('rosters').insert({
      team_id: body.targetTeamId!,
      player_id: row.player_id as string,
      season_year: row.season_year as number,
      player_card: row.player_card as Json,
      roster_slot: determineRosterSlot(row.player_card as Record<string, unknown>),
    });
  }
  for (const row of rowsLeavingB) {
    await supabase.from('rosters').insert({
      team_id: body.teamId,
      player_id: row.player_id as string,
      season_year: row.season_year as number,
      player_card: row.player_card as Json,
      roster_slot: determineRosterSlot(row.player_card as Record<string, unknown>),
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

  // REQ-RST-005: Log trade for audit history
  await supabase.from('transactions').insert({
    league_id: leagueId,
    team_id: body.teamId,
    type: 'trade',
    details: {
      targetTeamId: body.targetTeamId,
      playersFromMe: body.playersFromMe,
      playersFromThem: body.playersFromThem,
    } as unknown as Json,
  });

  created(res, result, requestId, `/api/leagues/${leagueId}/teams`);
}

/**
 * Determine the correct roster_slot for an added player based on their card data.
 * Pitchers go to rotation/bullpen based on their pitching role;
 * position players go to bench.
 */
function determineRosterSlot(playerCard: Record<string, unknown>): 'bench' | 'rotation' | 'bullpen' {
  if (!playerCard.isPitcher) return 'bench';
  const pitching = playerCard.pitching as { role?: string } | undefined;
  if (!pitching?.role) return 'bullpen';
  return pitching.role === 'SP' ? 'rotation' : 'bullpen';
}

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
