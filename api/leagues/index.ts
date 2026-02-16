/**
 * POST /api/leagues -- Create a new league
 *
 * Creates a league with the authenticated user as commissioner.
 * After league insert:
 *   1. Generates teams with random names/divisions (REQ-LGE-004, REQ-LGE-005)
 *   2. Auto-assigns first team to commissioner (REQ-LGE-007)
 *   3. Generates player pool: BBW binary cards for available seasons,
 *      formula cards from Lahman CSVs for all other seasons (REQ-DATA-002)
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
import { loadBbwSeason } from '../_lib/load-bbw';
import { runCsvPipeline } from '../../src/lib/csv/load-pipeline';
import { detectBbwYearsInRange, runBbwPipeline } from '../../src/lib/bbw/bbw-pipeline';
import { generateTeamNames } from '../../src/lib/league/team-generator';
import { assignDivisions } from '../../src/lib/league/division-assignment';
import { SeededRNG } from '../../src/lib/rng/seeded-rng';
import { calculatePlayerValue } from '../../src/lib/draft/ai-valuation';
import type { PlayerCard } from '../../src/lib/types/player';

const BATCH_SIZE = 200;

const CreateLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  teamCount: z.number().int().refine((n) => [18, 24, 30].includes(n), 'Must be 18, 24, or 30'),
  yearRangeStart: z.number().int().min(1901).max(2025).optional().default(1901),
  yearRangeEnd: z.number().int().min(1901).max(2025).optional().default(2025),
  injuriesEnabled: z.boolean().optional().default(false),
  negroLeaguesEnabled: z.boolean().optional().default(true),
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
        negro_leagues_enabled: body.negroLeaguesEnabled,
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

    // Generate player pool: BBW binary cards + Lahman formula cards (REQ-DATA-002, REQ-DATA-005)
    try {
      const allCards: PlayerCard[] = [];
      const allNameCache: Record<string, string> = {};

      // Detect BBW seasons within the requested year range
      const bbwYears = detectBbwYearsInRange(body.yearRangeStart, body.yearRangeEnd);

      // Load BBW binary cards for available seasons
      for (const year of bbwYears) {
        const season = loadBbwSeason(year);
        if (season) {
          const bbwResult = runBbwPipeline(
            season.players, season.battingStats, season.pitchingStats, year,
          );
          allCards.push(...bbwResult.cards);
          Object.assign(allNameCache, bbwResult.playerNameCache);
          console.log(`[league ${data.id}] BBW ${year}: ${bbwResult.cards.length} binary cards loaded`);
        }
      }

      // Generate formula cards from Lahman CSVs for non-BBW years
      const csvFiles = loadCsvFiles();
      const pipeline = runCsvPipeline({
        ...csvFiles,
        yearRangeStart: body.yearRangeStart,
        yearRangeEnd: body.yearRangeEnd,
        negroLeaguesEnabled: body.negroLeaguesEnabled,
        excludeYears: bbwYears,
      });

      allCards.push(...pipeline.cards);
      Object.assign(allNameCache, pipeline.playerNameCache);

      console.log(`[league ${data.id}] Pipeline: ${pipeline.cards.length} formula cards, ${bbwYears.length} BBW seasons (${allCards.length} total)`);
      if (pipeline.errors.length > 0) {
        console.warn(`[league ${data.id}] Pipeline errors (first 5):`, pipeline.errors.slice(0, 5));
      }

      // Batch insert all cards into player_pool table
      if (allCards.length > 0) {
        const poolRecords = allCards.map((card) => ({
          league_id: data.id,
          player_id: card.playerId,
          season_year: card.seasonYear,
          player_card: card as unknown as Json,
          valuation_score: calculatePlayerValue(card),
        }));

        let insertedCount = 0;
        let failedBatches = 0;
        for (let i = 0; i < poolRecords.length; i += BATCH_SIZE) {
          const batch = poolRecords.slice(i, i + BATCH_SIZE);
          const { error: poolError } = await supabase
            .from('player_pool')
            .insert(batch);

          if (poolError) {
            failedBatches++;
            console.error(`[league ${data.id}] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed (${batch.length} records):`, poolError.message);
          } else {
            insertedCount += batch.length;
          }
        }
        console.log(`[league ${data.id}] Pool insert complete: ${insertedCount} inserted, ${failedBatches} batches failed`);
      }

      // Update league with merged player name cache (REQ-DATA-003)
      await supabase
        .from('leagues')
        .update({ player_name_cache: allNameCache })
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
