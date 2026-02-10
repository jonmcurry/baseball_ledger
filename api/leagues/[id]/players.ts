/**
 * GET /api/leagues/:id/players -- Fetch player pool
 *
 * Returns paginated, filterable list of players in a league's player pool.
 * Default: undrafted players sorted by nameLast.
 *
 * Query params:
 *   drafted   - "true" | "false" (default: "false")
 *   page      - page number (default: 1)
 *   pageSize  - items per page (default: 100, max: 500)
 *   position  - filter by primaryPosition (e.g., "SP", "RF")
 *   search    - name substring search (ilike on nameFirst/nameLast)
 *   sortBy    - "nameLast" | "seasonYear" | "primaryPosition" (default: "nameLast")
 *   sortOrder - "asc" | "desc" (default: "asc")
 *
 * REQ-DATA-002: Player pool accessible for draft board.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkMethod } from '../../_lib/method-guard';
import { requireAuth } from '../../_lib/auth';
import { paginated } from '../../_lib/response';
import { handleApiError } from '../../_lib/errors';
import { createServerClient } from '@lib/supabase/server';

const SORT_COLUMN_MAP: Record<string, string> = {
  nameLast: 'player_card->nameLast',
  seasonYear: 'season_year',
  primaryPosition: 'player_card->primaryPosition',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkMethod(req, res, 'GET')) return;

  const requestId = crypto.randomUUID();
  try {
    await requireAuth(req);

    const leagueId = req.query.id as string;
    const drafted = req.query.drafted === 'true';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(req.query.pageSize as string, 10) || 100));
    const position = req.query.position as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'nameLast';
    const sortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';

    const supabase = createServerClient();

    let query = supabase
      .from('player_pool')
      .select('*', { count: 'exact' })
      .eq('league_id', leagueId)
      .eq('is_drafted', drafted);

    // Position filter
    if (position) {
      query = query.eq('player_card->>primaryPosition', position);
    }

    // Name search
    if (search) {
      query = query.or(
        `player_card->>nameFirst.ilike.%${search}%,player_card->>nameLast.ilike.%${search}%`,
      );
    }

    // Sorting
    const sortColumn = SORT_COLUMN_MAP[sortBy] || 'player_card->nameLast';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      throw { category: 'DATA', code: 'QUERY_FAILED', message: error.message };
    }

    paginated(res, data ?? [], { page, pageSize, totalRows: count ?? 0 }, requestId);
  } catch (err) {
    handleApiError(res, err, requestId);
  }
}
