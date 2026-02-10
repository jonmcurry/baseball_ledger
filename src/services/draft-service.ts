/**
 * Draft Service
 *
 * Layer 3 real service module for draft operations.
 */

import type { DraftState, DraftPickResult } from '@lib/types/draft';
import { apiGet, apiPost } from './api-client';

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
