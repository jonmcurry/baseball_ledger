/**
 * Stats Service
 *
 * Layer 3 real service module that calls Layer 2 API endpoints.
 * Replaces mock-stats-service.ts for production use.
 *
 * REQ-NFR-019: Pagination at 50 rows/page.
 */

import type { BattingLeaderEntry, PitchingLeaderEntry, TeamAggregateStats } from '@lib/stats/leaders';
import type { PaginatedResponse } from '@lib/types/api';
import { apiGet, apiGetPaginated } from './api-client';

export async function fetchBattingLeaders(
  leagueId: string,
  page = 1,
  sortBy = 'BA',
  sortOrder: 'asc' | 'desc' = 'desc',
): Promise<PaginatedResponse<BattingLeaderEntry>> {
  return apiGetPaginated<BattingLeaderEntry>(
    `/api/leagues/${leagueId}/stats/batting?page=${page}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
  );
}

export async function fetchPitchingLeaders(
  leagueId: string,
  page = 1,
  sortBy = 'ERA',
  sortOrder: 'asc' | 'desc' = 'asc',
): Promise<PaginatedResponse<PitchingLeaderEntry>> {
  return apiGetPaginated<PitchingLeaderEntry>(
    `/api/leagues/${leagueId}/stats/pitching?page=${page}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
  );
}

export async function fetchTeamStats(leagueId: string): Promise<TeamAggregateStats[]> {
  const response = await apiGet<TeamAggregateStats[]>(
    `/api/leagues/${leagueId}/stats/team`,
  );
  return response.data;
}
