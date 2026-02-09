/**
 * GET /api/leagues/:id/standings -- Get league standings by division
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { ok } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { snakeToCamel } from '../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';

interface TeamRow {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'GET')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
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

    // Group by league_division + division
    const divisionMap = new Map<string, TeamRow[]>();
    for (const team of (teams ?? []) as TeamRow[]) {
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
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
