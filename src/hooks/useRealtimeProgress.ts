/**
 * useRealtimeProgress Hook
 *
 * Subscribes to Supabase Realtime simulation progress updates.
 * Pushes updates to simulationStore. Invalidates league/roster/stats
 * caches on completion per REQ-STATE-014.
 *
 * Layer 5: Hook. Composes stores. Does not import components.
 */

import { useEffect } from 'react';
import { useSimulationStore } from '@stores/simulationStore';
import { useLeagueStore } from '@stores/leagueStore';

export function useRealtimeProgress(leagueId: string | null) {
  const subscribeToSimProgress = useSimulationStore((s) => s.subscribeToSimProgress);
  const unsubscribeFromSimProgress = useSimulationStore((s) => s.unsubscribeFromSimProgress);
  const status = useSimulationStore((s) => s.status);
  const fetchLeagueData = useLeagueStore((s) => s.fetchLeagueData);

  // Subscribe to realtime progress when league is active
  useEffect(() => {
    if (!leagueId) return;

    subscribeToSimProgress(leagueId);

    return () => {
      unsubscribeFromSimProgress();
    };
  }, [leagueId, subscribeToSimProgress, unsubscribeFromSimProgress]);

  // REQ-STATE-014: Invalidate caches when simulation completes or errors
  useEffect(() => {
    if (!leagueId) return;
    if (status === 'complete' || status === 'error') {
      fetchLeagueData(leagueId);
    }
  }, [status, leagueId, fetchLeagueData]);

  return {
    status,
  };
}
