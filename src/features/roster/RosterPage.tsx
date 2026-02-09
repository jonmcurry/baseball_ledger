/**
 * RosterPage
 *
 * Team roster management with lineup configuration.
 * Composes LineupDiamond, BenchPanel, and PitchingRotation.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTeam } from '@hooks/useTeam';
import { useLeague } from '@hooks/useLeague';
import { useRosterStore } from '@stores/rosterStore';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LineupDiamond } from './LineupDiamond';
import { BenchPanel } from './BenchPanel';
import { PitchingRotation } from './PitchingRotation';
import type { RosterEntry } from '@lib/types/roster';

export function RosterPage() {
  const { league } = useLeague();
  const { myTeam, roster, starters, bench, isRosterLoading, rosterError } = useTeam();
  const fetchRoster = useRosterStore((s) => s.fetchRoster);
  const saveLineup = useRosterStore((s) => s.saveLineup);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (league?.id && myTeam?.id) {
      fetchRoster(league.id, myTeam.id);
    }
  }, [league?.id, myTeam?.id, fetchRoster]);

  const rotation = useMemo(
    () => roster.filter((r) => r.rosterSlot === 'rotation'),
    [roster],
  );

  const bullpen = useMemo(
    () => roster.filter((r) => r.rosterSlot === 'bullpen'),
    [roster],
  );

  const closer = useMemo(
    () => roster.find((r) => r.rosterSlot === 'closer') ?? null,
    [roster],
  );

  const handlePositionClick = useCallback((_position: string) => {
    // Position assignment - handled through UI state in a future enhancement
  }, []);

  const handleBenchPlayerSelect = useCallback((_entry: RosterEntry) => {
    // Bench-to-lineup swap - handled through UI state in a future enhancement
  }, []);

  const handleSaveLineup = useCallback(async () => {
    if (!league?.id || !myTeam?.id) return;
    setIsSaving(true);
    try {
      await saveLineup(league.id, myTeam.id);
    } finally {
      setIsSaving(false);
    }
  }, [league?.id, myTeam?.id, saveLineup]);

  if (isRosterLoading) {
    return <LoadingLedger message="Loading roster..." />;
  }

  return (
    <div className="space-y-gutter-lg">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-bold text-ballpark">Roster</h2>
        <button
          type="button"
          onClick={handleSaveLineup}
          disabled={isSaving}
          className="rounded-button bg-ballpark px-4 py-2 text-sm font-medium text-old-lace hover:opacity-90 disabled:opacity-40"
        >
          {isSaving ? 'Saving...' : 'Save Lineup'}
        </button>
      </div>

      {rosterError && <ErrorBanner severity="error" message={rosterError} />}

      {roster.length === 0 && !isRosterLoading && (
        <div className="rounded-card border border-sandstone bg-old-lace px-gutter py-3">
          <p className="font-headline text-sm font-bold text-ink">No Roster</p>
          <p className="text-xs text-muted">Complete the draft to populate your roster.</p>
        </div>
      )}

      {roster.length > 0 && (
        <>
          <LineupDiamond
            starters={starters}
            roster={roster}
            isEditable
            onAssign={handlePositionClick}
          />

          <div className="grid gap-gutter lg:grid-cols-2">
            <BenchPanel
              bench={bench}
              onPlayerSelect={handleBenchPlayerSelect}
            />
            <PitchingRotation
              rotation={rotation}
              bullpen={bullpen}
              closer={closer}
              nextStarterIdx={0}
            />
          </div>
        </>
      )}
    </div>
  );
}
