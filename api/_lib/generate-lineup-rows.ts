/**
 * Lineup Generation + DB Update
 *
 * REQ-RST-002, REQ-RST-003: Auto-generate lineups for all teams after draft.
 *
 * Bridges the pure Layer 1 lineup generator with the database.
 * Called when the draft completes to assign starters, batting order,
 * defensive positions, and pitcher roles before transitioning to regular_season.
 *
 * Layer 2: API infrastructure.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateLineup } from '../../src/lib/roster/lineup-generator';
import type { LineupInput } from '../../src/lib/roster/lineup-generator';
import { estimateBattingStats } from '../../src/lib/roster/estimate-batting-stats';
import type { PlayerCard } from '../../src/lib/types/player';

/**
 * Generate lineups and pitcher assignments for all teams in a league,
 * then update the rosters table.
 *
 * @param supabase - Server-side Supabase client
 * @param leagueId - League to generate lineups for
 * @returns Count of teams processed and players updated
 */
export async function generateAndInsertLineups(
  supabase: SupabaseClient,
  leagueId: string,
): Promise<{ teamsProcessed: number; playersUpdated: number }> {
  // 1. Fetch all teams
  const { data: teamRows, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId);

  if (teamError) {
    throw { category: 'DATA', code: 'QUERY_FAILED', message: teamError.message };
  }

  const teams = teamRows ?? [];
  let totalUpdated = 0;

  // 2. Process each team
  for (const team of teams) {
    const { data: rosterRows, error: rosterError } = await supabase
      .from('rosters')
      .select('id, player_id, player_card, roster_slot, lineup_order, lineup_position')
      .eq('team_id', team.id);

    if (rosterError) {
      throw { category: 'DATA', code: 'QUERY_FAILED', message: rosterError.message };
    }

    const entries = (rosterRows ?? []) as Array<{
      id: string;
      player_id: string;
      player_card: PlayerCard;
      roster_slot: string;
      lineup_order: number | null;
      lineup_position: string | null;
    }>;

    // 3. Separate position players from pitchers
    const positionPlayers = entries.filter((e) => !e.player_card.isPitcher);
    const pitcherEntries = entries.filter((e) => e.player_card.isPitcher);

    // 4. Position players: pick best 9, generate lineup
    const withStats: Array<{ entry: typeof entries[0]; stats: ReturnType<typeof estimateBattingStats> }> = positionPlayers.map((e) => ({
      entry: e,
      stats: estimateBattingStats(e.player_card),
    }));

    // Sort by OPS descending, take top 9
    withStats.sort((a, b) => b.stats.ops - a.stats.ops);
    const starters = withStats.slice(0, 9);
    const benchPlayers = withStats.slice(9);

    // Build LineupInput[] for the generator
    const lineupInputs: LineupInput[] = starters.map((s) => ({
      card: s.entry.player_card,
      ops: s.stats.ops,
      obp: s.stats.obp,
      slg: s.stats.slg,
    }));

    // Call Layer 1 generator
    const lineupSlots = generateLineup(lineupInputs);

    // Map playerId back to roster table id
    const playerIdToRosterId = new Map<string, string>();
    for (const e of entries) {
      playerIdToRosterId.set(e.player_id, e.id);
    }

    // 5. Update starters
    for (let i = 0; i < lineupSlots.length; i++) {
      const slot = lineupSlots[i];
      const rosterId = playerIdToRosterId.get(slot.playerId);
      if (rosterId) {
        await supabase
          .from('rosters')
          .update({
            roster_slot: 'starter',
            lineup_order: i + 1,
            lineup_position: slot.position,
          })
          .eq('id', rosterId);
        totalUpdated++;
      }
    }

    // Bench position players stay as 'bench' (already the default from draft)
    // No update needed for bench players

    // 6. Assign pitchers by role
    for (const pitcher of pitcherEntries) {
      const pitching = pitcher.player_card.pitching;
      if (!pitching) continue;

      let rosterSlot: string;
      if (pitching.role === 'SP') {
        rosterSlot = 'rotation';
      } else if (pitching.role === 'CL') {
        rosterSlot = 'closer';
      } else {
        rosterSlot = 'bullpen';
      }

      await supabase
        .from('rosters')
        .update({
          roster_slot: rosterSlot,
          lineup_order: null,
          lineup_position: null,
        })
        .eq('id', pitcher.id);
      totalUpdated++;
    }
  }

  return { teamsProcessed: teams.length, playersUpdated: totalUpdated };
}
