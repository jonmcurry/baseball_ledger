/**
 * POST /api/leagues -- Create a new league
 *
 * Creates a league with the authenticated user as commissioner.
 * Returns 201 Created with LeagueSummary.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../_lib/method-guard';
import { requireAuth } from '../_lib/auth';
import { validateBody } from '../_lib/validate';
import { created } from '../_lib/response';
import { handleApiError } from '../_lib/errors';
import { snakeToCamel } from '../_lib/transform';
import { createServerClient } from '@lib/supabase/server';

const CreateLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  teamCount: z.number().int().min(2).max(32).refine((n) => n % 2 === 0, 'Must be even'),
  yearRangeStart: z.number().int().min(1901).max(2025).optional().default(1901),
  yearRangeEnd: z.number().int().min(1901).max(2025).optional().default(2025),
  injuriesEnabled: z.boolean().optional().default(false),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'POST')) return;

  const requestId = crypto.randomUUID();
  try {
    const { userId } = await requireAuth(req);
    const body = validateBody(req, CreateLeagueSchema);

    const supabase = createServerClient();
    const inviteKey = crypto.randomUUID().slice(0, 8).toUpperCase();

    const { data, error } = await supabase
      .from('leagues')
      .insert({
        name: body.name,
        commissioner_id: userId,
        invite_key: inviteKey,
        team_count: body.teamCount,
        year_range_start: body.yearRangeStart,
        year_range_end: body.yearRangeEnd,
        injuries_enabled: body.injuriesEnabled,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw { category: 'DATA', code: 'INSERT_FAILED', message: error?.message ?? 'Insert failed' };
    }

    const league = snakeToCamel(data);
    created(res, league, requestId, `/api/leagues/${data.id}`);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
