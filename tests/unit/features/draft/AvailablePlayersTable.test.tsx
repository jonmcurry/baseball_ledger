// @vitest-environment jsdom
/**
 * Tests for AvailablePlayersTable
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvailablePlayersTable } from '@features/draft/AvailablePlayersTable';
import { createMockAvailablePlayer } from '../../../fixtures/mock-draft';

vi.mock('@components/forms/Input', () => ({
  Input: ({ value, onChange, name, label, placeholder }: Record<string, unknown>) => (
    <input value={value as string} onChange={(e) => (onChange as (v: string) => void)(e.target.value)} name={name as string} aria-label={label as string} placeholder={placeholder as string} />
  ),
}));

vi.mock('@components/forms/Select', () => ({
  Select: ({ value, onChange, name, label }: Record<string, unknown>) => (
    <select value={value as string} onChange={(e) => (onChange as (v: string) => void)(e.target.value)} name={name as string} aria-label={label as string} />
  ),
}));

describe('AvailablePlayersTable', () => {
  const mockOnSelect = vi.fn();
  const players = [
    createMockAvailablePlayer({ nameFirst: 'Babe', nameLast: 'Ruth', primaryPosition: 'RF' }),
    createMockAvailablePlayer({ playerId: 'p2', nameFirst: 'Hank', nameLast: 'Aaron', primaryPosition: 'LF' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} />);
    expect(screen.getByText('Available Players')).toBeInTheDocument();
  });

  it('displays player names and positions', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} />);
    expect(screen.getByText('Babe Ruth')).toBeInTheDocument();
    expect(screen.getByText('Hank Aaron')).toBeInTheDocument();
  });

  it('calls onSelect when draft button is clicked', async () => {
    const user = userEvent.setup();
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} />);
    const buttons = screen.getAllByText('Draft');
    await user.click(buttons[0]);
    expect(mockOnSelect).toHaveBeenCalledWith(players[0]);
  });

  it('disables draft buttons when disabled prop is true', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} disabled />);
    const buttons = screen.getAllByText('Draft');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
