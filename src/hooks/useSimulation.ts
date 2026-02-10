/**
 * useSimulation Hook
 *
 * Composes simulationStore with derived progress percentage.
 *
 * Layer 5: Hook. Composes stores. Does not import components.
 */

import { useSimulationStore } from '@stores/simulationStore';

export function useSimulation() {
  const status = useSimulationStore((s) => s.status);
  const totalGames = useSimulationStore((s) => s.totalGames);
  const completedGames = useSimulationStore((s) => s.completedGames);
  const results = useSimulationStore((s) => s.results);
  const error = useSimulationStore((s) => s.error);
  const startSimulation = useSimulationStore((s) => s.startSimulation);
  const runSimulation = useSimulationStore((s) => s.runSimulation);
  const reset = useSimulationStore((s) => s.reset);

  const progressPct = totalGames === 0 ? 0 : Math.round((completedGames / totalGames) * 100);
  const isRunning = status === 'running';

  return {
    status,
    totalGames,
    completedGames,
    results,
    error,
    progressPct,
    isRunning,
    startSimulation,
    runSimulation,
    reset,
  };
}
