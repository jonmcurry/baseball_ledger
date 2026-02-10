/**
 * TransactionsPage
 *
 * Player transactions, trades, and waiver wire.
 * Tab layout: Add/Drop, Trade, History.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useState } from 'react';
import { useTeam } from '@hooks/useTeam';
import { useLeague } from '@hooks/useLeague';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { AddDropForm } from './AddDropForm';
import { TradeForm } from './TradeForm';
import { TransactionLog } from './TransactionLog';
import type { TransactionEntry } from './TransactionLog';

type Tab = 'add-drop' | 'trade' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'add-drop', label: 'Add/Drop' },
  { key: 'trade', label: 'Trade' },
  { key: 'history', label: 'History' },
];

export function TransactionsPage() {
  const { teams, isLoading: leagueLoading, error: leagueError } = useLeague();
  const { myTeam, roster, isRosterLoading, rosterError } = useTeam();
  const [activeTab, setActiveTab] = useState<Tab>('add-drop');
  const [transactions] = useState<TransactionEntry[]>([]);

  if (leagueLoading || isRosterLoading) {
    return <LoadingLedger message="Loading transactions..." />;
  }

  const error = leagueError ?? rosterError;

  const otherTeams = teams
    .filter((t) => t.id !== myTeam?.id)
    .map((t) => ({ id: t.id, name: `${t.city} ${t.name}` }));

  const myRosterList = roster.map((r) => ({
    id: r.id,
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
          onDrop={() => {}}
          onAdd={() => {}}
        />
      )}

      {activeTab === 'trade' && (
        <TradeForm
          teams={otherTeams}
          myRoster={myRosterList}
          targetRoster={[]}
          onSubmit={() => {}}
        />
      )}

      {activeTab === 'history' && (
        <TransactionLog transactions={transactions} />
      )}
    </div>
  );
}
