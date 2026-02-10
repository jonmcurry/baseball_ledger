/**
 * GET  /api/leagues/:id/draft -- Get draft state
 * POST /api/leagues/:id/draft -- Start draft (action=start) or submit pick (action=pick)
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
}

// ---------- POST action=pick: Submit pick ----------

async function handlePick(req: VercelRequest, res: VercelResponse, requestId: string) {
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
      } else {
        res.status(400).json({
          error: {
            code: 'INVALID_ACTION',
            message: 'Invalid or missing action. Valid actions: start, pick',
          },
        });
      }
    }
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
