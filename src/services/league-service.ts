/**
 * League Service
 *
 * Layer 3 service module that calls Layer 2 API endpoints.
 */

import type { LeagueSummary, TeamSummary, DivisionStandings } from '@lib/types/league';
import type { ScheduleDay } from '@lib/types/schedule';
import type { JoinLeagueResult } from '@lib/types/api';
import { apiGet, apiPost, apiDelete } from './api-client';

export async function fetchLeague(id: string): Promise<LeagueSummary> {
  const response = await apiGet<LeagueSummary>(`/api/leagues/${id}`);
  return response.data;
}

export async function createLeague(data: {
  name: string;
  teamCount: number;
  yearRangeStart?: number;
  yearRangeEnd?: number;
  injuriesEnabled?: boolean;
}): Promise<LeagueSummary> {
  const response = await apiPost<LeagueSummary>('/api/leagues', data);
  return response.data;
}

export async function deleteLeague(id: string): Promise<void> {
  await apiDelete(`/api/leagues/${id}`);
}

export async function joinLeague(id: string, inviteKey: string): Promise<JoinLeagueResult> {
  const response = await apiPost<JoinLeagueResult>(`/api/leagues/${id}`, { inviteKey });
  return response.data;
}

export async function fetchTeams(leagueId: string): Promise<TeamSummary[]> {
  const response = await apiGet<TeamSummary[]>(`/api/leagues/${leagueId}/teams`);
  return response.data;
}

export async function fetchStandings(leagueId: string): Promise<DivisionStandings[]> {
  const response = await apiGet<DivisionStandings[]>(`/api/leagues/${leagueId}/stats?type=standings`);
  return response.data;
}

export async function fetchSchedule(leagueId: string, day?: number): Promise<ScheduleDay[]> {
  const params = day !== undefined ? `?day=${day}` : '';
  const response = await apiGet<ScheduleDay[]>(`/api/leagues/${leagueId}/schedule${params}`);
  return response.data;
}
