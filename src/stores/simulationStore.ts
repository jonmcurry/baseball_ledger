/**
 * Simulation Store
 *
 * REQ-STATE-012 through REQ-STATE-014: Simulation progress and results.
 * No persistence -- simulation state is transient.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type SimulationStatus = 'idle' | 'running' | 'complete' | 'error';

export interface SimulationResult {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface SimulationState {
  status: SimulationStatus;
  totalGames: number;
  completedGames: number;
  results: SimulationResult[];
  error: string | null;
}

export interface SimulationActions {
  startSimulation: (totalGames: number) => void;
  addResult: (result: SimulationResult) => void;
  completeSimulation: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

export type SimulationStore = SimulationState & SimulationActions;

const initialState: SimulationState = {
  status: 'idle',
  totalGames: 0,
  completedGames: 0,
  results: [],
  error: null,
};

export const useSimulationStore = create<SimulationStore>()(
  devtools(
    (set) => ({
      ...initialState,

      startSimulation: (totalGames) =>
        set(
          {
            status: 'running',
            totalGames,
            completedGames: 0,
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
    }),
    { name: 'SimulationStore' },
  ),
);
