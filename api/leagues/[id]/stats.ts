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
import { createServerClient } from '../../../src/lib/supabase/server';

const PAGE_SIZE = 50;

/** Build team_id -> league_division lookup for the league. */
async function getTeamDivisionMap(
  supabase: ReturnType<typeof createServerClient>,
  leagueId: string,
): Promise<Map<string, string>> {
  const { data: teams } = await supabase
    .from('teams')
    .select('id, league_division')
    .eq('league_id', leagueId);
  const map = new Map<string, string>();
  for (const t of teams ?? []) {
    map.set(t.id, t.league_division);
  }
  return map;
}

/** Build player_id -> {nameFirst, nameLast} lookup from rosters in the league. */
async function getPlayerNameMap(
  supabase: ReturnType<typeof createServerClient>,
  leagueId: string,
): Promise<Map<string, { nameFirst: string; nameLast: string }>> {
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId);
  const teamIds = (teams ?? []).map((t) => t.id);
  if (teamIds.length === 0) return new Map();

  const { data: rosters } = await supabase
    .from('rosters')
    .select('player_id, player_card')
    .in('team_id', teamIds);

  const map = new Map<string, { nameFirst: string; nameLast: string }>();
  for (const r of rosters ?? []) {
    const card = r.player_card as { nameFirst?: string; nameLast?: string };
    map.set(r.player_id, {
      nameFirst: card.nameFirst ?? '',
      nameLast: card.nameLast ?? '',
    });
  }
  return map;
}

/** Build team_id -> team name lookup. */
async function getTeamNameMap(
  supabase: ReturnType<typeof createServerClient>,
  leagueId: string,
): Promise<Map<string, string>> {
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId);
  const map = new Map<string, string>();
  for (const t of teams ?? []) {
    map.set(t.id, t.name);
  }
  return map;
}

async function handleBatting(req: VercelRequest, res: VercelResponse, requestId: string) {
  const leagueId = req.query.id as string;
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createServerClient();

  // Get total count + lookups in parallel
  const [countResult, teamDivMap, playerNameMap, teamNameMap] = await Promise.all([
    supabase
      .from('season_stats')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .not('batting_stats', 'is', null),
    getTeamDivisionMap(supabase, leagueId),
    getPlayerNameMap(supabase, leagueId),
    getTeamNameMap(supabase, leagueId),
  ]);

  if (countResult.error) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: countResult.error.message };
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

  const leaders = (data ?? []).map((row) => {
    const names = playerNameMap.get(row.player_id);
    return {
      player_id: row.player_id,
      player_name: names ? `${names.nameFirst} ${names.nameLast}`.trim() : row.player_id,
      team_id: row.team_id,
      team_name: teamNameMap.get(row.team_id) ?? row.team_id,
      league_division: teamDivMap.get(row.team_id) ?? 'AL',
      stats: row.batting_stats,
    };
  });

  paginated(
    res,
    snakeToCamel(leaders) as unknown[],
    { page, pageSize: PAGE_SIZE, totalRows: countResult.count ?? 0 },
    requestId,
  );
}

async function handlePitching(req: VercelRequest, res: VercelResponse, requestId: string) {
  const leagueId = req.query.id as string;
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createServerClient();

  // Get total count + lookups in parallel
  const [countResult, teamDivMap, playerNameMap, teamNameMap] = await Promise.all([
    supabase
      .from('season_stats')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .not('pitching_stats', 'is', null),
    getTeamDivisionMap(supabase, leagueId),
    getPlayerNameMap(supabase, leagueId),
    getTeamNameMap(supabase, leagueId),
  ]);

  if (countResult.error) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: countResult.error.message };
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

  const leaders = (data ?? []).map((row) => {
    const names = playerNameMap.get(row.player_id);
    return {
      player_id: row.player_id,
      player_name: names ? `${names.nameFirst} ${names.nameLast}`.trim() : row.player_id,
      team_id: row.team_id,
      team_name: teamNameMap.get(row.team_id) ?? row.team_id,
      league_division: teamDivMap.get(row.team_id) ?? 'AL',
      stats: row.pitching_stats,
    };
  });

  paginated(
    res,
    snakeToCamel(leaders) as unknown[],
    { page, pageSize: PAGE_SIZE, totalRows: countResult.count ?? 0 },
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
  home_wins: number;
  home_losses: number;
  away_wins: number;
  away_losses: number;
}

interface GameLogRow {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  day_number: number;
}

async function handleStandings(req: VercelRequest, res: VercelResponse, requestId: string) {
  const leagueId = req.query.id as string;
  const supabase = createServerClient();

  // Fetch teams and game logs in parallel
  const [teamsResult, gameLogsResult] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, city, owner_id, manager_profile, league_division, division, wins, losses, runs_scored, runs_allowed, home_wins, home_losses, away_wins, away_losses')
      .eq('league_id', leagueId)
      .order('wins', { ascending: false }),
    supabase
      .from('game_logs')
      .select('home_team_id, away_team_id, home_score, away_score, day_number')
      .eq('league_id', leagueId)
      .order('day_number', { ascending: false }),
  ]);

  if (teamsResult.error) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: teamsResult.error.message };
  }

  // Build per-team game results for streak/L10 computation
  const teamGames = new Map<string, { won: boolean; dayNumber: number }[]>();
  for (const log of (gameLogsResult.data ?? []) as GameLogRow[]) {
    const homeWon = log.home_score > log.away_score;

    if (!teamGames.has(log.home_team_id)) teamGames.set(log.home_team_id, []);
    teamGames.get(log.home_team_id)!.push({ won: homeWon, dayNumber: log.day_number });

    if (!teamGames.has(log.away_team_id)) teamGames.set(log.away_team_id, []);
    teamGames.get(log.away_team_id)!.push({ won: !homeWon, dayNumber: log.day_number });
  }

  // Import pure functions inline (Layer 1)
  const { computeStreak, computeLastN } = await import('../../../src/lib/stats/standings');

  const divisionMap = new Map<string, (StandingsTeamRow & { streak: string; last_ten_wins: number; last_ten_losses: number })[]>();
  for (const team of (teamsResult.data ?? []) as StandingsTeamRow[]) {
    const games = teamGames.get(team.id) ?? [];
    const streak = computeStreak(games);
    const lastTen = computeLastN(games, 10);

    const key = `${team.league_division}-${team.division}`;
    if (!divisionMap.has(key)) {
      divisionMap.set(key, []);
    }
    divisionMap.get(key)!.push({
      ...team,
      streak,
      last_ten_wins: lastTen.wins,
      last_ten_losses: lastTen.losses,
    });
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

async function handlePlayer(req: VercelRequest, res: VercelResponse, requestId: string) {
  const leagueId = req.query.id as string;
  const playerId = req.query.playerId as string | undefined;

  if (!playerId) {
    res.status(400).json({
      error: {
        code: 'MISSING_PLAYER_ID',
        message: 'playerId query parameter is required for type=player',
      },
    });
    return;
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('season_stats')
    .select('player_id, team_id, season_year, batting_stats, pitching_stats')
    .eq('league_id', leagueId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
  }

  const result = data
    ? snakeToCamel(data)
    : { playerId, teamId: null, seasonYear: null, battingStats: null, pitchingStats: null };

  ok(res, result, requestId);
}

const typeHandlers: Record<string, (req: VercelRequest, res: VercelResponse, requestId: string) => Promise<void>> = {
  batting: handleBatting,
  pitching: handlePitching,
  team: handleTeam,
  standings: handleStandings,
  player: handlePlayer,
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
