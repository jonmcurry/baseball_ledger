/**
 * Roster Service
 *
 * Layer 3 real service module that calls Layer 2 API endpoints.
 * Replaces mock-roster-service.ts for production use.
 */

import type { RosterEntry, LineupUpdate } from '@lib/types/roster';
import type { TeamSummary } from '@lib/types/league';
import { apiGet, apiPatch } from './api-client';

export async function fetchRoster(leagueId: string, teamId: string): Promise<RosterEntry[]> {
  const response = await apiGet<RosterEntry[]>(
    `/api/leagues/${leagueId}/teams?tid=${teamId}&include=roster`,
  );
  return response.data;
}

export async function updateTeam(
  leagueId: string,
  teamId: string,
  updates: { name?: string; city?: string; managerProfile?: string },
): Promise<TeamSummary> {
  const response = await apiPatch<TeamSummary>(
    `/api/leagues/${leagueId}/teams?tid=${teamId}`,
    updates,
  );
  return response.data;
}

export async function updateLineup(
  leagueId: string,
  teamId: string,
  updates: LineupUpdate[],
): Promise<RosterEntry[]> {
  const response = await apiPatch<RosterEntry[]>(
    `/api/leagues/${leagueId}/teams?tid=${teamId}&include=roster`,
    { updates },
  );
  return response.data;
}
