/**
 * Roster Validation Schemas
 *
 * REQ-ERR-005: Zod schemas for roster add/drop, trade, and lineup operations.
 *
 * Layer 1: Pure validation, no I/O.
 */

import { z } from 'zod';

const VALID_LINEUP_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;

/**
 * Schema for adding or dropping a player from a roster.
 */
export const rosterActionSchema = z.object({
  action: z.enum(['add', 'drop']),
  teamId: z.string().uuid(),
  playerId: z.string().min(1),
});

export type RosterActionInput = z.infer<typeof rosterActionSchema>;

/**
 * Schema for a trade between two teams.
 *
 * At least one side must include at least one player.
 * Teams must be different.
 */
export const tradeSchema = z.object({
  team1Id: z.string().uuid(),
  team2Id: z.string().uuid(),
  team1PlayerIds: z.array(z.string().min(1)),
  team2PlayerIds: z.array(z.string().min(1)),
}).refine(
  (data) => data.team1Id !== data.team2Id,
  { message: 'Teams in a trade must be different', path: ['team2Id'] },
).refine(
  (data) => data.team1PlayerIds.length > 0 || data.team2PlayerIds.length > 0,
  { message: 'At least one side must include players', path: ['team1PlayerIds'] },
);

export type TradeInput = z.infer<typeof tradeSchema>;

/**
 * Schema for a single lineup entry (player + position + batting order).
 */
const lineupEntrySchema = z.object({
  playerId: z.string().min(1),
  position: z.enum(VALID_LINEUP_POSITIONS),
  lineupOrder: z.number().int().min(1).max(9),
});

/**
 * Schema for a full lineup submission (exactly 9 entries).
 */
export const lineupSchema = z.object({
  entries: z.array(lineupEntrySchema).length(9),
});

export type LineupInput = z.infer<typeof lineupSchema>;
