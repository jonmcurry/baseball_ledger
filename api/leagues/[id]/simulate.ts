/**
 * POST /api/leagues/:id/simulate -- Run game simulation
 *
 * { days: 1 } = synchronous (200 OK with SimDayResult)
 * { days: 7/30/'season' } = asynchronous (202 Accepted with simulationId)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { ok, accepted } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';

const SimulateSchema = z.object({
  days: z.union([z.number().int().min(1), z.literal('season')]),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);
    const leagueId = req.query.id as string;
    const body = validateBody(req, SimulateSchema);

    const supabase = createServerClient();

    // Verify league exists and is in regular_season or playoffs
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('status, current_day')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      throw { category: 'NOT_FOUND', code: 'LEAGUE_NOT_FOUND', message: `League ${leagueId} not found` };
    }

    if (league.status !== 'regular_season' && league.status !== 'playoffs') {
      throw { category: 'VALIDATION', code: 'INVALID_LEAGUE_STATUS', message: `Cannot simulate in ${league.status} status` };
    }

    if (body.days === 1) {
      // Synchronous simulation (single day)
      // In production, this would run the simulation engine and return results
      const simulationResult = {
        dayNumber: league.current_day + 1,
        games: [],
      };

      ok(res, simulationResult, requestId);
    } else {
      // Asynchronous simulation (multi-day)
      const simulationId = crypto.randomUUID();
      const totalDays = body.days === 'season' ? 162 - league.current_day : body.days;

      // Insert simulation progress record
      await supabase
        .from('simulation_progress')
        .upsert({
          league_id: leagueId,
          status: 'running',
          total_games: totalDays * 4, // Approximate: 4 games per day for 8 teams
          completed_games: 0,
          current_day: league.current_day,
          started_at: new Date().toISOString(),
        });

      accepted(res, { simulationId }, requestId);
    }
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
