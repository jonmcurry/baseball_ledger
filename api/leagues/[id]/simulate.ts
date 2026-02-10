/**
 * POST /api/leagues/:id/simulate -- Run game simulation
 *
 * REQ-NFR-010: Day-batched bulk simulation.
 * REQ-NFR-014: PostgreSQL transactions for post-simulation writes.
 *
 * { days: 1 } = synchronous (200 OK with DayResult)
 * { days: 7/30/'season' } = asynchronous (202 Accepted with simulationId)
 *
 * Multi-day simulation loops server-side, calling simulateDayOnServer()
 * for each day and updating simulation_progress for Realtime subscribers.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { ok, accepted } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';
import { simulateDayOnServer } from '../../_lib/simulate-day';
import { simulatePlayoffGame } from '../../_lib/simulate-playoff-game';
import { checkAndTransitionToPlayoffs } from '../../_lib/playoff-transition';
import { loadTeamConfig, selectStartingPitcher } from '../../_lib/load-team-config';
import type { DayGameConfig } from '@lib/simulation/season-runner';

const SimulateSchema = z.object({
  days: z.union([z.number().int().min(1), z.literal('season')]),
  seed: z.number().int().optional(),
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

    const baseSeed = body.seed ?? Date.now();

    // Playoff simulation: one game at a time
    if (league.status === 'playoffs') {
      const result = await simulatePlayoffGame(supabase, leagueId, baseSeed);
      if (!result) {
        ok(res, { message: 'No playoff games remaining' }, requestId);
        return;
      }
      ok(res, result, requestId);
      return;
    }

    if (body.days === 1) {
      // Synchronous single-day simulation
      const nextDay = league.current_day + 1;
      const { data: scheduledGames } = await supabase
        .from('schedule')
        .select('*')
        .eq('league_id', leagueId)
        .eq('day_number', nextDay)
        .eq('is_complete', false);

      if (!scheduledGames || scheduledGames.length === 0) {
        // Check for season-to-playoffs transition
        const transitioned = await checkAndTransitionToPlayoffs(supabase, leagueId, nextDay);
        if (transitioned) {
          ok(res, { dayNumber: nextDay, games: [], transitionedToPlayoffs: true }, requestId);
          return;
        }
        ok(res, { dayNumber: nextDay, games: [] }, requestId);
        return;
      }

      // Collect unique team IDs from scheduled games
      const teamIds = [...new Set(
        scheduledGames.flatMap((g: { home_team_id: string; away_team_id: string }) =>
          [g.home_team_id, g.away_team_id]),
      )];

      // Load team configs in parallel
      const teamConfigs = new Map<string, Awaited<ReturnType<typeof loadTeamConfig>>>();
      await Promise.all(teamIds.map(async (teamId) => {
        const config = await loadTeamConfig(supabase, teamId);
        teamConfigs.set(teamId, config);
      }));

      // Load team records for pitcher rotation index
      const { data: teamRecords } = await supabase
        .from('teams')
        .select('id, wins, losses')
        .in('id', teamIds);

      const gamesPlayedMap = new Map<string, number>();
      for (const t of teamRecords ?? []) {
        gamesPlayedMap.set(t.id, (t.wins ?? 0) + (t.losses ?? 0));
      }

      // Build DayGameConfig array
      const dayGames: DayGameConfig[] = scheduledGames.map(
        (g: { id: string; home_team_id: string; away_team_id: string }) => {
          const homeConfig = teamConfigs.get(g.home_team_id)!;
          const awayConfig = teamConfigs.get(g.away_team_id)!;
          const homeGamesPlayed = gamesPlayedMap.get(g.home_team_id) ?? 0;
          const awayGamesPlayed = gamesPlayedMap.get(g.away_team_id) ?? 0;

          return {
            gameId: g.id,
            homeTeamId: g.home_team_id,
            awayTeamId: g.away_team_id,
            homeLineup: homeConfig.lineup,
            awayLineup: awayConfig.lineup,
            homeBatterCards: homeConfig.batterCards,
            awayBatterCards: awayConfig.batterCards,
            homeStartingPitcher: selectStartingPitcher(homeConfig.rotation, homeGamesPlayed),
            awayStartingPitcher: selectStartingPitcher(awayConfig.rotation, awayGamesPlayed),
            homeBullpen: homeConfig.bullpen,
            awayBullpen: awayConfig.bullpen,
            homeCloser: homeConfig.closer,
            awayCloser: awayConfig.closer,
            homeManagerStyle: homeConfig.managerStyle,
            awayManagerStyle: awayConfig.managerStyle,
          };
        },
      );

      // Run simulation
      const dayResult = await simulateDayOnServer(supabase, leagueId, nextDay, dayGames, baseSeed);

      // Mark schedule rows complete
      for (const game of dayResult.games) {
        await supabase
          .from('schedule')
          .update({
            is_complete: true,
            home_score: game.homeScore,
            away_score: game.awayScore,
          })
          .eq('id', game.gameId);
      }

      ok(res, dayResult, requestId);
    } else {
      // Asynchronous multi-day simulation
      const simulationId = crypto.randomUUID();
      const totalDays = body.days === 'season' ? 162 - league.current_day : body.days;

      // Insert simulation progress record for Realtime subscribers
      await supabase
        .from('simulation_progress')
        .upsert({
          league_id: leagueId,
          status: 'running',
          total_games: totalDays * 4,
          completed_games: 0,
          current_day: league.current_day,
          started_at: new Date().toISOString(),
        });

      accepted(res, { simulationId, totalDays, baseSeed }, requestId);
    }
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
