// @vitest-environment jsdom
/**
 * Tests for TransactionLog
 */

import { render, screen } from '@testing-library/react';
import { TransactionLog } from '@features/transactions/TransactionLog';

describe('TransactionLog', () => {
  it('shows no transactions message when empty', () => {
    render(<TransactionLog transactions={[]} />);
    expect(screen.getByText('No transactions recorded')).toBeInTheDocument();
  });

  it('renders transaction entries with type badges', () => {
    const transactions = [
      { type: 'add' as const, playerName: 'Babe Ruth', date: '2024-03-15', details: 'Added from waivers' },
      { type: 'drop' as const, playerName: 'Lou Gehrig', date: '2024-03-14', details: 'Dropped to waivers' },
    ];
    render(<TransactionLog transactions={transactions} />);
    expect(screen.getByText('Babe Ruth')).toBeInTheDocument();
    expect(screen.getByText('Lou Gehrig')).toBeInTheDocument();
    expect(screen.getByText('ADD')).toBeInTheDocument();
    expect(screen.getByText('DROP')).toBeInTheDocument();
  });
});
