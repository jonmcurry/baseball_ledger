/**
 * useWorkerSimulation Hook
 *
 * Wraps simulateGameInWorker() for use in React components.
 * Manages status transitions: idle -> running -> complete | error.
 * Terminates the worker on unmount for cleanup.
 *
 * REQ-NFR-008: Client-side simulation must run in a Web Worker.
 *
 * Layer 5: Hook. Composes worker-api. Does not import components.
 */

import { useState, useCallback, useEffect } from 'react';
import { simulateGameInWorker, terminateWorker } from '@lib/simulation/worker-api';
import type { GameResult } from '@lib/types/game';
import type { RunGameConfig } from '@lib/simulation/game-runner';

export type WorkerStatus = 'idle' | 'running' | 'complete' | 'error';

export interface UseWorkerSimulationReturn {
  status: WorkerStatus;
  result: GameResult | null;
  error: string | null;
  simulateGame: (config: RunGameConfig) => Promise<void>;
  reset: () => void;
}

export function useWorkerSimulation(): UseWorkerSimulationReturn {
  const [status, setStatus] = useState<WorkerStatus>('idle');
  const [result, setResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulateGame = useCallback(async (config: RunGameConfig) => {
    setStatus('running');
    setResult(null);
    setError(null);

    try {
      const gameResult = await simulateGameInWorker(config);
      setResult(gameResult);
      setStatus('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      terminateWorker();
    };
  }, []);

  return { status, result, error, simulateGame, reset };
}
