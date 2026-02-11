/**
 * POST /api/leagues -- Create a new league
 *
 * Creates a league with the authenticated user as commissioner.
 * After league insert:
 *   1. Generates teams with random names/divisions (REQ-LGE-004, REQ-LGE-005)
 *   2. Auto-assigns first team to commissioner (REQ-LGE-007)
 *   3. Generates player pool from Lahman CSVs (REQ-DATA-002)
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
import { createServerClient } from '../../src/lib/supabase/server';
import type { Json } from '../../src/lib/types/database';
import { loadCsvFiles } from '../_lib/load-csvs';
import { runCsvPipeline } from '../../src/lib/csv/load-pipeline';
import { generateTeamNames } from '../../src/lib/league/team-generator';
import { assignDivisions } from '../../src/lib/league/division-assignment';
import { SeededRNG } from '../../src/lib/rng/seeded-rng';

const BATCH_SIZE = 1000;

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

    // Generate teams with random names and division assignments (REQ-LGE-004, REQ-LGE-005)
    const MANAGER_STYLES = ['balanced', 'conservative', 'aggressive', 'analytical'] as const;
    const rng = new SeededRNG(Date.now());
    const teamNames = generateTeamNames(body.teamCount, rng);
    const divisions = assignDivisions(body.teamCount);

    const teamRecords = teamNames.map((tn, i) => ({
      league_id: data.id,
      name: tn.mascot,
      city: tn.city,
      owner_id: i === 0 ? userId : null, // First team -> commissioner (REQ-LGE-007)
      manager_profile: MANAGER_STYLES[i % MANAGER_STYLES.length],
      league_division: divisions[i].leagueDivision,
      division: divisions[i].division,
    }));

    const { error: teamsError } = await supabase
      .from('teams')
      .insert(teamRecords);

    if (teamsError) {
      console.error(`Team creation failed for league ${data.id}:`, teamsError.message);
      throw { category: 'DATA', code: 'TEAM_INSERT_FAILED', message: teamsError.message };
    }

    // Generate player pool from CSVs (REQ-DATA-002, REQ-DATA-005, REQ-DATA-006)
    try {
      const csvFiles = loadCsvFiles();
      const pipeline = runCsvPipeline({
        ...csvFiles,
        yearRangeStart: body.yearRangeStart,
        yearRangeEnd: body.yearRangeEnd,
      });

      // Batch insert cards into player_pool table
      if (pipeline.cards.length > 0) {
        const poolRecords = pipeline.cards.map((card) => ({
          league_id: data.id,
          player_id: card.playerId,
          season_year: card.seasonYear,
          player_card: card as unknown as Json,
        }));

        for (let i = 0; i < poolRecords.length; i += BATCH_SIZE) {
          const batch = poolRecords.slice(i, i + BATCH_SIZE);
          const { error: poolError } = await supabase
            .from('player_pool')
            .insert(batch);

          if (poolError) {
            console.error(`Player pool batch insert failed for league ${data.id}:`, poolError.message);
          }
        }
      }

      // Update league with player name cache (REQ-DATA-003)
      await supabase
        .from('leagues')
        .update({ player_name_cache: pipeline.playerNameCache })
        .eq('id', data.id);
    } catch (poolErr) {
      // Graceful degradation: league is created, pool generation failed.
      // Pool can be regenerated later.
      console.error(`Player pool generation failed for league ${data.id}:`, poolErr);
    }

    const league = snakeToCamel(data);
    created(res, league, requestId, `/api/leagues/${data.id}`);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
