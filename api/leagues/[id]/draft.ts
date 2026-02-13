/**
 * GET  /api/leagues/:id/draft                  -- Get draft state
 * GET  /api/leagues/:id/draft?resource=players -- Fetch player pool (paginated)
 * POST /api/leagues/:id/draft                  -- Start draft (action=start), submit pick (action=pick),
 *                                                  or auto-pick (action=auto-pick)
 *
 * REQ-DFT-001: 21-round snake draft.
 * REQ-DFT-002: Randomized order, reverses each round.
 * REQ-DATA-002: Player pool accessible for draft board.
 *
 * Consolidated draft endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { ok, created, paginated } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '../../../src/lib/supabase/server';
import type { Json } from '../../../src/lib/types/database';
import { generateDraftOrder, getPickingTeam, getNextPick, TOTAL_ROUNDS } from '../../../src/lib/draft/draft-order';
import { selectAIPick, type DraftablePlayer } from '../../../src/lib/draft/ai-strategy';
import type { PlayerCard, MlbBattingStats } from '../../../src/lib/types/player';
import { SeededRNG } from '../../../src/lib/rng/seeded-rng';
import { generateAndInsertSchedule } from '../../_lib/generate-schedule-rows';
import { generateAndInsertLineups } from '../../_lib/generate-lineup-rows';

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

// ---------- CPU auto-pick helper ----------

interface CpuPicksResult {
  picksMade: number;
  isComplete: boolean;
  nextRound: number;
  nextPick: number;
  nextTeamId: string | null;
}

/**
 * Convert a player pool row to a DraftablePlayer for AI strategy.
 */
function toDraftablePlayer(row: { player_card: unknown }): DraftablePlayer {
  const card = row.player_card as PlayerCard;
  const mlbStats = card.mlbBattingStats as MlbBattingStats | undefined;
  return {
    card,
    ops: mlbStats?.OPS ?? 0,
    sb: mlbStats?.SB ?? 0,
  };
}

/**
 * Process all consecutive CPU team picks starting from the current draft position.
 * Loops until a human-owned team's turn is reached or the draft completes.
 *
 * REQ-DFT-004: CPU teams auto-select using round-aware AI strategy.
 * REQ-DFT-006: Round-based priorities (early: SP/elite, mid: rotation/premium, late: relievers).
 */
async function processCpuPicks(
  supabase: ReturnType<typeof createServerClient>,
  leagueId: string,
  draftOrder: string[],
): Promise<CpuPicksResult> {
  const teamCount = draftOrder.length;
  let picksMade = 0;
  const rng = new SeededRNG(Date.now());

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Count existing picks to determine current position
    const { count: pickCount } = await supabase
      .from('rosters')
      .select('*', { count: 'exact', head: true })
      .in('team_id', draftOrder);

    const totalPicks = pickCount ?? 0;
    const currentRound = Math.floor(totalPicks / teamCount) + 1;
    const currentPick = (totalPicks % teamCount) + 1;

    // Draft complete?
    if (currentRound > TOTAL_ROUNDS) {
      await generateAndInsertLineups(supabase, leagueId);
      await generateAndInsertSchedule(supabase, leagueId);
      await supabase.from('leagues').update({ status: 'regular_season' }).eq('id', leagueId);
      return { picksMade, isComplete: true, nextRound: TOTAL_ROUNDS, nextPick: teamCount, nextTeamId: null };
    }

    const currentTeamId = getPickingTeam(currentRound, currentPick, draftOrder);

    // Check if team is CPU-controlled (owner_id is null)
    const { data: team } = await supabase
      .from('teams')
      .select('id, owner_id')
      .eq('id', currentTeamId)
      .single();

    if (!team || team.owner_id !== null) {
      // Human team's turn -- stop processing
      return { picksMade, isComplete: false, nextRound: currentRound, nextPick: currentPick, nextTeamId: currentTeamId };
    }

    // Fetch team's current roster for position needs calculation
    const { data: rosterRows } = await supabase
      .from('rosters')
      .select('player_card')
      .eq('team_id', currentTeamId);

    const roster: DraftablePlayer[] = (rosterRows ?? []).map(toDraftablePlayer);

    // CPU team: fetch top-valued undrafted players for AI evaluation.
    // ORDER BY valuation_score DESC ensures the AI sees the best candidates
    // regardless of insertion order. LIMIT 500 covers all positions adequately
    // while avoiding fetching 55K+ JSONB rows.
    const { data: available } = await supabase
      .from('player_pool')
      .select('*')
      .eq('league_id', leagueId)
      .eq('is_drafted', false)
      .order('valuation_score', { ascending: false })
      .limit(500);

    if (!available || available.length === 0) {
      return { picksMade, isComplete: false, nextRound: currentRound, nextPick: currentPick, nextTeamId: currentTeamId };
    }

    // Convert to DraftablePlayer format for AI strategy
    const pool: DraftablePlayer[] = available.map(toDraftablePlayer);

    // Use AI strategy to select pick based on round and team needs
    const selected = selectAIPick(currentRound, roster, pool, rng);

    // Find the original row for the selected player
    const selectedIdx = available.findIndex(
      (row) => (row.player_card as unknown as PlayerCard).playerId === selected.card.playerId
        && (row.player_card as unknown as PlayerCard).seasonYear === selected.card.seasonYear
    );
    if (selectedIdx < 0) break;

    const best = available[selectedIdx];

    // Insert roster entry for CPU team
    const { error: insertError } = await supabase
      .from('rosters')
      .insert({
        team_id: currentTeamId,
        player_id: best.player_id,
        season_year: best.season_year,
        player_card: best.player_card,
        roster_slot: 'bench',
      });

    if (insertError) {
      // If duplicate key, skip this player and try again next iteration
      if (insertError.code === '23505') continue;
      break;
    }

    // Mark player as drafted
    await supabase
      .from('player_pool')
      .update({ is_drafted: true, drafted_by_team_id: currentTeamId })
      .eq('league_id', leagueId)
      .eq('player_id', best.player_id);

    picksMade++;
  }

  // Fallback (should not normally reach here)
  return { picksMade, isComplete: false, nextRound: 1, nextPick: 1, nextTeamId: null };
}

// ---------- GET ?resource=players: Player pool ----------

const SORT_COLUMN_MAP: Record<string, string> = {
  nameLast: 'player_card->nameLast',
  seasonYear: 'season_year',
  primaryPosition: 'player_card->primaryPosition',
  valuation: 'valuation_score',
};

async function handleGetPlayers(req: VercelRequest, res: VercelResponse, requestId: string) {
  await requireAuth(req);
  const leagueId = req.query.id as string;
  const drafted = req.query.drafted === 'true';
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(req.query.pageSize as string, 10) || 100));
  const position = req.query.position as string | undefined;
  const search = req.query.search as string | undefined;
  const sortBy = (req.query.sortBy as string) || 'nameLast';
  const sortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';

  const supabase = createServerClient();

  let query = supabase
    .from('player_pool')
    .select('*', { count: 'exact' })
    .eq('league_id', leagueId)
    .eq('is_drafted', drafted);

  if (position) {
    if (position === 'OF') {
      // Match all outfield positions (generic OF plus specific LF/CF/RF)
      query = query.in('player_card->>primaryPosition', ['OF', 'LF', 'CF', 'RF']);
    } else {
      query = query.eq('player_card->>primaryPosition', position);
    }
  }

  if (search) {
    query = query.or(
      `player_card->>nameFirst.ilike.%${search}%,player_card->>nameLast.ilike.%${search}%`,
    );
  }

  const sortColumn = SORT_COLUMN_MAP[sortBy] || 'player_card->nameLast';
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
  // Secondary sort by season year for stable ordering within same name/position
  if (sortColumn !== 'season_year') {
    query = query.order('season_year', { ascending: true });
  }

  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
  }

  paginated(res, data ?? [], { page, pageSize, totalRows: count ?? 0 }, requestId);
}

// ---------- GET: Draft state ----------

async function handleGetState(req: VercelRequest, res: VercelResponse, requestId: string) {
  await requireAuth(req);
  const leagueId = req.query.id as string;
  const supabase = createServerClient();

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('status, team_count, draft_order')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
  }

  // Get all teams in this league
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId);

  const teamIds = teams?.map((t) => t.id) ?? [];

  // Count total picks made
  const { count: pickCount } = await supabase
    .from('rosters')
    .select('*', { count: 'exact', head: true })
    .in('team_id', teamIds);

  const totalRounds = 21;
  const totalPicks = pickCount ?? 0;
  const currentRound = Math.floor(totalPicks / league.team_count) + 1;
  const currentPick = (totalPicks % league.team_count) + 1;

  // REQ-DFT-004: Compute currentTeamId from draft order
  let currentTeamId: string | null = null;
  const hasDraftOrder = league.draft_order && Array.isArray(league.draft_order);
  const draftOrder = hasDraftOrder ? (league.draft_order as string[]) : [];
  if (league.status === 'drafting' && hasDraftOrder) {
    currentTeamId = getPickingTeam(Math.min(currentRound, totalRounds), currentPick, draftOrder);
  }

  // Fetch all roster entries ordered by created_at for accurate pick order
  const { data: rosterEntries } = await supabase
    .from('rosters')
    .select('id, team_id, player_id, player_card, created_at')
    .in('team_id', teamIds)
    .order('created_at', { ascending: true });

  // Build picks array from roster entries
  const teamCount = hasDraftOrder ? draftOrder.length : league.team_count;
  const picks = (rosterEntries ?? []).map((entry, index) => {
    const card = entry.player_card as { nameFirst?: string; nameLast?: string; primaryPosition?: string };
    const round = Math.floor(index / teamCount) + 1;
    const pick = (index % teamCount) + 1;
    return {
      round,
      pick,
      teamId: entry.team_id,
      playerId: entry.player_id,
      playerName: `${card.nameFirst ?? ''} ${card.nameLast ?? ''}`.trim(),
      position: card.primaryPosition ?? 'UT',
      isComplete: false,
      nextTeamId: null as string | null,
    };
  });

  ok(res, {
    leagueId,
    status: league.status === 'drafting' ? 'in_progress' : league.status === 'setup' ? 'not_started' : 'completed',
    currentRound: Math.min(currentRound, totalRounds),
    currentPick,
    currentTeamId,
    picks,
    totalRounds,
    totalPicks,
    pickTimerSeconds: 60,
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

  // REQ-DFT-004: Process any initial CPU picks before returning
  const cpuResult = await processCpuPicks(supabase, leagueId, draftOrder);

  ok(res, {
    leagueId,
    status: cpuResult.isComplete ? 'completed' : 'in_progress',
    currentRound: cpuResult.nextRound,
    currentPick: cpuResult.nextPick,
    currentTeamId: cpuResult.nextTeamId,
    draftOrder,
    cpuPicksProcessed: cpuResult.picksMade,
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

  // Compute current pick position for turn validation and response
  const hasDraftOrder = league.draft_order && Array.isArray(league.draft_order);
  const draftOrder = hasDraftOrder ? (league.draft_order as string[]) : [];
  const teamCount = hasDraftOrder ? draftOrder.length : league.team_count;
  let currentRound = 1;
  let currentPick = 1;

  if (hasDraftOrder) {
    // Count existing picks to determine current position
    const { count: pickCount } = await supabase
      .from('rosters')
      .select('*', { count: 'exact', head: true })
      .in('team_id', draftOrder);

    const totalPicks = pickCount ?? 0;
    currentRound = Math.floor(totalPicks / teamCount) + 1;
    currentPick = (totalPicks % teamCount) + 1;

    // Validate turn order (REQ-DFT-002)
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
      player_card: body.playerCard as unknown as Json,
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

  // Compute next pick position without processing CPU picks synchronously.
  // The frontend triggers CPU processing separately via the auto-pick endpoint,
  // so the human pick response returns immediately (~1-2s instead of 5-15s).
  let isComplete = false;
  let nextTeamId: string | null = null;
  let nextRound = currentRound;
  let nextPick = currentPick;

  if (hasDraftOrder) {
    const next = getNextPick(currentRound, currentPick, TOTAL_ROUNDS, teamCount);
    if (next) {
      nextRound = next.round;
      nextPick = next.pick;
      nextTeamId = getPickingTeam(next.round, next.pick, draftOrder);
    } else {
      // Human made the final pick -- trigger draft completion
      isComplete = true;
      await generateAndInsertLineups(supabase, leagueId);
      await generateAndInsertSchedule(supabase, leagueId);
      await supabase.from('leagues').update({ status: 'regular_season' }).eq('id', leagueId);
    }
  }

  created(res, {
    round: currentRound,
    pick: currentPick,
    teamId: userTeam.id,
    playerId: body.playerId,
    playerName: body.playerName,
    position: body.position,
    isComplete,
    nextTeamId,
    nextRound,
    nextPick,
    cpuPicksPending: !isComplete && hasDraftOrder,
  }, requestId, `/api/leagues/${leagueId}/teams/${userTeam.id}/roster`);
}

// ---------- POST action=auto-pick: CPU processing + timer-expired human auto-pick ----------

async function handleAutoPick(req: VercelRequest, res: VercelResponse, requestId: string) {
  const { userId } = await requireAuth(req);
  const leagueId = req.query.id as string;
  const supabase = createServerClient();
  const body = req.body as Record<string, unknown> | null;
  const timerExpired = body?.timerExpired === true;

  // Verify league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('commissioner_id, status, team_count, draft_order')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
  }

  // Allow any team owner in the league (needed for timer-expired auto-picks
  // and post-human-pick CPU processing triggered from the frontend).
  const { data: userTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId)
    .eq('owner_id', userId)
    .single();

  if (!userTeam) {
    throw { category: 'AUTHORIZATION', code: 'NO_TEAM', message: 'You do not have a team in this league' };
  }

  if (league.status !== 'drafting') {
    throw { category: 'VALIDATION', code: 'NOT_DRAFTING', message: 'League is not in drafting status' };
  }

  if (!league.draft_order || !Array.isArray(league.draft_order)) {
    throw { category: 'VALIDATION', code: 'NO_DRAFT_ORDER', message: 'Draft order not yet generated. Start the draft first.' };
  }

  const draftOrder = league.draft_order as string[];
  const teamCount = draftOrder.length;
  let humanAutoPickMade = false;

  // When timerExpired is true and the current pick is a human team,
  // auto-pick for them using valuation-based AI strategy before processing CPU picks.
  if (timerExpired) {
    const { count: pickCount } = await supabase
      .from('rosters')
      .select('*', { count: 'exact', head: true })
      .in('team_id', draftOrder);

    const totalPicks = pickCount ?? 0;
    const currentRound = Math.floor(totalPicks / teamCount) + 1;
    const currentPick = (totalPicks % teamCount) + 1;

    if (currentRound <= TOTAL_ROUNDS) {
      const currentTeamId = getPickingTeam(currentRound, currentPick, draftOrder);

      const { data: currentTeam } = await supabase
        .from('teams')
        .select('id, owner_id')
        .eq('id', currentTeamId)
        .single();

      // Human team that timed out: auto-pick using valuation + AI strategy
      if (currentTeam && currentTeam.owner_id !== null) {
        const rng = new SeededRNG(Date.now());
        const { data: rosterRows } = await supabase
          .from('rosters')
          .select('player_card')
          .eq('team_id', currentTeamId);

        const roster: DraftablePlayer[] = (rosterRows ?? []).map(toDraftablePlayer);

        const { data: available } = await supabase
          .from('player_pool')
          .select('*')
          .eq('league_id', leagueId)
          .eq('is_drafted', false)
          .order('valuation_score', { ascending: false })
          .limit(500);

        if (available && available.length > 0) {
          const pool: DraftablePlayer[] = available.map(toDraftablePlayer);
          const selected = selectAIPick(currentRound, roster, pool, rng);
          const selectedIdx = available.findIndex(
            (row) => (row.player_card as unknown as PlayerCard).playerId === selected.card.playerId
              && (row.player_card as unknown as PlayerCard).seasonYear === selected.card.seasonYear
          );

          if (selectedIdx >= 0) {
            const best = available[selectedIdx];
            const { error: insertError } = await supabase
              .from('rosters')
              .insert({
                team_id: currentTeamId,
                player_id: best.player_id,
                season_year: best.season_year,
                player_card: best.player_card,
                roster_slot: 'bench',
              });

            if (!insertError) {
              await supabase
                .from('player_pool')
                .update({ is_drafted: true, drafted_by_team_id: currentTeamId })
                .eq('league_id', leagueId)
                .eq('player_id', best.player_id);
              humanAutoPickMade = true;
            }
          }
        }
      }
    }
  }

  // Process subsequent CPU team picks
  const cpuResult = await processCpuPicks(supabase, leagueId, draftOrder);

  ok(res, {
    leagueId,
    action: 'auto-pick',
    status: cpuResult.isComplete ? 'completed' : 'processed',
    cpuPicksProcessed: cpuResult.picksMade + (humanAutoPickMade ? 1 : 0),
    nextRound: cpuResult.nextRound,
    nextPick: cpuResult.nextPick,
    nextTeamId: cpuResult.nextTeamId,
  }, requestId);
}

// ---------- Main handler ----------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, ['GET', 'POST'])) return;

  const requestId = crypto.randomUUID();
  try {
    if (req.method === 'GET') {
      const resource = req.query.resource as string | undefined;
      if (resource === 'players') {
        await handleGetPlayers(req, res, requestId);
      } else {
        await handleGetState(req, res, requestId);
      }
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
