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
import { PlayerProfileModal } from '@components/baseball/PlayerProfileModal';
import type { RosterEntry } from '@lib/types/roster';
import type { PlayerCard } from '@lib/types/player';
import { usePageTitle } from '@hooks/usePageTitle';

export function RosterPage() {
  usePageTitle('Roster');
  const { league } = useLeague();
  const { myTeam, roster, starters, bench, isRosterLoading, rosterError } = useTeam();
  const fetchRoster = useRosterStore((s) => s.fetchRoster);
  const saveLineup = useRosterStore((s) => s.saveLineup);
  const updateRosterSlot = useRosterStore((s) => s.updateRosterSlot);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<PlayerCard | null>(null);

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

  const handlePlayerClick = useCallback((entry: RosterEntry) => {
    setProfilePlayer(entry.playerCard);
  }, []);

  const handlePositionClick = useCallback((position: string) => {
    setSelectedPosition((prev) => (prev === position ? null : position));
  }, []);

  const handleBenchPlayerSelect = useCallback((entry: RosterEntry) => {
    const targetPosition = selectedPosition ?? entry.playerCard.primaryPosition;

    // Find the current starter at the target position
    const currentStarter = starters.find((s) => s.lineupPosition === targetPosition);

    // Determine lineup order: use displaced starter's order, or next available
    const lineupOrder = currentStarter?.lineupOrder
      ?? (Math.max(0, ...starters.map((s) => s.lineupOrder ?? 0)) + 1);

    // Move current starter to bench if one exists at target position
    if (currentStarter) {
      updateRosterSlot(currentStarter.id, 'bench', null, null);
    }

    // Promote bench player to starter
    updateRosterSlot(entry.id, 'starter', lineupOrder, targetPosition);

    // Clear position selection
    setSelectedPosition(null);
  }, [selectedPosition, starters, updateRosterSlot]);

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
          className="rounded-button bg-ballpark px-4 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-40"
        >
          {isSaving ? 'Saving...' : 'Save Lineup'}
        </button>
      </div>

      {rosterError && <ErrorBanner severity="error" message={rosterError} />}

      {selectedPosition && (
        <div className="rounded-card border border-ballpark/40 bg-ballpark/5 px-gutter py-2">
          <p className="text-sm text-ink">
            Selected: {selectedPosition}
            <span className="ml-2 text-xs text-muted">-- Click a bench player to assign</span>
          </p>
        </div>
      )}

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
            onPlayerClick={handlePlayerClick}
          />

          <div className="grid gap-gutter lg:grid-cols-2">
            <BenchPanel
              bench={bench}
              onPlayerSelect={handleBenchPlayerSelect}
              onPlayerClick={handlePlayerClick}
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

      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          isOpen={true}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}

export default RosterPage;
