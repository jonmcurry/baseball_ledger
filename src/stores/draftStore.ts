/**
 * Draft Store
 *
 * Zustand store for draft state management.
 * No persistence -- draft state is transient.
 * Uses immer middleware for clean nested-state mutations (REQ-STATE-005).
 *
 * Layer 4: State management. Uses draft-service for API calls.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DraftState } from '@lib/types/draft';
import type { PlayerFilterOptions } from '@services/draft-service';
import { transformPoolRows } from '@lib/transforms/player-pool-transform';
import type { AvailablePlayer } from '@lib/transforms/player-pool-transform';
import * as draftService from '@services/draft-service';

export type { AvailablePlayer } from '@lib/transforms/player-pool-transform';

const DEFAULT_PAGE_SIZE = 50;

/** Extract error message from Error instances or AppError objects from api-client */
function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return (err as { message: string }).message;
  }
  return fallback;
}

export interface DraftStoreState {
  draftState: DraftState | null;
  availablePlayers: AvailablePlayer[];
  totalAvailablePlayers: number;
  playerCurrentPage: number;
  playerPageSize: number;
  isLoading: boolean;
  error: string | null;
  pickTimerSeconds: number;
}

export interface DraftStoreActions {
  fetchDraftState: (leagueId: string) => Promise<void>;
  fetchAvailablePlayers: (leagueId: string, filters?: PlayerFilterOptions) => Promise<void>;
  submitPick: (leagueId: string, player: AvailablePlayer) => Promise<void>;
  setAvailablePlayers: (players: AvailablePlayer[]) => void;
  tickTimer: () => void;
  resetTimer: (seconds: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type DraftStoreType = DraftStoreState & DraftStoreActions;

const initialState: DraftStoreState = {
  draftState: null,
  availablePlayers: [],
  totalAvailablePlayers: 0,
  playerCurrentPage: 1,
  playerPageSize: DEFAULT_PAGE_SIZE,
  isLoading: false,
  error: null,
  pickTimerSeconds: 60,
};

export const useDraftStore = create<DraftStoreType>()(
  devtools(
    immer((set) => ({
      ...initialState,

      fetchDraftState: async (leagueId) => {
        set((state) => { state.isLoading = true; state.error = null; }, false, 'fetchDraftState/start');
        try {
          const data = await draftService.fetchDraftState(leagueId);
          set((state) => { state.draftState = data; state.isLoading = false; }, false, 'fetchDraftState/success');
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error = getErrorMessage(err, 'Failed to fetch draft state');
          }, false, 'fetchDraftState/error');
        }
      },

      fetchAvailablePlayers: async (leagueId, filters) => {
        set((state) => { state.error = null; }, false, 'fetchAvailablePlayers/start');
        try {
          const mergedFilters = { pageSize: DEFAULT_PAGE_SIZE, sortBy: 'nameLast', sortOrder: 'asc' as const, ...filters };
          const result = await draftService.fetchAvailablePlayers(leagueId, mergedFilters);
          const players = transformPoolRows(result.rows);
          set((state) => {
            state.availablePlayers = players;
            state.totalAvailablePlayers = result.totalRows;
            state.playerCurrentPage = mergedFilters.page ?? 1;
            state.playerPageSize = mergedFilters.pageSize ?? DEFAULT_PAGE_SIZE;
          }, false, 'fetchAvailablePlayers/success');
        } catch (err) {
          set((state) => {
            state.error = getErrorMessage(err, 'Failed to fetch available players');
          }, false, 'fetchAvailablePlayers/error');
        }
      },

      submitPick: async (leagueId, player) => {
        set((state) => { state.isLoading = true; state.error = null; }, false, 'submitPick/start');
        try {
          await draftService.submitPick(leagueId, {
            playerId: player.playerId,
            playerName: `${player.nameFirst} ${player.nameLast}`,
            position: player.primaryPosition,
            seasonYear: player.seasonYear,
            playerCard: player.playerCard as unknown as Record<string, unknown>,
          });
          // Refetch both draft state and available players after pick.
          // The backend processes CPU picks synchronously, so the refetch
          // returns the updated position after all CPU auto-picks complete.
          const [freshState, freshResult] = await Promise.all([
            draftService.fetchDraftState(leagueId),
            draftService.fetchAvailablePlayers(leagueId, { pageSize: DEFAULT_PAGE_SIZE, sortBy: 'nameLast', sortOrder: 'asc' }),
          ]);
          set((state) => {
            state.isLoading = false;
            state.draftState = freshState;
            state.availablePlayers = transformPoolRows(freshResult.rows);
            state.totalAvailablePlayers = freshResult.totalRows;
            state.playerCurrentPage = 1;
          }, false, 'submitPick/success');
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error = getErrorMessage(err, 'Failed to submit pick');
          }, false, 'submitPick/error');
        }
      },

      setAvailablePlayers: (players) =>
        set((state) => { state.availablePlayers = players; }, false, 'setAvailablePlayers'),

      tickTimer: () =>
        set((state) => {
          state.pickTimerSeconds = Math.max(0, state.pickTimerSeconds - 1);
        }, false, 'tickTimer'),

      resetTimer: (seconds) =>
        set((state) => { state.pickTimerSeconds = seconds; }, false, 'resetTimer'),

      setLoading: (loading) =>
        set((state) => { state.isLoading = loading; }, false, 'setLoading'),

      setError: (error) =>
        set((state) => { state.error = error; }, false, 'setError'),

      reset: () => set((state) => { Object.assign(state, initialState); }, false, 'reset'),
    })),
    { name: 'DraftStore', enabled: import.meta.env.DEV },
  ),
);
