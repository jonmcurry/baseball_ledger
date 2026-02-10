/**
 * GET  /api/leagues/:id/draft -- Get draft state
 * POST /api/leagues/:id/draft -- Start draft (action=start), submit pick (action=pick),
 *                                 or auto-pick (action=auto-pick)
 *
 * REQ-DFT-001: 21-round snake draft.
 * REQ-DFT-002: Randomized order, reverses each round.
 *
 * Consolidated draft endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { ok, created } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';
import { generateDraftOrder, getPickingTeam, getNextPick, TOTAL_ROUNDS } from '@lib/draft/draft-order';
import { SeededRNG } from '@lib/rng/seeded-rng';

// ---------- Schemas ----------

const DraftPickSchema = z.object({
  action: z.literal('pick'),
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  position: z.string().min(1),
  seasonYear: z.number().int(),
  playerCard: z.record(z.string(), z.unknown()),
});

const DraftStartSchema = z.object({
  action: z.literal('start'),
});

// ---------- GET: Draft state ----------

async function handleGetState(req: VercelRequest, res: VercelResponse, requestId: string) {
  await requireAuth(req);
  const leagueId = req.query.id as string;
  const supabase = createServerClient();

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('status, team_count')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
  }

  // Count total picks made
  const { count: pickCount } = await supabase
    .from('rosters')
    .select('*', { count: 'exact', head: true })
    .in('team_id', (
      await supabase.from('teams').select('id').eq('league_id', leagueId)
    ).data?.map((t) => t.id) ?? []);

  const totalRounds = 21;
  const totalPicks = pickCount ?? 0;
  const currentRound = Math.floor(totalPicks / league.team_count) + 1;
  const currentPick = (totalPicks % league.team_count) + 1;

  ok(res, {
    leagueId,
    status: league.status === 'drafting' ? 'in_progress' : league.status === 'setup' ? 'not_started' : 'completed',
    currentRound: Math.min(currentRound, totalRounds),
    currentPick,
    totalRounds,
    totalPicks,
  }, requestId);
}

// ---------- POST action=start: Start draft ----------

async function handleStart(req: VercelRequest, res: VercelResponse, requestId: string) {
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

  // Fetch team IDs and generate randomized draft order (REQ-DFT-002)
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId);

  if (teamsError || !teams || teams.length === 0) {
    throw { category: 'VALIDATION', code: 'NO_TEAMS', message: 'No teams found in league' };
  }

  const teamIds = teams.map((t) => t.id);
  const rng = new SeededRNG(Date.now());
  const draftOrder = generateDraftOrder(teamIds, rng);

  const { error: updateError } = await supabase
    .from('leagues')
    .update({ status: 'drafting', draft_order: draftOrder })
    .eq('id', leagueId);

  if (updateError) {
    throw { category: 'DATA', code: 'UPDATE_FAILED', message: updateError.message };
  }

  ok(res, {
    leagueId,
    status: 'in_progress',
    currentRound: 1,
    currentPick: 1,
    draftOrder,
  }, requestId);
}

// ---------- POST action=pick: Submit pick ----------

async function handlePick(req: VercelRequest, res: VercelResponse, requestId: string) {
  const { userId } = await requireAuth(req);
  const leagueId = req.query.id as string;
  const body = validateBody(req, DraftPickSchema);

  const supabase = createServerClient();

  // Verify league is in drafting status and get draft order
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('status, team_count, draft_order')
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

  // Validate turn order if draft_order is available (REQ-DFT-002)
  if (league.draft_order && Array.isArray(league.draft_order)) {
    const draftOrder = league.draft_order as string[];
    const teamCount = draftOrder.length;

    // Count existing picks to determine current position
    const { count: pickCount } = await supabase
      .from('rosters')
      .select('*', { count: 'exact', head: true })
      .in('team_id', draftOrder);

    const totalPicks = pickCount ?? 0;
    const currentRound = Math.floor(totalPicks / teamCount) + 1;
    const currentPick = (totalPicks % teamCount) + 1;

    const expectedTeamId = getPickingTeam(currentRound, currentPick, draftOrder);
    if (userTeam.id !== expectedTeamId) {
      throw {
        category: 'VALIDATION',
        code: 'NOT_YOUR_TURN',
        message: `It is not your turn to pick. Expected team: ${expectedTeamId}`,
      };
    }
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

  // Mark player as drafted in player_pool (all seasons of this physical player)
  // Non-fatal: pool update failure does not fail the pick
  await supabase
    .from('player_pool')
    .update({ is_drafted: true, drafted_by_team_id: userTeam.id })
    .eq('league_id', leagueId)
    .eq('player_id', body.playerId);

  // Check if draft is complete after this pick
  let isComplete = false;
  if (league.draft_order && Array.isArray(league.draft_order)) {
    const draftOrder = league.draft_order as string[];
    const teamCount = draftOrder.length;
    const { count: newPickCount } = await supabase
      .from('rosters')
      .select('*', { count: 'exact', head: true })
      .in('team_id', draftOrder);

    const totalAfter = newPickCount ?? 0;
    const roundAfter = Math.floor(totalAfter / teamCount) + 1;
    const pickAfter = (totalAfter % teamCount) + 1;
    const next = getNextPick(
      Math.floor((totalAfter - 1) / teamCount) + 1,
      ((totalAfter - 1) % teamCount) + 1,
      TOTAL_ROUNDS,
      teamCount,
    );

    if (next === null) {
      isComplete = true;
      await supabase
        .from('leagues')
        .update({ status: 'regular_season' })
        .eq('id', leagueId);
    }
  }

  created(res, {
    teamId: userTeam.id,
    playerId: body.playerId,
    playerName: body.playerName,
    position: body.position,
    isComplete,
  }, requestId, `/api/leagues/${leagueId}/teams/${userTeam.id}/roster`);
}

// ---------- POST action=auto-pick: Timer-expired auto-pick ----------

const AutoPickSchema = z.object({
  action: z.literal('auto-pick'),
});

async function handleAutoPick(req: VercelRequest, res: VercelResponse, requestId: string) {
  const { userId } = await requireAuth(req);
  const leagueId = req.query.id as string;
  const supabase = createServerClient();

  // Verify league and commissioner
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('commissioner_id, status, team_count, draft_order')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
  }

  if (league.commissioner_id !== userId) {
    throw { category: 'AUTHORIZATION', code: 'NOT_COMMISSIONER', message: 'Only the commissioner can trigger auto-pick' };
  }

  if (league.status !== 'drafting') {
    throw { category: 'VALIDATION', code: 'NOT_DRAFTING', message: 'League is not in drafting status' };
  }

  if (!league.draft_order || !Array.isArray(league.draft_order)) {
    throw { category: 'VALIDATION', code: 'NO_DRAFT_ORDER', message: 'Draft order not yet generated. Start the draft first.' };
  }

  ok(res, {
    leagueId,
    action: 'auto-pick',
    status: 'triggered',
  }, requestId);
}

// ---------- Main handler ----------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, ['GET', 'POST'])) return;

  const requestId = crypto.randomUUID();
  try {
    if (req.method === 'GET') {
      await handleGetState(req, res, requestId);
    } else {
      // POST -- determine action from body
      const body = req.body as Record<string, unknown> | null;
      const action = body?.action as string | undefined;

      if (action === 'start') {
        await handleStart(req, res, requestId);
      } else if (action === 'pick') {
        await handlePick(req, res, requestId);
      } else if (action === 'auto-pick') {
        await handleAutoPick(req, res, requestId);
      } else {
        res.status(400).json({
          error: {
            code: 'INVALID_ACTION',
            message: 'Invalid or missing action. Valid actions: start, pick, auto-pick',
          },
        });
      }
    }
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
