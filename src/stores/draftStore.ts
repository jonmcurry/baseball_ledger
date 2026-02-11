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
import type { DraftState, DraftPickResult } from '@lib/types/draft';
import type { PlayerFilterOptions } from '@services/draft-service';
import { transformPoolRows } from '@lib/transforms/player-pool-transform';
import type { AvailablePlayer } from '@lib/transforms/player-pool-transform';
import * as draftService from '@services/draft-service';

export type { AvailablePlayer } from '@lib/transforms/player-pool-transform';

export interface DraftStoreState {
  draftState: DraftState | null;
  availablePlayers: AvailablePlayer[];
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
            state.error = err instanceof Error ? err.message : 'Failed to fetch draft state';
          }, false, 'fetchDraftState/error');
        }
      },

      fetchAvailablePlayers: async (leagueId, filters) => {
        set((state) => { state.isLoading = true; state.error = null; }, false, 'fetchAvailablePlayers/start');
        try {
          const rows = await draftService.fetchAvailablePlayers(leagueId, filters);
          const players = transformPoolRows(rows);
          set((state) => { state.availablePlayers = players; state.isLoading = false; }, false, 'fetchAvailablePlayers/success');
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error = err instanceof Error ? err.message : 'Failed to fetch available players';
          }, false, 'fetchAvailablePlayers/error');
        }
      },

      submitPick: async (leagueId, player) => {
        set((state) => { state.isLoading = true; state.error = null; }, false, 'submitPick/start');
        try {
          const result: DraftPickResult = await draftService.submitPick(leagueId, {
            playerId: player.playerId,
            playerName: `${player.nameFirst} ${player.nameLast}`,
            position: player.primaryPosition,
            seasonYear: player.seasonYear,
            playerCard: player.playerCard as unknown as Record<string, unknown>,
          });
          set((state) => {
            state.isLoading = false;
            if (state.draftState) {
              state.draftState.picks.push(result);
              state.draftState.currentPick += 1;
              state.draftState.currentTeamId = result.nextTeamId;
              state.draftState.status = result.isComplete ? 'completed' : 'in_progress';
            }
            state.availablePlayers = state.availablePlayers.filter(
              (p) => p.playerId !== player.playerId,
            );
          }, false, 'submitPick/success');
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error = err instanceof Error ? err.message : 'Failed to submit pick';
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
    { name: 'DraftStore' },
  ),
);
