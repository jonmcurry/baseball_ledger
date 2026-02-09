/**
 * Worker API - Promise wrapper for simulation Web Worker
 *
 * REQ-NFR-008: Client-side simulation must run in a Web Worker.
 *
 * Provides typed async functions that communicate with the simulation
 * worker via postMessage/onmessage. Falls back to main-thread execution
 * when Worker is unavailable (SSR, tests, unsupported environments).
 *
 * Layer 1: Client infrastructure, no server dependencies.
 */

import type { GameResult } from '../types/game';
import type { RunGameConfig } from './game-runner';
import { runGame } from './game-runner';
import type { DayGameConfig, DayResult } from './season-runner';
import { runDay } from './season-runner';

let workerInstance: Worker | null = null;
let pendingResolve: ((value: unknown) => void) | null = null;
let pendingReject: ((reason: unknown) => void) | null = null;

/**
 * Check if Web Workers are available in the current environment.
 */
export function isWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Get or create the simulation worker singleton.
 */
function getWorker(): Worker | null {
  if (!isWorkerAvailable()) return null;

  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../../workers/simulation-worker.ts', import.meta.url),
      { type: 'module' },
    );

    workerInstance.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'error') {
        pendingReject?.(new Error(data.message));
      } else {
        pendingResolve?.(data.result ?? data);
      }
      pendingResolve = null;
      pendingReject = null;
    };

    workerInstance.onerror = (err) => {
      pendingReject?.(err);
      pendingResolve = null;
      pendingReject = null;
    };
  }

  return workerInstance;
}

/**
 * Serialize a RunGameConfig for postMessage (convert Maps to plain objects).
 */
function serializeConfig(config: RunGameConfig): RunGameConfig {
  return {
    ...config,
    homeBatterCards: Object.fromEntries(config.homeBatterCards) as unknown as Map<string, unknown>,
    awayBatterCards: Object.fromEntries(config.awayBatterCards) as unknown as Map<string, unknown>,
  } as RunGameConfig;
}

/**
 * Serialize a DayGameConfig for postMessage.
 */
function serializeDayConfig(config: DayGameConfig): DayGameConfig {
  return {
    ...config,
    homeBatterCards: Object.fromEntries(config.homeBatterCards) as unknown as Map<string, unknown>,
    awayBatterCards: Object.fromEntries(config.awayBatterCards) as unknown as Map<string, unknown>,
  } as DayGameConfig;
}

/**
 * Run a single game in a Web Worker.
 *
 * Falls back to main-thread if Worker is unavailable.
 */
export async function simulateGameInWorker(config: RunGameConfig): Promise<GameResult> {
  const worker = getWorker();

  if (!worker) {
    return runGame(config);
  }

  return new Promise<GameResult>((resolve, reject) => {
    pendingResolve = resolve as (value: unknown) => void;
    pendingReject = reject;
    worker.postMessage({ type: 'runGame', config: serializeConfig(config) });
  });
}

/**
 * Run a day's games in a Web Worker.
 *
 * Falls back to main-thread if Worker is unavailable.
 */
export async function simulateDayInWorker(
  dayNumber: number,
  games: DayGameConfig[],
  baseSeed: number,
): Promise<DayResult> {
  const worker = getWorker();

  if (!worker) {
    return runDay(dayNumber, games, baseSeed);
  }

  return new Promise<DayResult>((resolve, reject) => {
    pendingResolve = resolve as (value: unknown) => void;
    pendingReject = reject;
    worker.postMessage({
      type: 'runDay',
      dayNumber,
      games: games.map(serializeDayConfig),
      baseSeed,
    });
  });
}

/**
 * Terminate the worker (for cleanup).
 */
export function terminateWorker(): void {
  workerInstance?.terminate();
  workerInstance = null;
  pendingResolve = null;
  pendingReject = null;
}

/**
 * Reset the worker singleton (for testing).
 */
export function _resetWorker(): void {
  workerInstance = null;
  pendingResolve = null;
  pendingReject = null;
}
