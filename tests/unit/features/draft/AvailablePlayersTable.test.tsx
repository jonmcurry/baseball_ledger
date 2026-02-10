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
    // Default sort is name ascending: Aaron before Ruth
    expect(mockOnSelect).toHaveBeenCalledWith(players[1]);
  });

  it('disables draft buttons when disabled prop is true', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} disabled />);
    const buttons = screen.getAllByText('Draft');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('shows Power Rating column header for batters', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} />);
    expect(screen.getByText('Pwr')).toBeInTheDocument();
  });

  it('shows Spd column header', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} />);
    expect(screen.getByText('Spd')).toBeInTheDocument();
  });

  it('shows pitcher-specific columns for pitchers', () => {
    const pitcherPlayer = createMockAvailablePlayer({
      playerId: 'p3',
      nameFirst: 'Vida',
      nameLast: 'Blue',
      primaryPosition: 'SP',
      playerCard: {
        playerId: 'p3',
        nameFirst: 'Vida',
        nameLast: 'Blue',
        seasonYear: 1971,
        battingHand: 'R',
        throwingHand: 'L',
        primaryPosition: 'SP',
        eligiblePositions: ['SP'],
        isPitcher: true,
        card: Array.from({ length: 35 }, () => 7),
        powerRating: 13,
        archetype: { byte33: 0, byte34: 6 },
        speed: 0.3,
        power: 0.05,
        discipline: 0.2,
        contactRate: 0.4,
        fieldingPct: 0.960,
        range: 0.3,
        arm: 0.8,
        pitching: {
          role: 'SP',
          grade: 14,
          stamina: 7.0,
          era: 1.82,
          whip: 0.95,
          k9: 8.7,
          bb9: 2.5,
          hr9: 0.4,
          usageFlags: [],
          isReliever: false,
        },
      },
    });
    render(<AvailablePlayersTable players={[pitcherPlayer]} onSelect={mockOnSelect} />);
    expect(screen.getByText('1.82')).toBeInTheDocument();
  });

  it('sorts by column when header is clicked', async () => {
    const user = userEvent.setup();
    const slowPlayer = createMockAvailablePlayer({
      playerId: 'p-slow',
      nameFirst: 'Slow',
      nameLast: 'Runner',
      primaryPosition: 'C',
      playerCard: {
        ...players[0].playerCard,
        playerId: 'p-slow',
        nameFirst: 'Slow',
        nameLast: 'Runner',
        speed: 0.2,
        primaryPosition: 'C',
      },
    });
    const fastPlayer = createMockAvailablePlayer({
      playerId: 'p-fast',
      nameFirst: 'Fast',
      nameLast: 'Runner',
      primaryPosition: 'CF',
      playerCard: {
        ...players[0].playerCard,
        playerId: 'p-fast',
        nameFirst: 'Fast',
        nameLast: 'Runner',
        speed: 0.9,
        primaryPosition: 'CF',
      },
    });

    render(<AvailablePlayersTable players={[slowPlayer, fastPlayer]} onSelect={mockOnSelect} />);
    await user.click(screen.getByText('Spd'));
    // After clicking Spd (descending), Fast Runner should appear first
    const rows = screen.getAllByRole('row').slice(1); // skip header
    expect(rows[0]).toHaveTextContent('Fast Runner');
  });
});
