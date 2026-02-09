/**
 * Draft Service
 *
 * Layer 3 real service module for draft operations.
 */

import type { DraftState, DraftPickResult } from '@lib/types/draft';
import { apiGet, apiPost } from './api-client';

export async function startDraft(leagueId: string): Promise<DraftState> {
  const response = await apiPost<DraftState>(`/api/leagues/${leagueId}/draft/start`);
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
    `/api/leagues/${leagueId}/draft/pick`,
    pick,
  );
  return response.data;
}

export async function fetchDraftState(leagueId: string): Promise<DraftState> {
  const response = await apiGet<DraftState>(`/api/leagues/${leagueId}/draft/state`);
  return response.data;
}
