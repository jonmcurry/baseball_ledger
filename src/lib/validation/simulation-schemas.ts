/**
 * Simulation & Team Validation Schemas
 *
 * REQ-ERR-005: Zod schemas for simulation requests and team updates.
 *
 * Layer 1: Pure validation, no I/O.
 */

import { z } from 'zod';

const VALID_DAY_COUNTS = [1, 7, 30, 162] as const;
const MANAGER_PROFILES = ['conservative', 'aggressive', 'balanced', 'analytical'] as const;

/**
 * Schema for a simulation request.
 *
 * Validates:
 *   - days: one of 1, 7, 30, 162
 *   - seed: optional integer for deterministic simulation
 */
export const simulateSchema = z.object({
  days: z.enum(['1', '7', '30', '162']).or(z.literal(1)).or(z.literal(7)).or(z.literal(30)).or(z.literal(162))
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .pipe(z.number().refine((n) => (VALID_DAY_COUNTS as readonly number[]).includes(n), {
      message: `Days must be one of: ${VALID_DAY_COUNTS.join(', ')}`,
    })),
  seed: z.number().int().optional(),
});

export type SimulateInput = z.infer<typeof simulateSchema>;

/**
 * Schema for updating a team (name and/or manager profile).
 *
 * At least one field must be provided.
 */
export const updateTeamSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  managerProfile: z.enum(MANAGER_PROFILES).optional(),
}).refine(
  (data) => data.name !== undefined || data.managerProfile !== undefined,
  { message: 'At least one field (name or managerProfile) must be provided' },
);

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
