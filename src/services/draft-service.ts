/**
 * Draft Service
 *
 * Layer 3 real service module for draft operations.
 */

import type { DraftState, DraftPickResult } from '@lib/types/draft';
import type { PlayerPoolRow } from '@lib/types/database';
import { apiGet, apiGetPaginated, apiPost } from './api-client';

export interface PlayerFilterOptions {
  position?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function startDraft(leagueId: string): Promise<DraftState> {
  const response = await apiPost<DraftState>(`/api/leagues/${leagueId}/draft`, { action: 'start' });
  return response.data;
}

export async function submitPick(
  leagueId: string,
  pick: {
    playerId: string;
    playerName: string;
    position: string;
    seasonYear: number;
    playerCard: Record<string, unknown>;
  },
): Promise<DraftPickResult> {
  const response = await apiPost<DraftPickResult>(
    `/api/leagues/${leagueId}/draft`,
    { action: 'pick', ...pick },
  );
  return response.data;
}

export async function fetchDraftState(leagueId: string): Promise<DraftState> {
  const response = await apiGet<DraftState>(`/api/leagues/${leagueId}/draft`);
  return response.data;
}

export async function autoPick(leagueId: string): Promise<{ status: string }> {
  const response = await apiPost<{ status: string }>(
    `/api/leagues/${leagueId}/draft`,
    { action: 'auto-pick' },
  );
  return response.data;
}

export async function fetchAvailablePlayers(
  leagueId: string,
  filters?: PlayerFilterOptions,
): Promise<PlayerPoolRow[]> {
  const params = new URLSearchParams({ drafted: 'false' });
  if (filters?.position) params.set('position', filters.position);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

  const response = await apiGetPaginated<PlayerPoolRow>(
    `/api/leagues/${leagueId}/draft?resource=players&${params}`,
  );
  return response.data;
}
