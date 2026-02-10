/**
 * Simulation Service
 *
 * Layer 3 real service module for simulation operations.
 * Single-day simulation via POST /api/leagues/:id/simulate.
 * Uses Supabase Realtime for progress updates.
 */

import type { SimulationProgress } from '@lib/types/api';
import { apiPost } from './api-client';
import { getSupabaseClient } from '@lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

let activeChannel: RealtimeChannel | null = null;

export interface SimDayResult {
  dayNumber: number;
  games: unknown[];
}

export async function startSimulation(
  leagueId: string,
): Promise<SimDayResult> {
  const response = await apiPost<{ dayNumber?: number; games?: unknown[] }>(
    `/api/leagues/${leagueId}/simulate`,
    { days: 1 },
  );

  return {
    dayNumber: response.data.dayNumber ?? 0,
    games: response.data.games ?? [],
  };
}

export function subscribeToProgress(
  leagueId: string,
  callback: (progress: SimulationProgress) => void,
): void {
  unsubscribeFromProgress();

  const supabase = getSupabaseClient();
  activeChannel = supabase
    .channel(`simulation_progress:${leagueId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'simulation_progress',
        filter: `league_id=eq.${leagueId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        callback({
          leagueId: row.league_id as string,
          status: row.status as SimulationProgress['status'],
          totalGames: row.total_games as number,
          completedGames: row.completed_games as number,
          currentDay: row.current_day as number,
          startedAt: row.started_at as string,
          updatedAt: row.updated_at as string,
          errorMessage: row.error_message as string | undefined,
        });
      },
    )
    .subscribe();
}

export function unsubscribeFromProgress(): void {
  if (activeChannel) {
    const supabase = getSupabaseClient();
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}
