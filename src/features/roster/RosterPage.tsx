/**
 * RosterPage
 *
 * Command center for team roster management.
 * Toolbar with heading + view toggle + save button.
 * Split layout: Diamond/Ledger on left, Batting Order on right.
 * Below: Bench + Pitching panels side by side.
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
import { LedgerView } from './LedgerView';
import { PlayerProfileModal } from '@components/baseball/PlayerProfileModal';
import type { RosterEntry } from '@lib/types/roster';
import type { PlayerCard } from '@lib/types/player';
import { usePageTitle } from '@hooks/usePageTitle';

type RosterViewMode = 'diamond' | 'ledger';

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
  const [rosterView, setRosterView] = useState<RosterViewMode>('diamond');

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

  const handlePlayerClick = useCallback((entry: RosterEntry) => {
    setProfilePlayer(entry.playerCard);
  }, []);

  const handlePositionClick = useCallback((position: string) => {
    setSelectedPosition((prev) => (prev === position ? null : position));
  }, []);

  const handleBenchPlayerSelect = useCallback((entry: RosterEntry) => {
    let targetPosition = selectedPosition ?? entry.playerCard.primaryPosition;

    // Two-way players: resolve pitcher position to DH when no specific position selected
    if (['SP', 'RP', 'CL'].includes(targetPosition) && entry.playerCard.eligiblePositions.includes('DH')) {
      targetPosition = 'DH';
    }

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

  const handlePitcherRoleChange = useCallback((entry: RosterEntry, newSlot: 'rotation' | 'bullpen') => {
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
    <div>
      {/* Toolbar: heading + view toggle + save */}
      <div className="toolbar">
        <h2 className="toolbar-label">Active Roster</h2>
        {myTeam && <span className="toolbar-context">{myTeam.name}</span>}
        <div className="toolbar-spacer" />
        <div className="toolbar-group">
          <button
            type="button"
            onClick={() => setRosterView((v) => v === 'diamond' ? 'ledger' : 'diamond')}
            className="toolbar-btn"
            aria-label={`Switch to ${rosterView === 'diamond' ? 'ledger' : 'diamond'} view`}
          >
            {rosterView === 'diamond' ? 'Ledger View' : 'Diamond View'}
          </button>
          <button
            type="button"
            onClick={handleSaveLineup}
            disabled={isSaving}
            className="btn-vintage btn-vintage-primary"
          >
            {isSaving ? 'Saving...' : 'Save Lineup'}
          </button>
        </div>
      </div>

      {rosterError && <ErrorBanner severity="error" message={rosterError} />}

      {/* Position selection indicator */}
      {selectedPosition && (
        <div className="broadcast-bar mt-gutter" style={{ background: 'var(--accent-secondary)' }}>
          <span className="broadcast-label">
            Assigning: {selectedPosition}
          </span>
          <span className="text-[var(--text-on-dark-muted)] text-xs ml-2">
            -- Select a bench player below
          </span>
        </div>
      )}

      {roster.length === 0 && !isRosterLoading && (
        <div className="panel mt-gutter text-center">
          <div className="panel-header">
            <span>Roster</span>
          </div>
          <div className="panel-body">
            <p className="font-headline text-lg font-bold text-[var(--text-primary)]">No Roster</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Complete the draft to populate your roster.</p>
          </div>
        </div>
      )}

      {roster.length > 0 && rosterView === 'diamond' && (
        <>
          {/* Split: Diamond + Batting Order */}
          <div className="split-layout mt-gutter" style={{ '--split-ratio': '50 50' } as React.CSSProperties}>
            <div>
              <LineupDiamond
                starters={starters}
                selectedPosition={selectedPosition}
                onPositionClick={handlePositionClick}
                onPlayerClick={handlePlayerClick}
              />
            </div>
            <div>
              <BattingOrder
                starters={starters}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemove={handleRemoveFromLineup}
                onPlayerClick={handlePlayerClick}
              />
            </div>
          </div>

          {/* Bench + Pitching panels */}
          <div className="split-layout mt-gutter" style={{ '--split-ratio': '50 50' } as React.CSSProperties}>
            <div className="panel">
              <div className="panel-header">
                <span>Bench</span>
              </div>
              <div className="panel-body">
                <BenchPanel
                  bench={bench}
                  selectedPosition={selectedPosition}
                  onPlayerSelect={handleBenchPlayerSelect}
                  onPlayerClick={handlePlayerClick}
                />
              </div>
            </div>
            <div className="panel">
              <div className="panel-header">
                <span>Pitching Staff</span>
              </div>
              <div className="panel-body">
                <PitchingRotation
                  rotation={rotation}
                  bullpen={bullpen}
                  nextStarterIdx={0}
                  onRoleChange={handlePitcherRoleChange}
                  onPlayerClick={handlePlayerClick}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {roster.length > 0 && rosterView === 'ledger' && (
        <div className="mt-gutter">
          <LedgerView
            starters={starters}
            rotation={rotation}
            bullpen={bullpen}
            bench={bench}
            onPlayerClick={handlePlayerClick}
          />
        </div>
      )}

      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          isOpen={true}
          onClose={() => setProfilePlayer(null)}
          leagueId={league?.id}
        />
      )}
    </div>
  );
}

export default RosterPage;
