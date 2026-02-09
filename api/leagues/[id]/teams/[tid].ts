/**
 * PATCH /api/leagues/:id/teams/:tid -- Update a team
 *
 * Team owner or commissioner can update team details.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkMethod } from '../../../_lib/method-guard';
import { requireAuth } from '../../../_lib/auth';
import { validateBody } from '../../../_lib/validate';
import { ok } from '../../../_lib/response';
import { handleApiError } from '../../../_lib/errors';
import { snakeToCamel, camelToSnake } from '../../../_lib/transform';
import { createServerClient } from '@lib/supabase/server';
import type { Database } from '@lib/types/database';

const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  city: z.string().min(1).max(100).optional(),
  managerProfile: z.enum(['conservative', 'aggressive', 'balanced', 'analytical']).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'PATCH')) return;

  const requestId = crypto.randomUUID();
  try {
    const { userId } = await requireAuth(req);
    const teamId = req.query.tid as string;
    const body = validateBody(req, UpdateTeamSchema);

    const supabase = createServerClient();

    // Verify ownership
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*, leagues!inner(commissioner_id)')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      throw { category: 'NOT_FOUND', code: 'TEAM_NOT_FOUND', message: `Team ${teamId} not found` };
    }

    const teamData = team as unknown as { owner_id: string; leagues: { commissioner_id: string } };
    const isOwner = teamData.owner_id === userId;
    const isCommissioner = teamData.leagues.commissioner_id === userId;

    if (!isOwner && !isCommissioner) {
      throw { category: 'AUTHORIZATION', code: 'NOT_TEAM_OWNER', message: 'Only the team owner or commissioner can update this team' };
    }

    const updateData = camelToSnake(body) as Record<string, unknown>;
    const { data: updated, error: updateError } = await supabase
      .from('teams')
      .update(updateData as Database['public']['Tables']['teams']['Update'])
      .eq('id', teamId)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw { category: 'DATA', code: 'UPDATE_FAILED', message: updateError?.message ?? 'Update failed' };
    }

    ok(res, snakeToCamel(updated), requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
