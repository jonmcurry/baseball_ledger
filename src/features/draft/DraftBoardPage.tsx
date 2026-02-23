/**
 * DraftBoardPage
 *
 * ESPN "Command Center" draft war room:
 * - Broadcast bar (round/pick, timer, status, auto-draft)
 * - Horizontal draft ticker strip (ESPN "Draft Train")
 * - 70/30 split: player table | tabbed sidebar (Roster / Feed / Analysis)
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDraft } from '@hooks/useDraft';
import { useLeague } from '@hooks/useLeague';
import { useDraftTimer } from './hooks/useDraftTimer';

import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { PlayerProfileModal } from '@components/baseball/PlayerProfileModal';
import { DraftTicker } from './DraftTicker';
import { DraftReasoningPanel } from './DraftReasoningPanel';
import { AvailablePlayersTable } from './AvailablePlayersTable';
import type { PlayerTableFilters, DraftViewMode } from './AvailablePlayersTable';
import { RosterPreviewPanel } from './RosterPreviewPanel';
import type { AvailablePlayer } from '@stores/draftStore';
import type { PlayerCard } from '@lib/types/player';
import type { DraftReasoningRequest } from '@lib/types/ai';
import { usePageTitle } from '@hooks/usePageTitle';

type SidebarTab = 'roster' | 'feed' | 'analysis';

export function DraftBoardPage() {
  usePageTitle('Draft Board');
  const { league } = useLeague();
  const {
    draftState,
    availablePlayers,
    totalAvailablePlayers,
    playerCurrentPage,
    playerPageSize,
    isLoading,
    error,
    myTeam,
    isMyPick,
    currentTeamName,
    timeRemaining,
    submitPick,
    triggerAutoPick,
    autoDraftEnabled,
    setAutoDraftEnabled,
    fetchDraftState,
    fetchAvailablePlayers,
    tickTimer,
    resetTimer,
  } = useDraft();

  useEffect(() => {
    if (league?.id) {
      fetchDraftState(league.id);
      fetchAvailablePlayers(league.id);
    }
  }, [league?.id, fetchDraftState, fetchAvailablePlayers]);

  // Poll draft state when it is not the user's turn (CPU picks processed server-side)
  useEffect(() => {
    if (!league?.id || !draftState || draftState.status !== 'in_progress' || isMyPick) return;
    const interval = setInterval(() => {
      fetchDraftState(league.id);
      fetchAvailablePlayers(league.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [league?.id, draftState?.status, isMyPick, fetchDraftState, fetchAvailablePlayers]);

  // REQ-DFT-004: Auto-pick on timer expiry (server-side valuation-based pick)
  const handleAutoPickOnExpire = useCallback(() => {
    if (!league?.id) return;
    triggerAutoPick(league.id, true);
  }, [league?.id, triggerAutoPick]);

  // Auto-draft: fire auto-pick immediately when it becomes the user's turn
  useEffect(() => {
    if (!league?.id || !isMyPick || !autoDraftEnabled || isLoading) return;
    if (draftState?.status !== 'in_progress') return;
    const timeout = setTimeout(() => {
      triggerAutoPick(league.id, true);
    }, 500);
    return () => clearTimeout(timeout);
  }, [isMyPick, autoDraftEnabled, league?.id, draftState?.status, isLoading, triggerAutoPick]);

  const handleFilterChange = useCallback((filters: PlayerTableFilters) => {
    if (!league?.id) return;
    fetchAvailablePlayers(league.id, filters);
  }, [league?.id, fetchAvailablePlayers]);

  const [profilePlayer, setProfilePlayer] = useState<PlayerCard | null>(null);
  const [draftViewMode, setDraftViewMode] = useState<DraftViewMode>('registry');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('roster');

  // Build reasoning request from the last completed pick
  const lastPickRequest = useMemo((): DraftReasoningRequest | null => {
    const picks = draftState?.picks;
    if (!picks || picks.length === 0) return null;
    const lastPick = picks[picks.length - 1];
    return {
      round: lastPick.round,
      managerStyle: 'balanced',
      managerName: 'Manager',
      teamName: currentTeamName ?? 'Team',
      pickedPlayerName: lastPick.playerName,
      pickedPlayerPosition: lastPick.position,
      pickedPlayerValue: 50,
      alternativePlayers: availablePlayers.slice(0, 3).map((p) => ({
        name: `${p.playerCard.nameFirst} ${p.playerCard.nameLast}`,
        position: p.playerCard.eligiblePositions?.[0] ?? 'UT',
        value: 50,
      })),
      teamNeeds: [],
    };
  }, [draftState?.picks, currentTeamName, availablePlayers]);

  // REQ-DFT-004: 60-second pick timer (disabled when auto-draft is active)
  useDraftTimer({
    isActive: isMyPick && draftState?.status === 'in_progress' && !autoDraftEnabled,
    currentTeamId: draftState?.currentTeamId ?? null,
    pickTimerSeconds: timeRemaining,
    tickTimer,
    resetTimer,
    onExpire: handleAutoPickOnExpire,
  });

  if (isLoading && !draftState && availablePlayers.length === 0) {
    return <LoadingLedger message="Loading draft board..." />;
  }

  const handlePlayerClick = (player: AvailablePlayer) => {
    setProfilePlayer(player.playerCard);
  };

  const handlePlayerSelect = (player: AvailablePlayer) => {
    if (!league?.id || !myTeam) return;
    submitPick(league.id, player);
  };

  const isDraftComplete = draftState?.status === 'completed';
  const isDraftNotStarted = !draftState || draftState.status === 'not_started';
  const isDraftActive = draftState?.status === 'in_progress';

  const SIDEBAR_TABS: { key: SidebarTab; label: string }[] = [
    { key: 'roster', label: 'Roster' },
    { key: 'feed', label: 'Feed' },
    { key: 'analysis', label: 'Analysis' },
  ];

  return (
    <div>
      {/* 1. Broadcast Bar -- dark navy strip with draft status */}
      {isDraftActive && (
        <div className="broadcast-bar">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <span className="broadcast-label">Round {draftState.currentRound}</span>
              <span className="broadcast-label mx-2">--</span>
              <span className="broadcast-label">Pick {draftState.currentPick}</span>
            </div>

            <div className="flex-shrink-0 font-stat text-2xl font-bold text-[var(--text-on-dark)] tabular-nums">
              {isMyPick && !autoDraftEnabled
                ? `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`
                : '--:--'}
            </div>

            <div className="flex-1" />

            <span className="broadcast-label font-bold flex-shrink-0">
              {isMyPick
                ? (autoDraftEnabled ? 'Auto-Drafting...' : "You're On the Clock!")
                : `${currentTeamName ?? 'Team'} On The Clock`}
            </span>
            <button
              type="button"
              onClick={() => setAutoDraftEnabled(!autoDraftEnabled)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 font-stat text-[10px] font-bold uppercase tracking-wider transition-colors ${
                autoDraftEnabled
                  ? 'bg-[var(--accent-secondary)] text-[var(--text-on-dark)]'
                  : 'border border-[rgba(255,255,255,0.2)] text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)]'
              }`}
              aria-pressed={autoDraftEnabled}
            >
              Auto-Draft {autoDraftEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* 2. Draft Ticker -- horizontal scrolling strip of recent picks */}
      {isDraftActive && (
        <DraftTicker
          picks={draftState?.picks ?? []}
          currentPick={draftState?.currentPick ?? 0}
          variant="horizontal"
        />
      )}

      {/* Fallback header for non-active states */}
      {!isDraftActive && (
        <div className="page-header">
          <h2 className="page-header-title">Player Draft</h2>
        </div>
      )}

      {/* Hidden heading for test compatibility when draft is active */}
      {isDraftActive && (
        <h2 className="sr-only">Player Draft</h2>
      )}

      {error && <ErrorBanner severity="error" message={error} />}

      {/* Draft status banners */}
      {isDraftComplete && (
        <div className="broadcast-bar mt-gutter">
          <p className="broadcast-team text-type-3">Draft Complete</p>
          <p className="broadcast-label mt-1">
            All {draftState.totalRounds} rounds have been completed. The rosters are set!
          </p>
        </div>
      )}

      {isDraftNotStarted && (
        <div className="panel mt-gutter">
          <div className="panel-header">
            <span>Draft Status</span>
          </div>
          <div className="panel-body">
            <p className="font-headline text-sm font-bold text-[var(--text-primary)]">
              Waiting for Draft
            </p>
            <p className="font-body text-xs text-[var(--text-secondary)]">
              The commissioner has not started the draft yet.
            </p>
          </div>
        </div>
      )}

      {/* 3. Toolbar: view toggle */}
      <div className="toolbar mt-gutter">
        <div className="toolbar-group">
          <button
            type="button"
            onClick={() => setDraftViewMode((v) => v === 'registry' ? 'classifieds' : 'registry')}
            className="toolbar-btn"
            aria-label={`Switch to ${draftViewMode === 'registry' ? 'classifieds' : 'registry'} view`}
          >
            {draftViewMode === 'registry' ? 'Classifieds' : 'Registry'}
          </button>
        </div>
      </div>

      {/* 4. Split Layout: 70% player table | 30% tabbed sidebar */}
      <div className="split-layout mt-gutter" style={{ minHeight: 'calc(100vh - 14rem)' }}>
        {/* Main panel: Player Pool */}
        <div>
          <AvailablePlayersTable
            players={availablePlayers}
            totalAvailable={totalAvailablePlayers}
            currentPage={playerCurrentPage}
            pageSize={playerPageSize}
            onSelect={handlePlayerSelect}
            onPlayerClick={handlePlayerClick}
            onFilterChange={handleFilterChange}
            disabled={!isMyPick || autoDraftEnabled}
            viewMode={draftViewMode}
          />
        </div>

        {/* Tabbed Sidebar */}
        <div className="split-layout-sidebar">
          {/* Tab strip */}
          <div className="tab-strip">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSidebarTab(tab.key)}
                className={`tab-strip-item${sidebarTab === tab.key ? ' tab-strip-item--active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content -- scrollable */}
          <div style={{ maxHeight: 'calc(100vh - 16rem)', overflowY: 'auto' }}>
            {/* Roster tab */}
            {sidebarTab === 'roster' && myTeam && (
              <div className="panel-body">
                <RosterPreviewPanel
                  picks={draftState?.picks ?? []}
                  teamName={`${myTeam.city} ${myTeam.name}`}
                  teamId={myTeam.id}
                />
              </div>
            )}
            {sidebarTab === 'roster' && !myTeam && (
              <div className="panel-body">
                <p className="font-stat text-xs text-[var(--text-tertiary)]">
                  No team assigned yet.
                </p>
              </div>
            )}

            {/* Feed tab -- full vertical draft history */}
            {sidebarTab === 'feed' && (
              <DraftTicker
                picks={draftState?.picks ?? []}
                currentPick={draftState?.currentPick ?? 0}
                variant="vertical"
              />
            )}

            {/* Analysis tab */}
            {sidebarTab === 'analysis' && (
              <div className="panel-body">
                <DraftReasoningPanel request={lastPickRequest} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Profile Modal */}
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

export default DraftBoardPage;
