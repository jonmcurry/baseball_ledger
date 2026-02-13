/**
 * RosterPage
 *
 * Team roster management with lineup configuration.
 * Composes LineupDiamond, BattingOrder, BenchPanel, and PitchingRotation.
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
import { BattingOrder } from './BattingOrder';
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
  const swapBattingOrder = useRosterStore((s) => s.swapBattingOrder);
  const changePitcherRole = useRosterStore((s) => s.changePitcherRole);
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
    let targetPosition = selectedPosition ?? entry.playerCard.primaryPosition;

    // Resolve generic 'OF' to first available outfield slot
    if (targetPosition === 'OF') {
      const occupiedSlots = new Set(starters.map((s) => s.lineupPosition));
      targetPosition = ['LF', 'CF', 'RF'].find((s) => !occupiedSlots.has(s)) ?? 'RF';
    }

    // Enforce 9-player limit: must displace someone if lineup is full
    if (starters.length >= 9) {
      const currentStarter = starters.find((s) => s.lineupPosition === targetPosition);
      if (!currentStarter) return;
      const lineupOrder = currentStarter.lineupOrder;
      updateRosterSlot(currentStarter.id, 'bench', null, null);
      updateRosterSlot(entry.id, 'starter', lineupOrder, targetPosition);
    } else {
      const lineupOrder = Math.max(0, ...starters.map((s) => s.lineupOrder ?? 0)) + 1;
      updateRosterSlot(entry.id, 'starter', lineupOrder, targetPosition);
    }

    setSelectedPosition(null);
  }, [selectedPosition, starters, updateRosterSlot]);

  const handleRemoveFromLineup = useCallback((entry: RosterEntry) => {
    updateRosterSlot(entry.id, 'bench', null, null);
  }, [updateRosterSlot]);

  const handleMoveUp = useCallback((entry: RosterEntry) => {
    const idx = starters.findIndex((s) => s.id === entry.id);
    if (idx <= 0) return;
    swapBattingOrder(entry.id, starters[idx - 1].id);
  }, [starters, swapBattingOrder]);

  const handleMoveDown = useCallback((entry: RosterEntry) => {
    const idx = starters.findIndex((s) => s.id === entry.id);
    if (idx < 0 || idx >= starters.length - 1) return;
    swapBattingOrder(entry.id, starters[idx + 1].id);
  }, [starters, swapBattingOrder]);

  const handlePitcherRoleChange = useCallback((entry: RosterEntry, newSlot: 'rotation' | 'bullpen' | 'closer') => {
    changePitcherRole(entry.id, newSlot);
  }, [changePitcherRole]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="pennant-header text-2xl">Roster</h2>
          {myTeam && (
            <p className="mt-2 font-body text-sm text-muted">{myTeam.name}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSaveLineup}
          disabled={isSaving}
          className="btn-vintage btn-vintage-primary"
        >
          {isSaving ? 'Saving...' : 'Save Lineup'}
        </button>
      </div>

      {rosterError && <ErrorBanner severity="error" message={rosterError} />}

      {/* Position selection indicator */}
      {selectedPosition && (
        <div className="rounded-card border border-accent/40 bg-accent/5 px-gutter py-2">
          <p className="font-display text-sm uppercase tracking-wide text-accent">
            Assigning: {selectedPosition}
            <span className="ml-2 text-xs normal-case tracking-normal text-muted">
              -- Select a bench player below
            </span>
          </p>
        </div>
      )}

      {roster.length === 0 && !isRosterLoading && (
        <div className="vintage-card text-center">
          <p className="pennant-header text-lg">No Roster</p>
          <p className="mt-2 text-sm text-muted">Complete the draft to populate your roster.</p>
        </div>
      )}

      {roster.length > 0 && (
        <>
          {/* Diamond + Batting Order side by side */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <LineupDiamond
              starters={starters}
              selectedPosition={selectedPosition}
              onPositionClick={handlePositionClick}
              onPlayerClick={handlePlayerClick}
            />
            <BattingOrder
              starters={starters}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRemove={handleRemoveFromLineup}
              onPlayerClick={handlePlayerClick}
            />
          </div>

          {/* Bench + Pitching side by side */}
          <div className="grid gap-6 lg:grid-cols-2">
            <BenchPanel
              bench={bench}
              selectedPosition={selectedPosition}
              onPlayerSelect={handleBenchPlayerSelect}
              onPlayerClick={handlePlayerClick}
            />
            <PitchingRotation
              rotation={rotation}
              bullpen={bullpen}
              closer={closer}
              nextStarterIdx={0}
              onRoleChange={handlePitcherRoleChange}
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
