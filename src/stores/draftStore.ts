/**
 * Draft Store
 *
 * Zustand store for draft state management.
 * No persistence -- draft state is transient.
 *
 * Layer 4: State management. Uses draft-service for API calls.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DraftState, DraftPickResult } from '@lib/types/draft';
import type { PlayerCard } from '@lib/types/player';
import type { PlayerFilterOptions } from '@services/draft-service';
import * as draftService from '@services/draft-service';

export interface AvailablePlayer {
  playerId: string;
  nameFirst: string;
  nameLast: string;
  seasonYear: number;
  primaryPosition: string;
  playerCard: PlayerCard;
}

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
    (set) => ({
      ...initialState,

      fetchDraftState: async (leagueId) => {
        set({ isLoading: true, error: null }, false, 'fetchDraftState/start');
        try {
          const state = await draftService.fetchDraftState(leagueId);
          set({ draftState: state, isLoading: false }, false, 'fetchDraftState/success');
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch draft state',
          }, false, 'fetchDraftState/error');
        }
      },

      fetchAvailablePlayers: async (leagueId, filters) => {
        set({ isLoading: true, error: null }, false, 'fetchAvailablePlayers/start');
        try {
          const rows = await draftService.fetchAvailablePlayers(leagueId, filters);
          const players: AvailablePlayer[] = rows.map((row) => {
            const card = row.player_card as unknown as PlayerCard;
            return {
              playerId: card.playerId ?? row.player_id,
              nameFirst: card.nameFirst ?? '',
              nameLast: card.nameLast ?? '',
              seasonYear: card.seasonYear ?? row.season_year,
              primaryPosition: card.primaryPosition ?? 'DH',
              playerCard: card,
            };
          });
          set({ availablePlayers: players, isLoading: false }, false, 'fetchAvailablePlayers/success');
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch available players',
          }, false, 'fetchAvailablePlayers/error');
        }
      },

      submitPick: async (leagueId, player) => {
        set({ isLoading: true, error: null }, false, 'submitPick/start');
        try {
          const result: DraftPickResult = await draftService.submitPick(leagueId, {
            playerId: player.playerId,
            playerName: `${player.nameFirst} ${player.nameLast}`,
            position: player.primaryPosition,
            seasonYear: player.seasonYear,
            playerCard: player.playerCard as unknown as Record<string, unknown>,
          });
          set((state) => ({
            isLoading: false,
            draftState: state.draftState ? {
              ...state.draftState,
              picks: [...state.draftState.picks, result],
              currentPick: state.draftState.currentPick + 1,
              currentTeamId: result.nextTeamId,
              status: result.isComplete ? 'completed' : 'in_progress',
            } : null,
            availablePlayers: state.availablePlayers.filter((p) => p.playerId !== player.playerId),
          }), false, 'submitPick/success');
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to submit pick',
          }, false, 'submitPick/error');
        }
      },

      setAvailablePlayers: (players) =>
        set({ availablePlayers: players }, false, 'setAvailablePlayers'),

      tickTimer: () =>
        set((state) => ({
          pickTimerSeconds: Math.max(0, state.pickTimerSeconds - 1),
        }), false, 'tickTimer'),

      resetTimer: (seconds) =>
        set({ pickTimerSeconds: seconds }, false, 'resetTimer'),

      setLoading: (loading) =>
        set({ isLoading: loading }, false, 'setLoading'),

      setError: (error) =>
        set({ error }, false, 'setError'),

      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'DraftStore' },
  ),
);
