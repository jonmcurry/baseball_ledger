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

const defaultProps = {
  totalAvailable: 2,
  currentPage: 1,
  pageSize: 50,
  onFilterChange: vi.fn(),
};

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
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} {...defaultProps} />);
    expect(screen.getByText('Available Players')).toBeInTheDocument();
  });

  it('displays player names in Last, First format', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} {...defaultProps} />);
    expect(screen.getByText('Ruth, Babe')).toBeInTheDocument();
    expect(screen.getByText('Aaron, Hank')).toBeInTheDocument();
  });

  it('calls onSelect when draft button is clicked', async () => {
    const user = userEvent.setup();
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} {...defaultProps} />);
    const buttons = screen.getAllByText('Draft');
    await user.click(buttons[0]);
    // Server-side sorted: players render in prop order
    expect(mockOnSelect).toHaveBeenCalledWith(players[0]);
  });

  it('disables draft buttons when disabled prop is true', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} disabled {...defaultProps} />);
    const buttons = screen.getAllByText('Draft');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('shows Power Rating column header for batters', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} {...defaultProps} />);
    expect(screen.getByText('Pwr')).toBeInTheDocument();
  });

  it('shows Spd column header', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} {...defaultProps} />);
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
    render(<AvailablePlayersTable players={[pitcherPlayer]} onSelect={mockOnSelect} {...defaultProps} totalAvailable={1} />);
    expect(screen.getByText('1.82')).toBeInTheDocument();
  });

  it('calls onFilterChange when sort header is clicked', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} {...defaultProps} onFilterChange={onFilterChange} />);
    await user.click(screen.getByText('Year'));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'seasonYear', sortOrder: 'desc', page: 1 }),
    );
  });

  it('shows row range and total count', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} {...defaultProps} totalAvailable={55686} />);
    expect(screen.getByText(/1-50 of 55,686/)).toBeInTheDocument();
  });

  it('shows pagination controls when multiple pages', () => {
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} {...defaultProps} totalAvailable={200} />);
    expect(screen.getByText('Prev')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 4/)).toBeInTheDocument();
  });

  it('calls onFilterChange with next page when Next clicked', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(<AvailablePlayersTable players={players} onSelect={mockOnSelect} {...defaultProps} totalAvailable={200} onFilterChange={onFilterChange} />);
    await user.click(screen.getByText('Next'));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });
});
