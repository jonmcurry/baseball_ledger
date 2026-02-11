/**
 * GET  /api/leagues/:id/archive              -- List archived seasons
 * GET  /api/leagues/:id/archive?seasonId=... -- Get single archive detail
 * POST /api/leagues/:id/archive              -- Archive the current season (commissioner only)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { ok, noContent } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { snakeToCamel } from '../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';
import type { Json } from '@lib/types/database';
import { buildArchiveData } from '@lib/transforms/archive-builder';
import type { FullPlayoffBracket } from '@lib/types/schedule';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, ['GET', 'POST'])) return;

  const requestId = crypto.randomUUID();
  try {
    if (req.method === 'GET') {
      await requireAuth(req);
      const leagueId = req.query.id as string;
      const seasonId = req.query.seasonId as string | undefined;
      const supabase = createServerClient();

      if (seasonId) {
        // Single archive detail
        const { data, error } = await supabase
          .from('archives')
          .select('*')
          .eq('id', seasonId)
          .eq('league_id', leagueId)
          .single();

        if (error || !data) {
          throw { category: 'NOT_FOUND', code: 'ARCHIVE_NOT_FOUND', message: 'Archive not found' };
        }

        ok(res, snakeToCamel(data), requestId);
      } else {
        // List all archives
        const { data, error } = await supabase
          .from('archives')
          .select('id, league_id, season_number, champion, created_at')
          .eq('league_id', leagueId)
          .order('season_number', { ascending: false });

        if (error) {
          throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
        }

        ok(res, snakeToCamel(data ?? []), requestId);
      }
    } else {
      // POST -- archive season
      const { userId } = await requireAuth(req);
      const leagueId = req.query.id as string;
      const supabase = createServerClient();

      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('commissioner_id, status, season_year, playoff_bracket, player_name_cache')
        .eq('id', leagueId)
        .single();

      if (leagueError || !league) {
        throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
      }

      if (league.commissioner_id !== userId) {
        throw { category: 'AUTHORIZATION', code: 'NOT_COMMISSIONER', message: 'Only the commissioner can archive a season' };
      }

      if (league.status !== 'completed') {
        throw { category: 'VALIDATION', code: 'SEASON_NOT_COMPLETE', message: 'Season must be completed before archiving' };
      }

      // Get final standings for archive
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId);

      // Fetch season stats for league leader computation
      const { data: seasonStats } = await supabase
        .from('season_stats')
        .select('player_id, team_id, batting_stats, pitching_stats')
        .eq('league_id', leagueId);

      // REQ-SCH-009: Build enriched archive data
      const archiveData = buildArchiveData({
        teams: (teams ?? []) as Array<{ id: string; name: string; city: string; wins: number; losses: number; league_division: string; division: string }>,
        playoffBracket: league.playoff_bracket as FullPlayoffBracket | null,
        seasonStats: (seasonStats ?? []) as Array<{ player_id: string; team_id: string; batting_stats: Record<string, unknown> | null; pitching_stats: Record<string, unknown> | null }>,
        playerNameCache: (league.player_name_cache ?? {}) as Record<string, string>,
        totalGames: 162,
      });

      // Create enriched archive record
      await supabase.from('archives').insert({
        league_id: leagueId,
        season_number: league.season_year,
        standings: { teams: teams ?? [] } as unknown as Json,
        champion: archiveData.champion,
        playoff_results: archiveData.playoffResults as unknown as Json,
        league_leaders: archiveData.leagueLeaders as unknown as Json,
      });

      // Clean up season data for fresh start
      await Promise.all([
        supabase.from('season_stats').delete().eq('league_id', leagueId),
        supabase.from('schedule').delete().eq('league_id', leagueId),
        supabase.from('game_logs').delete().eq('league_id', leagueId),
      ]);

      // Reset team records
      await supabase
        .from('teams')
        .update({ wins: 0, losses: 0, runs_scored: 0, runs_allowed: 0 })
        .eq('league_id', leagueId);

      // Increment season year, reset status, clear playoff bracket
      await supabase
        .from('leagues')
        .update({ season_year: league.season_year + 1, status: 'setup', current_day: 0, playoff_bracket: null })
        .eq('id', leagueId);

      noContent(res, requestId);
    }
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
