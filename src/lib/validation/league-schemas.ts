/**
 * League Validation Schemas
 *
 * REQ-ERR-005: Zod schemas for league create and join operations.
 *
 * Layer 1: Pure validation, no I/O.
 */

import { z } from 'zod';

/**
 * Schema for creating a new league.
 *
 * Validates:
 *   - name: 3-50 characters
 *   - teamCount: 18, 24, or 30
 *   - yearRangeStart: integer, 1901-2025
 *   - yearRangeEnd: integer, 1901-2025
 *   - injuriesEnabled: boolean
 */
export const createLeagueSchema = z.object({
  name: z.string().min(3).max(50),
  teamCount: z.number().int().refine(
    (n) => [18, 24, 30].includes(n),
    { message: 'Team count must be 18, 24, or 30' },
  ),
  yearRangeStart: z.number().int().min(1901).max(2025),
  yearRangeEnd: z.number().int().min(1901).max(2025),
  injuriesEnabled: z.boolean(),
});

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

/**
 * Schema for joining a league via invite key.
 *
 * Validates:
 *   - inviteKey: exactly 12 alphanumeric characters
 */
export const joinLeagueSchema = z.object({
  inviteKey: z.string().length(12).regex(
    /^[A-Za-z0-9]+$/,
    { message: 'Invite key must be alphanumeric' },
  ),
});

export type JoinLeagueInput = z.infer<typeof joinLeagueSchema>;
