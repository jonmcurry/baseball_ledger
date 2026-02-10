/**
 * GET /api/leagues/:id/stats?type=batting|pitching|team|standings
 *
 * Consolidated stats endpoint. Dispatches based on `type` query parameter.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { ok, paginated } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { snakeToCamel } from '../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';

const PAGE_SIZE = 50;

async function handleBatting(req: VercelRequest, res: VercelResponse, requestId: string) {
  const leagueId = req.query.id as string;
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createServerClient();

  // Get total count
  const { count, error: countError } = await supabase
    .from('season_stats')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .not('batting_stats', 'is', null);

  if (countError) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: countError.message };
  }

  // Get paginated data
  const { data, error } = await supabase
    .from('season_stats')
    .select('player_id, team_id, batting_stats')
    .eq('league_id', leagueId)
    .not('batting_stats', 'is', null)
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
  }

  const leaders = (data ?? []).map((row) => ({
    player_id: row.player_id,
    team_id: row.team_id,
    stats: row.batting_stats,
  }));

  paginated(
    res,
    snakeToCamel(leaders) as unknown[],
    { page, pageSize: PAGE_SIZE, totalRows: count ?? 0 },
    requestId,
  );
}

async function handlePitching(req: VercelRequest, res: VercelResponse, requestId: string) {
  const leagueId = req.query.id as string;
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createServerClient();

  const { count, error: countError } = await supabase
    .from('season_stats')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .not('pitching_stats', 'is', null);

  if (countError) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: countError.message };
  }

  const { data, error } = await supabase
    .from('season_stats')
    .select('player_id, team_id, pitching_stats')
    .eq('league_id', leagueId)
    .not('pitching_stats', 'is', null)
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
  }

  const leaders = (data ?? []).map((row) => ({
    player_id: row.player_id,
    team_id: row.team_id,
    stats: row.pitching_stats,
  }));

  paginated(
    res,
    snakeToCamel(leaders) as unknown[],
    { page, pageSize: PAGE_SIZE, totalRows: count ?? 0 },
    requestId,
  );
}

async function handleTeam(req: VercelRequest, res: VercelResponse, requestId: string) {
  const leagueId = req.query.id as string;
  const supabase = createServerClient();

  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name, city, wins, losses, runs_scored, runs_allowed')
    .eq('league_id', leagueId);

  if (error) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
  }

  const teamStats = (teams ?? []).map((team) => ({
    team_id: team.id,
    team_name: team.name,
    runs_scored: team.runs_scored,
    runs_allowed: team.runs_allowed,
    run_differential: team.runs_scored - team.runs_allowed,
  }));

  ok(res, snakeToCamel(teamStats), requestId);
}

interface StandingsTeamRow {
  id: string;
  name: string;
  city: string;
  owner_id: string | null;
  manager_profile: string;
  league_division: string;
  division: string;
  wins: number;
  losses: number;
  runs_scored: number;
  runs_allowed: number;
}

async function handleStandings(req: VercelRequest, res: VercelResponse, requestId: string) {
  const leagueId = req.query.id as string;
  const supabase = createServerClient();

  const { data: teams, error } = await supabase
    .from('teams')
    .select('*')
    .eq('league_id', leagueId)
    .order('wins', { ascending: false });

  if (error) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
  }

  const divisionMap = new Map<string, StandingsTeamRow[]>();
  for (const team of (teams ?? []) as StandingsTeamRow[]) {
    const key = `${team.league_division}-${team.division}`;
    if (!divisionMap.has(key)) {
      divisionMap.set(key, []);
    }
    divisionMap.get(key)!.push(team);
  }

  const standings = Array.from(divisionMap.entries()).map(([key, divTeams]) => {
    const [leagueDivision, division] = key.split('-');
    return {
      league_division: leagueDivision,
      division,
      teams: divTeams,
    };
  });

  ok(res, snakeToCamel(standings), requestId);
}

const typeHandlers: Record<string, (req: VercelRequest, res: VercelResponse, requestId: string) => Promise<void>> = {
  batting: handleBatting,
  pitching: handlePitching,
  team: handleTeam,
  standings: handleStandings,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'GET')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);

    const type = req.query.type as string | undefined;
    if (!type || !typeHandlers[type]) {
      res.status(400).json({
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid or missing type parameter. Valid types: ${Object.keys(typeHandlers).join(', ')}`,
        },
      });
      return;
    }

    await typeHandlers[type](req, res, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
