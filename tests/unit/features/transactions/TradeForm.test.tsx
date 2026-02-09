// @vitest-environment jsdom
/**
 * Tests for TradeForm
 */

import { render, screen } from '@testing-library/react';
import { TradeForm } from '@features/transactions/TradeForm';

vi.mock('@components/forms/Select', () => ({
  Select: ({ label }: Record<string, unknown>) => (
    <select aria-label={label as string} />
  ),
}));

describe('TradeForm', () => {
  const mockOnSubmit = vi.fn();
  const teams = [
    { id: 'team-2', name: 'Boston Red Sox' },
    { id: 'team-3', name: 'Chicago Cubs' },
  ];
  const myRoster = [
    { id: 'r-1', name: 'Babe Ruth' },
    { id: 'r-2', name: 'Lou Gehrig' },
  ];

  it('renders heading', () => {
    render(<TradeForm teams={teams} myRoster={myRoster} onSubmit={mockOnSubmit} />);
    expect(screen.getByText('Propose Trade')).toBeInTheDocument();
  });

  it('renders submit button disabled by default', () => {
    render(<TradeForm teams={teams} myRoster={myRoster} onSubmit={mockOnSubmit} />);
    expect(screen.getByText('Submit Trade')).toBeDisabled();
  });

  it('renders team select', () => {
    render(<TradeForm teams={teams} myRoster={myRoster} onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText('Trade with')).toBeInTheDocument();
  });
});
