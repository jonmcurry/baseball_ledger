/**
 * Shared Team Config Loader
 *
 * Loads rosters from the database and assembles them into a game-ready
 * TeamConfig. Used by both regular season and playoff simulation.
 *
 * Layer 2: API infrastructure.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerCard, Position } from '@lib/types/player';
import type { ManagerStyle } from '@lib/simulation/manager-profiles';

export interface TeamConfig {
  lineup: { playerId: string; playerName: string; position: Position }[];
  batterCards: Map<string, PlayerCard>;
  rotation: PlayerCard[];
  startingPitcher: PlayerCard;
  bullpen: PlayerCard[];
  closer: PlayerCard | null;
  bench: PlayerCard[];
  managerStyle: ManagerStyle;
}

/**
 * Load a team's full roster config from the database.
 *
 * Groups roster entries by slot (starter, bench, rotation, bullpen, closer),
 * builds the batting lineup sorted by lineup_order, and loads the manager
 * profile from the teams table.
 */
export async function loadTeamConfig(
  supabase: SupabaseClient,
  teamId: string,
): Promise<TeamConfig> {
  // Load roster entries
  const { data: rosterEntries } = await supabase
    .from('rosters')
    .select('player_id, player_card, roster_slot, lineup_order, lineup_position')
    .eq('team_id', teamId);

  // Load manager profile
  const { data: team } = await supabase
    .from('teams')
    .select('manager_profile')
    .eq('id', teamId)
    .single();

  const entries = rosterEntries ?? [];
  const managerStyle = (team?.manager_profile ?? 'balanced') as ManagerStyle;

  // Build lineup from starters (sorted by lineup_order)
  const starters = entries
    .filter((e: { roster_slot: string }) => e.roster_slot === 'starter')
    .sort((a: { lineup_order: number | null }, b: { lineup_order: number | null }) =>
      (a.lineup_order ?? 99) - (b.lineup_order ?? 99));

  const lineup = starters.map((s: {
    player_id: string;
    player_card: Record<string, unknown>;
    lineup_position: string | null;
  }) => ({
    playerId: s.player_id,
    playerName: `${(s.player_card as unknown as PlayerCard).nameFirst} ${(s.player_card as unknown as PlayerCard).nameLast}`,
    position: (s.lineup_position ?? 'DH') as Position,
  }));

  // Build batter card map from starters + bench
  const batterCards = new Map<string, PlayerCard>();
  const batterEntries = entries.filter(
    (e: { roster_slot: string }) => e.roster_slot === 'bench' || e.roster_slot === 'starter',
  );
  for (const e of batterEntries) {
    batterCards.set(
      (e as { player_id: string }).player_id,
      (e as { player_card: unknown }).player_card as unknown as PlayerCard,
    );
  }

  // Rotation (full array)
  const rotationEntries = entries.filter(
    (e: { roster_slot: string }) => e.roster_slot === 'rotation',
  );
  const rotation = rotationEntries.map(
    (e: { player_card: unknown }) => (e as { player_card: unknown }).player_card as unknown as PlayerCard,
  );

  // Starting pitcher (first rotation entry or fallback)
  const startingPitcher = rotation.length > 0
    ? rotation[0]
    : createFallbackPitcher();

  // Bullpen
  const bullpenEntries = entries.filter(
    (e: { roster_slot: string }) => e.roster_slot === 'bullpen',
  );
  const bullpen = bullpenEntries.map(
    (e: { player_card: unknown }) => (e as { player_card: unknown }).player_card as unknown as PlayerCard,
  );

  // Closer
  const closerEntries = entries.filter(
    (e: { roster_slot: string }) => e.roster_slot === 'closer',
  );
  const closer = closerEntries.length > 0
    ? (closerEntries[0] as { player_card: unknown }).player_card as unknown as PlayerCard
    : null;

  // Bench position players
  const benchOnly = entries.filter(
    (e: { roster_slot: string }) => e.roster_slot === 'bench',
  );
  const bench = benchOnly.map(
    (e: { player_card: unknown }) => (e as { player_card: unknown }).player_card as unknown as PlayerCard,
  );

  return { lineup, batterCards, rotation, startingPitcher, bullpen, closer, bench, managerStyle };
}

/**
 * Select a starting pitcher from the rotation using a game index for cycling.
 * Returns a fallback pitcher if the rotation is empty.
 */
export function selectStartingPitcher(
  rotation: PlayerCard[],
  gameIndex: number,
): PlayerCard {
  if (rotation.length === 0) {
    return createFallbackPitcher();
  }
  return rotation[gameIndex % rotation.length];
}

/**
 * Create a fallback pitcher card for teams with no rotation entries.
 */
export function createFallbackPitcher(): PlayerCard {
  return {
    playerId: 'fallback-pitcher',
    nameFirst: 'Default',
    nameLast: 'Pitcher',
    seasonYear: 2023,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: 'P',
    eligiblePositions: ['P'],
    isPitcher: true,
    card: new Array(35).fill(7),
    powerRating: 13,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.3,
    power: 0,
    discipline: 0.3,
    contactRate: 0.5,
    fieldingPct: 0.95,
    range: 0.5,
    arm: 0.5,
    pitching: {
      role: 'SP',
      grade: 5,
      stamina: 6,
      era: 4.5,
      whip: 1.4,
      k9: 6,
      bb9: 3,
      hr9: 1.2,
      usageFlags: [],
      isReliever: false,
    },
  };
}
