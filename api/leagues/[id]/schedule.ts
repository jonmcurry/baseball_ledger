/**
 * GET  /api/leagues/:id/schedule -- Fetch league schedule
 * POST /api/leagues/:id/schedule -- Start new season (generate lineups + schedule)
 *
 * GET: Optional query param ?day=N to filter by specific day.
 * POST: Commissioner-only. Validates via canStartSeason, then generates
 *       lineups from existing rosters and a new 162-game schedule.
 *       REQ-SCH-009: "rosters remain, new schedule generated"
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { ok, created } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { snakeToCamel } from '../../_lib/transform';
import { createServerClient } from '../../../src/lib/supabase/server';
import { generateAndInsertLineups } from '../../_lib/generate-lineup-rows';
import { generateAndInsertSchedule } from '../../_lib/generate-schedule-rows';
import { canStartSeason } from '../../../src/lib/validators/season-start';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, ['GET', 'POST'])) return;

  const requestId = crypto.randomUUID();
  try {
    const { userId } = await requireAuth(req);
    const leagueId = req.query.id as string;
    const supabase = createServerClient();

    if (req.method === 'POST') {
      await handleStartSeason(supabase, leagueId, userId, res, requestId);
      return;
    }

    // GET: fetch schedule
    const dayParam = req.query.day as string | undefined;

    let query = supabase
      .from('schedule')
      .select('*')
      .eq('league_id', leagueId)
      .order('day_number')
      .order('id');

    if (dayParam) {
      const day = parseInt(dayParam, 10);
      if (!isNaN(day)) {
        query = query.eq('day_number', day);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
    }

    ok(res, snakeToCamel(data ?? []), requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}

async function handleStartSeason(
  supabase: ReturnType<typeof createServerClient>,
  leagueId: string,
  userId: string,
  res: VercelResponse,
  requestId: string,
) {
  // 1. Fetch league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('commissioner_id, status, season_year')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: 'League not found' };
  }

  // 2. Commissioner check
  if (league.commissioner_id !== userId) {
    throw { category: 'AUTHORIZATION', code: 'NOT_COMMISSIONER', message: 'Only the commissioner can start a new season' };
  }

  // 3. Count rosters per team to find minimum roster size
  const { data: rosterCounts } = await supabase
    .from('rosters')
    .select('team_id, team_id.count()')
    .eq('league_id', leagueId);

  const teamRosterMap = new Map<string, number>();
  for (const row of (rosterCounts ?? []) as Array<{ team_id: string; count: number }>) {
    teamRosterMap.set(row.team_id, (teamRosterMap.get(row.team_id) ?? 0) + 1);
  }

  const teamCount = teamRosterMap.size;
  const minRosterSize = teamCount > 0 ? Math.min(...teamRosterMap.values()) : 0;

  // 4. Validate preconditions
  const check = canStartSeason(league.status, league.season_year, teamCount, minRosterSize);
  if (!check.canStart) {
    throw { category: 'VALIDATION', code: 'SEASON_START_BLOCKED', message: check.reason };
  }

  // 5. Generate lineups from existing rosters
  await generateAndInsertLineups(supabase, leagueId);

  // 6. Generate new schedule
  const scheduleResult = await generateAndInsertSchedule(supabase, leagueId);

  // 7. Transition to regular season
  await supabase
    .from('leagues')
    .update({ status: 'regular_season', current_day: 1 })
    .eq('id', leagueId);

  // 8. Respond
  created(res, {
    totalDays: scheduleResult.totalDays,
    totalGames: scheduleResult.totalGames,
  }, requestId, `/api/leagues/${leagueId}/schedule`);
}
