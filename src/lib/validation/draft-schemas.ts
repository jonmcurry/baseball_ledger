/**
 * Draft Validation Schemas
 *
 * REQ-ERR-005: Zod schemas for draft pick operations.
 *
 * Layer 1: Pure validation, no I/O.
 */

import { z } from 'zod';

/**
 * Schema for a draft pick request.
 *
 * Validates:
 *   - leagueId: valid UUID
 *   - teamId: valid UUID
 *   - playerId: non-empty string (Lahman playerID format)
 *   - seasonYear: integer, 1901-2025
 */
export const draftPickSchema = z.object({
  leagueId: z.string().uuid(),
  teamId: z.string().uuid(),
  playerId: z.string().min(1),
  seasonYear: z.number().int().min(1901).max(2025),
});

export type DraftPickInput = z.infer<typeof draftPickSchema>;
