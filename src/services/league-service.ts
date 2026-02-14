/**
 * League Service
 *
 * Layer 3 service module that calls Layer 2 API endpoints.
 */

import type { LeagueSummary, TeamSummary, DivisionStandings } from '@lib/types/league';
import type { ScheduleDay, ScheduleGameSummary } from '@lib/types/schedule';
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
  negroLeaguesEnabled?: boolean;
}): Promise<LeagueSummary> {
  const response = await apiPost<LeagueSummary>('/api/leagues', data);
  return response.data;
}

export async function deleteLeague(id: string): Promise<void> {
  await apiDelete(`/api/leagues/${id}`);
}

export async function joinLeague(inviteKey: string): Promise<JoinLeagueResult> {
  const response = await apiPost<JoinLeagueResult>('/api/leagues/join', { inviteKey });
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

/** Raw row shape returned by the schedule API (flat, one row per game) */
interface ScheduleRow {
  id: string;
  dayNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  isComplete: boolean;
  gameLogId: string | null;
}

export async function fetchSchedule(leagueId: string, day?: number): Promise<ScheduleDay[]> {
  const params = day !== undefined ? `?day=${day}` : '';
  const response = await apiGet<ScheduleRow[]>(`/api/leagues/${leagueId}/schedule${params}`);

  // Group flat game rows into ScheduleDay[] keyed by dayNumber
  const dayMap = new Map<number, ScheduleGameSummary[]>();
  for (const row of response.data) {
    let games = dayMap.get(row.dayNumber);
    if (!games) {
      games = [];
      dayMap.set(row.dayNumber, games);
    }
    games.push({
      id: row.id,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      isComplete: row.isComplete,
      gameLogId: row.gameLogId,
    });
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, games]) => ({ dayNumber, games }));
}

export async function startDraft(leagueId: string): Promise<void> {
  await apiPost(`/api/leagues/${leagueId}/draft`, { action: 'start' });
}
