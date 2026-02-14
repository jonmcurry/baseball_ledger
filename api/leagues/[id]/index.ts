/**
 * GET    /api/leagues/:id -- Fetch league details
 * POST   /api/leagues/:id -- Join league via invite key
 * DELETE /api/leagues/:id -- Delete league (commissioner only)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { ok, noContent } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { snakeToCamel } from '../../_lib/transform';
import { createServerClient } from '../../../src/lib/supabase/server';

const JoinLeagueSchema = z.object({
  inviteKey: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, ['GET', 'POST', 'DELETE'])) return;

  const requestId = crypto.randomUUID();
  try {
    const { userId } = await requireAuth(req);
    const leagueId = req.query.id as string;
    const supabase = createServerClient();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (error || !data) {
        throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
      }

      // Verify membership (commissioner or team owner)
      const { data: teams } = await supabase
        .from('teams')
        .select('owner_id')
        .eq('league_id', leagueId);

      const isMember = data.commissioner_id === userId ||
        teams?.some((t) => t.owner_id === userId);

      if (!isMember) {
        throw { category: 'AUTHORIZATION', code: 'NOT_LEAGUE_MEMBER', message: 'Not a member of this league' };
      }

      ok(res, snakeToCamel(data), requestId);
    } else if (req.method === 'POST') {
      // JOIN league
      const body = validateBody(req, JoinLeagueSchema);

      // Verify league exists and invite key matches
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (leagueError || !league) {
        throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
      }

      if (league.invite_key !== body.inviteKey) {
        throw { category: 'VALIDATION', code: 'INVALID_INVITE_KEY', message: 'Invalid invite key' };
      }

      // Check user isn't already in the league
      const { data: existingTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId)
        .eq('owner_id', userId);

      if (existingTeams && existingTeams.length > 0) {
        throw { category: 'CONFLICT', code: 'ALREADY_MEMBER', message: 'Already a member of this league' };
      }

      // Find an unowned team
      const { data: unownedTeam, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)
        .is('owner_id', null)
        .limit(1)
        .single();

      if (teamError || !unownedTeam) {
        throw { category: 'CONFLICT', code: 'NO_AVAILABLE_TEAMS', message: 'No available teams in this league' };
      }

      // Assign the team to the user
      const { error: updateError } = await supabase
        .from('teams')
        .update({ owner_id: userId })
        .eq('id', unownedTeam.id);

      if (updateError) {
        throw { category: 'DATA', code: 'JOIN_FAILED', message: updateError.message };
      }

      ok(res, { teamId: unownedTeam.id, teamName: unownedTeam.name }, requestId);
    } else {
      // DELETE
      const { data, error } = await supabase
        .from('leagues')
        .select('commissioner_id')
        .eq('id', leagueId)
        .single();

      if (error || !data) {
        throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
      }

      if (data.commissioner_id !== userId) {
        throw { category: 'AUTHORIZATION', code: 'NOT_COMMISSIONER', message: 'Only the commissioner can delete this league' };
      }

      // Delete child records in FK-safe order, then the league itself.
      // Each table is deleted explicitly to provide clear error attribution.
      async function deleteFrom(table: string, column: string, value: string) {
        const { error: err } = await supabase
          .from(table as 'leagues')
          .delete()
          .eq(column as 'id', value);
        if (err) {
          console.error(`DELETE ${table} WHERE ${column}=${value}: ${err.message} (code ${err.code})`);
          throw { category: 'DATA', code: 'DELETE_FAILED', message: `${table}: ${err.message}` };
        }
      }

      // 1. Get team IDs for roster cleanup
      const { data: teamRows } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId);
      const teamIds = (teamRows ?? []).map((t: { id: string }) => t.id);

      // 2. Delete rosters (keyed by team_id, no league_id column)
      for (const tid of teamIds) {
        await deleteFrom('rosters', 'team_id', tid);
      }

      // 3. Delete child tables with league_id, in FK-safe order
      //    schedule before game_logs (schedule.game_log_id -> game_logs.id)
      await deleteFrom('transactions', 'league_id', leagueId);
      await deleteFrom('season_stats', 'league_id', leagueId);
      await deleteFrom('schedule', 'league_id', leagueId);
      await deleteFrom('game_logs', 'league_id', leagueId);
      await deleteFrom('player_pool', 'league_id', leagueId);
      await deleteFrom('simulation_progress', 'league_id', leagueId);
      await deleteFrom('archives', 'league_id', leagueId);

      // 4. Delete teams
      await deleteFrom('teams', 'league_id', leagueId);

      // 5. Delete the league itself
      await deleteFrom('leagues', 'id', leagueId);

      noContent(res, requestId);
    }
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
