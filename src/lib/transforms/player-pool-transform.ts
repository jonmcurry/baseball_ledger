/**
 * Player Pool Transform
 *
 * REQ-RST-005: Shared transform from PlayerPoolRow[] to AvailablePlayer[].
 * Used by both draftStore (during draft) and TransactionsPage (free agent pickup).
 *
 * Layer 1: Pure logic, no I/O.
 */

import type { PlayerPoolRow } from '../types/database';
import type { PlayerCard } from '../types/player';

/** Lightweight view of an available player for UI display. */
export interface AvailablePlayer {
  playerId: string;
  nameFirst: string;
  nameLast: string;
  seasonYear: number;
  primaryPosition: string;
  playerCard: PlayerCard;
}

/**
 * Transform database pool rows into UI-ready AvailablePlayer objects.
 */
export function transformPoolRows(rows: PlayerPoolRow[]): AvailablePlayer[] {
  return rows.map((row) => {
    const card = row.player_card as unknown as PlayerCard;
    return {
      playerId: card.playerId ?? row.player_id,
      nameFirst: card.nameFirst ?? '',
      nameLast: card.nameLast ?? '',
      seasonYear: card.seasonYear ?? row.season_year,
      primaryPosition: card.primaryPosition ?? 'DH',
      playerCard: card,
    };
  });
}
