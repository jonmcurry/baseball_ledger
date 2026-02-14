/**
 * Schedule Generation + DB Insert
 *
 * REQ-SCH-001 through REQ-SCH-004: Generate and persist a full season schedule.
 *
 * Bridges the pure Layer 1 schedule generator with the database.
 * Called when the draft completes to populate the schedule table
 * before transitioning the league to regular_season status.
 *
 * Layer 2: API infrastructure.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateSchedule } from '../../src/lib/schedule/generator';
import { SeededRNG } from '../../src/lib/rng/seeded-rng';
import type { TeamSummary } from '../../src/lib/types/league';

/**
 * Generate a full regular-season schedule and insert all games into the
 * schedule table.
 *
 * @param supabase - Server-side Supabase client
 * @param leagueId - League to generate schedule for
 * @returns Count of days and games generated
 */
export async function generateAndInsertSchedule(
  supabase: SupabaseClient,
  leagueId: string,
): Promise<{ totalDays: number; totalGames: number }> {
  // 1. Fetch teams
  const { data: teamRows, error: teamError } = await supabase
    .from('teams')
    .select('id, name, city, owner_id, manager_profile, league_division, division, wins, losses, runs_scored, runs_allowed, home_wins, home_losses, away_wins, away_losses')
    .eq('league_id', leagueId)
    .order('league_division')
    .order('division')
    .order('name');

  if (teamError) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: teamError.message };
  }

  // 2. Map to TeamSummary[]
  const teams: TeamSummary[] = (teamRows ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    city: row.city as string,
    ownerId: row.owner_id as string | null,
    managerProfile: row.manager_profile as string,
    leagueDivision: row.league_division as 'AL' | 'NL',
    division: row.division as string,
    wins: row.wins as number,
    losses: row.losses as number,
    runsScored: row.runs_scored as number,
    runsAllowed: row.runs_allowed as number,
    homeWins: (row.home_wins as number) ?? 0,
    homeLosses: (row.home_losses as number) ?? 0,
    awayWins: (row.away_wins as number) ?? 0,
    awayLosses: (row.away_losses as number) ?? 0,
    streak: '-',
    lastTenWins: 0,
    lastTenLosses: 0,
  }));

  // 3. Generate schedule
  const rng = new SeededRNG(Date.now());
  const days = generateSchedule(teams, rng);

  // 4. Flatten to DB rows
  const rows: Array<{
    league_id: string;
    day_number: number;
    home_team_id: string;
    away_team_id: string;
  }> = [];

  for (const day of days) {
    for (const game of day.games) {
      rows.push({
        league_id: leagueId,
        day_number: day.dayNumber,
        home_team_id: game.homeTeamId,
        away_team_id: game.awayTeamId,
      });
    }
  }

  // 5. Insert
  const { error: insertError } = await supabase
    .from('schedule')
    .insert(rows);

  if (insertError) {
    throw { category: 'DATA', code: 'INSERT_FAILED', message: insertError.message };
  }

  return { totalDays: days.length, totalGames: rows.length };
}
