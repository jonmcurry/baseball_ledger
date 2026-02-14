/**
 * Playoff Transition
 *
 * REQ-LGE-008: Checks if the regular season is complete and transitions
 * the league to playoffs by generating and storing the full playoff bracket.
 *
 * Layer 2: API infrastructure.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DivisionStandings, TeamSummary } from '../../src/lib/types/league';
import { generateFullPlayoffBracket } from '../../src/lib/schedule/playoff-bracket';

const REGULAR_SEASON_DAYS = 162;

/**
 * Check if the regular season is complete and transition to playoffs.
 *
 * Conditions:
 * - currentDay >= 162
 * - No incomplete scheduled games remain
 *
 * When met:
 * - Loads team data and builds standings
 * - Generates full playoff bracket (AL + NL + WS)
 * - Updates league status to 'playoffs' and stores bracket
 *
 * @returns true if transition occurred, false otherwise
 */
export async function checkAndTransitionToPlayoffs(
  supabase: SupabaseClient,
  leagueId: string,
  currentDay: number,
): Promise<boolean> {
  if (currentDay < REGULAR_SEASON_DAYS) {
    return false;
  }

  // Check for incomplete games
  const { data: incompleteGames } = await supabase
    .from('schedule')
    .select('id')
    .eq('league_id', leagueId)
    .eq('is_complete', false);

  if (incompleteGames && incompleteGames.length > 0) {
    return false;
  }

  // Load team data for standings
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, city, league_division, division, wins, losses, runs_scored, runs_allowed')
    .eq('league_id', leagueId);

  if (teamsError || !teams) {
    throw {
      category: 'EXTERNAL',
      code: 'PLAYOFF_TRANSITION_FAILED',
      message: `Failed to load teams: ${teamsError?.message ?? 'No team data'}`,
    };
  }

  // Build standings grouped by division
  const standings = buildStandingsFromTeams(teams);

  // Generate full playoff bracket
  const bracket = generateFullPlayoffBracket(leagueId, standings);

  // Update league status and store bracket
  const { error: updateError } = await supabase
    .from('leagues')
    .update({ status: 'playoffs', playoff_bracket: bracket as unknown as Record<string, unknown> })
    .eq('id', leagueId);

  if (updateError) {
    throw {
      category: 'EXTERNAL',
      code: 'PLAYOFF_TRANSITION_FAILED',
      message: `Failed to update league: ${updateError.message}`,
    };
  }

  return true;
}

/**
 * Build DivisionStandings from raw team rows.
 * Teams are grouped by league + division and sorted by wins descending.
 */
function buildStandingsFromTeams(
  teams: Array<{
    id: string;
    name: string;
    city: string;
    league_division: string;
    division: string;
    wins: number;
    losses: number;
    runs_scored: number;
    runs_allowed: number;
  }>,
): DivisionStandings[] {
  const divMap = new Map<string, TeamSummary[]>();

  for (const t of teams) {
    const key = `${t.league_division}-${t.division}`;
    if (!divMap.has(key)) {
      divMap.set(key, []);
    }
    divMap.get(key)!.push({
      id: t.id,
      name: t.name,
      city: t.city,
      ownerId: null,
      managerProfile: 'balanced',
      leagueDivision: t.league_division as 'AL' | 'NL',
      division: t.division,
      wins: t.wins,
      losses: t.losses,
      runsScored: t.runs_scored,
      runsAllowed: t.runs_allowed,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0,
      streak: '-',
      lastTenWins: 0,
      lastTenLosses: 0,
    });
  }

  const standings: DivisionStandings[] = [];

  for (const [key, divTeams] of divMap) {
    const [leagueDivision, divisionName] = key.split('-');
    divTeams.sort((a, b) => b.wins - a.wins);

    standings.push({
      leagueDivision: leagueDivision as 'AL' | 'NL',
      division: divisionName,
      teams: divTeams,
    });
  }

  return standings;
}
