/**
 * Simulation Store
 *
 * REQ-STATE-012 through REQ-STATE-014: Simulation progress and results.
 * No persistence -- simulation state is transient.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import * as simulationService from '@services/simulation-service';
import { useLeagueStore } from './leagueStore';
import { useRosterStore } from './rosterStore';
import { useStatsStore } from './statsStore';

export type SimulationStatus = 'idle' | 'running' | 'complete' | 'error';

export interface SimulationResult {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface PlayoffGameResult {
  round: string;
  seriesId: string;
  gameNumber: number;
  isPlayoffsComplete: boolean;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface SimulationState {
  status: SimulationStatus;
  totalGames: number;
  completedGames: number;
  totalDays: number;
  currentDay: number;
  results: SimulationResult[];
  error: string | null;
  lastPlayoffResult: PlayoffGameResult | null;
}

export interface SimulationActions {
  startSimulation: (totalGames: number) => void;
  addResult: (result: SimulationResult) => void;
  completeSimulation: () => void;
  setError: (error: string) => void;
  reset: () => void;
  runSimulation: (leagueId: string, days: number | 'season') => Promise<void>;
  subscribeToSimProgress: (leagueId: string) => void;
  unsubscribeFromSimProgress: () => void;
}

export type SimulationStore = SimulationState & SimulationActions;

const initialState: SimulationState = {
  status: 'idle',
  totalGames: 0,
  completedGames: 0,
  totalDays: 0,
  currentDay: 0,
  results: [],
  error: null,
  lastPlayoffResult: null,
};

export const useSimulationStore = create<SimulationStore>()(
  devtools(
    (set, _get) => ({
      ...initialState,

      startSimulation: (totalGames) =>
        set(
          {
            status: 'running',
            totalGames,
            completedGames: 0,
            totalDays: 0,
            currentDay: 0,
            results: [],
            error: null,
          },
          false,
          'startSimulation',
        ),

      addResult: (result) =>
        set(
          (state) => ({
            completedGames: state.completedGames + 1,
            results: [...state.results, result],
          }),
          false,
          'addResult',
        ),

      completeSimulation: () =>
        set({ status: 'complete' }, false, 'completeSimulation'),

      setError: (error) =>
        set({ status: 'error', error }, false, 'setError'),

      reset: () => set(initialState, false, 'reset'),

      runSimulation: async (leagueId, days) => {
        const maxDays = days === 'season' ? 162 : (days as number);
        set({
          status: 'running', totalDays: maxDays, currentDay: 0,
          completedGames: 0, totalGames: 0, results: [], error: null,
          lastPlayoffResult: null,
        }, false, 'runSimulation/start');

        try {
          let daysDone = 0;
          for (let d = 0; d < maxDays; d++) {
            const result = await simulationService.startSimulation(leagueId);
            daysDone++;

            if (result.games.length === 0) break;

            set((state) => ({
              currentDay: daysDone,
              completedGames: state.completedGames + result.games.length,
            }), false, 'runSimulation/dayComplete');

            if (result.playoff && result.games.length > 0) {
              const game = result.games[0] as {
                homeTeamId?: string; awayTeamId?: string;
                homeScore?: number; awayScore?: number;
              };
              set({
                lastPlayoffResult: {
                  round: result.playoff.round,
                  seriesId: result.playoff.seriesId,
                  gameNumber: result.playoff.gameNumber,
                  isPlayoffsComplete: result.playoff.isPlayoffsComplete,
                  homeTeamId: game.homeTeamId ?? '',
                  awayTeamId: game.awayTeamId ?? '',
                  homeScore: game.homeScore ?? 0,
                  awayScore: game.awayScore ?? 0,
                },
              }, false, 'runSimulation/playoffResult');
            }
          }

          set({ status: 'complete', currentDay: daysDone, totalDays: daysDone },
            false, 'runSimulation/complete');

          // REQ-STATE-011: Invalidate dependent caches after simulation completes
          useLeagueStore.getState().invalidateLeagueCache();
          useRosterStore.getState().invalidateRosterCache(leagueId);
          useStatsStore.getState().invalidateStatsCache(leagueId);
        } catch (err) {
          set({
            status: 'error',
            error: err instanceof Error ? err.message : 'Simulation failed',
          }, false, 'runSimulation/error');
        }
      },

      subscribeToSimProgress: (leagueId) => {
        simulationService.subscribeToProgress(leagueId, (progress) => {
          set({
            totalGames: progress.totalGames,
            completedGames: progress.completedGames,
            status: progress.status === 'completed' ? 'complete' : progress.status === 'error' ? 'error' : 'running',
            error: progress.errorMessage ?? null,
          }, false, 'simProgress');
        });
      },

      unsubscribeFromSimProgress: () => {
        simulationService.unsubscribeFromProgress();
      },
    }),
    { name: 'SimulationStore', enabled: import.meta.env.DEV },
  ),
);
