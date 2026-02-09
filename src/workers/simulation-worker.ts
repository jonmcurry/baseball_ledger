/**
 * Simulation Web Worker
 *
 * REQ-NFR-008: Client-side simulation runs in a Web Worker so the UI
 * thread maintains 60fps. The "Processing Ledger..." animation and all
 * UI interactions remain responsive during simulation.
 *
 * Message protocol:
 * - { type: 'runGame', config } -> { type: 'gameResult', result }
 * - { type: 'runDay', dayNumber, games, baseSeed } -> { type: 'dayResult', result }
 * - Errors: { type: 'error', message }
 */

import { runGame } from '../lib/simulation/game-runner';
import type { RunGameConfig } from '../lib/simulation/game-runner';
import { runDay } from '../lib/simulation/season-runner';
import type { DayGameConfig } from '../lib/simulation/season-runner';

export interface WorkerRunGameMessage {
  type: 'runGame';
  config: RunGameConfig;
}

export interface WorkerRunDayMessage {
  type: 'runDay';
  dayNumber: number;
  games: DayGameConfig[];
  baseSeed: number;
}

export type WorkerMessage = WorkerRunGameMessage | WorkerRunDayMessage;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case 'runGame': {
        // Reconstruct Maps from serialized data (postMessage serializes Maps to plain objects)
        const config = rebuildRunGameConfig(msg.config);
        const result = runGame(config);
        self.postMessage({ type: 'gameResult', result });
        break;
      }
      case 'runDay': {
        const games = msg.games.map(rebuildDayGameConfig);
        const result = runDay(msg.dayNumber, games, msg.baseSeed);
        self.postMessage({ type: 'dayResult', result });
        break;
      }
      default:
        self.postMessage({ type: 'error', message: `Unknown message type: ${(msg as { type: string }).type}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown worker error';
    self.postMessage({ type: 'error', message });
  }
};

/**
 * Rebuild Map objects from serialized config (postMessage converts Maps to objects).
 */
function rebuildRunGameConfig(config: RunGameConfig): RunGameConfig {
  return {
    ...config,
    homeBatterCards: rebuildMap(config.homeBatterCards),
    awayBatterCards: rebuildMap(config.awayBatterCards),
  };
}

function rebuildDayGameConfig(config: DayGameConfig): DayGameConfig {
  return {
    ...config,
    homeBatterCards: rebuildMap(config.homeBatterCards),
    awayBatterCards: rebuildMap(config.awayBatterCards),
  };
}

function rebuildMap<K, V>(mapOrObj: Map<K, V> | Record<string, V>): Map<K, V> {
  if (mapOrObj instanceof Map) return mapOrObj;
  return new Map(Object.entries(mapOrObj)) as Map<K, V>;
}
