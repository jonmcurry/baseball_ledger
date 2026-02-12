/**
 * TransactionLog
 *
 * History list of transactions.
 * Feature-scoped sub-component. No store imports.
 */

import type { TransactionEntry } from '@lib/transforms/transaction-transform';

export type { TransactionEntry };

export interface TransactionLogProps {
  readonly transactions: readonly TransactionEntry[];
}

const TYPE_LABELS: Record<TransactionEntry['type'], string> = {
  add: 'ADD',
  drop: 'DROP',
  trade: 'TRADE',
};

const TYPE_STYLES: Record<TransactionEntry['type'], string> = {
  add: 'bg-ballpark text-ink',
  drop: 'bg-stitch-red text-ink',
  trade: 'bg-sandstone text-ink',
};

export function TransactionLog({ transactions }: TransactionLogProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-headline text-sm font-bold text-ballpark">Transaction History</h3>
      {transactions.length === 0 && (
        <p className="text-xs text-muted">No transactions recorded</p>
      )}
      <div className="space-y-1">
        {transactions.map((tx, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-card border border-sandstone/50 px-2 py-1"
          >
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${TYPE_STYLES[tx.type]}`}
            >
              {TYPE_LABELS[tx.type]}
            </span>
            <span className="text-sm font-medium text-ink">{tx.playerName}</span>
            <span className="ml-auto text-xs text-muted">{tx.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransactionLog;
