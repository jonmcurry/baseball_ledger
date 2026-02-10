/**
 * TransactionsPage
 *
 * Player transactions, trades, and waiver wire.
 * Tab layout: Add/Drop, Trade, History.
 * REQ-RST-005: Trade between two teams with player selection.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTeam } from '@hooks/useTeam';
import { useLeague } from '@hooks/useLeague';
import { useRosterStore } from '@stores/rosterStore';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { AddDropForm } from './AddDropForm';
import { TradeForm } from './TradeForm';
import { TransactionLog } from './TransactionLog';
import type { TransactionEntry } from './TransactionLog';
import type { TradePlayer } from './TradeForm';
import * as transactionService from '@services/transaction-service';
import { fetchRoster } from '@services/roster-service';

type Tab = 'add-drop' | 'trade' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'add-drop', label: 'Add/Drop' },
  { key: 'trade', label: 'Trade' },
  { key: 'history', label: 'History' },
];

export function TransactionsPage() {
  const { league, teams, isLoading: leagueLoading, error: leagueError } = useLeague();
  const { myTeam, roster, isRosterLoading, rosterError } = useTeam();
  const fetchMyRoster = useRosterStore((s) => s.fetchRoster);
  const [activeTab, setActiveTab] = useState<Tab>('add-drop');
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [targetRoster, setTargetRoster] = useState<TradePlayer[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const leagueId = league?.id;
  const teamId = myTeam?.id;

  // Load transaction history on mount
  useEffect(() => {
    if (!leagueId) return;
    transactionService.fetchTransactionHistory(leagueId)
      .then(setTransactions)
      .catch(() => { /* History fetch is best-effort */ });
  }, [leagueId]);

  const handleDrop = useCallback(async (rosterId: string) => {
    if (!leagueId || !teamId) return;
    setActionError(null);

    // Find the player ID from the roster entry ID
    const entry = roster.find((r) => r.id === rosterId);
    if (!entry) return;

    try {
      await transactionService.dropPlayer(leagueId, teamId, entry.playerId);
      // Refresh roster after drop
      await fetchMyRoster(leagueId, teamId);
      // Refresh history
      transactionService.fetchTransactionHistory(leagueId)
        .then(setTransactions)
        .catch(() => {});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to drop player');
    }
  }, [leagueId, teamId, roster, fetchMyRoster]);

  const handleTargetChange = useCallback(async (targetTeamId: string) => {
    if (!leagueId) return;
    setTargetRoster([]);
    try {
      const targetEntries = await fetchRoster(leagueId, targetTeamId);
      setTargetRoster(
        targetEntries.map((r) => ({
          id: r.playerId,
          name: `${r.playerCard.nameFirst} ${r.playerCard.nameLast}`,
        })),
      );
    } catch {
      setTargetRoster([]);
    }
  }, [leagueId]);

  const handleTrade = useCallback(async (payload: {
    targetTeamId: string;
    playersFromMe: string[];
    playersFromThem: string[];
  }) => {
    if (!leagueId || !teamId) return;
    setActionError(null);
    try {
      await transactionService.submitTrade(
        leagueId,
        teamId,
        payload.targetTeamId,
        payload.playersFromMe,
        payload.playersFromThem,
      );
      // Refresh roster after trade
      await fetchMyRoster(leagueId, teamId);
      // Refresh history
      transactionService.fetchTransactionHistory(leagueId)
        .then(setTransactions)
        .catch(() => {});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit trade');
    }
  }, [leagueId, teamId, fetchMyRoster]);

  if (leagueLoading || isRosterLoading) {
    return <LoadingLedger message="Loading transactions..." />;
  }

  const error = leagueError ?? rosterError ?? actionError;

  const otherTeams = teams
    .filter((t) => t.id !== myTeam?.id)
    .map((t) => ({ id: t.id, name: `${t.city} ${t.name}` }));

  const myRosterList = roster.map((r) => ({
    id: r.playerId,
    name: `${r.playerCard.nameFirst} ${r.playerCard.nameLast}`,
  }));

  return (
    <div className="space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Transactions</h2>

      {error && <ErrorBanner severity="error" message={error} />}

      <div className="flex gap-1 border-b border-sandstone">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-b-2 border-ballpark text-ballpark'
                : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'add-drop' && (
        <AddDropForm
          roster={roster}
          onDrop={handleDrop}
          onAdd={() => {}}
        />
      )}

      {activeTab === 'trade' && (
        <TradeForm
          teams={otherTeams}
          myRoster={myRosterList}
          targetRoster={targetRoster}
          onTargetChange={handleTargetChange}
          onSubmit={handleTrade}
        />
      )}

      {activeTab === 'history' && (
        <TransactionLog transactions={transactions} />
      )}
    </div>
  );
}

export default TransactionsPage;
