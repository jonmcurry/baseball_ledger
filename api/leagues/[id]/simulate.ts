/**
 * POST /api/leagues/:id/simulate -- Run game simulation (single day)
 *
 * REQ-NFR-010: Day-batched bulk simulation.
 * REQ-NFR-014: PostgreSQL transactions for post-simulation writes.
 * REQ-NFR-021: Multi-day simulation is client-driven (chunked pattern).
 *
 * Always simulates exactly one day. The client loops for multi-day
 * simulation (Week/Month/Season), calling this endpoint repeatedly.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { validateBody } from '../../_lib/validate';
import { ok } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '../../../src/lib/supabase/server';
import { simulateDayOnServer } from '../../_lib/simulate-day';
import { simulatePlayoffGame } from '../../_lib/simulate-playoff-game';
import { checkAndTransitionToPlayoffs } from '../../_lib/playoff-transition';
import { loadTeamConfig, selectStartingPitcher } from '../../_lib/load-team-config';
import type { DayGameConfig } from '../../../src/lib/simulation/season-runner';

const SimulateSchema = z.object({
  days: z.literal(1),
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

    // Playoff simulation: one game at a time (normalized to match regular season shape)
    if (league.status === 'playoffs') {
      const result = await simulatePlayoffGame(supabase, leagueId, baseSeed);
      if (!result) {
        ok(res, { dayNumber: league.current_day, games: [] }, requestId);
        return;
      }
      ok(res, {
        dayNumber: league.current_day,
        games: [{
          gameId: `playoff-${result.seriesId}-g${result.gameNumber}`,
          homeTeamId: result.homeTeamId,
          awayTeamId: result.awayTeamId,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
        }],
        playoff: {
          round: result.round,
          seriesId: result.seriesId,
          gameNumber: result.gameNumber,
          isPlayoffsComplete: result.isPlayoffsComplete,
        },
      }, requestId);
      return;
    }

    // Single-day simulation (client loops for multi-day per REQ-NFR-021)
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
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
