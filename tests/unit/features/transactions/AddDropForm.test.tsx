// @vitest-environment jsdom
/**
 * Tests for AddDropForm
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { AddDropForm } from '@features/transactions/AddDropForm';
import { createMockRosterEntry } from '../../../fixtures/mock-roster';
import type { AvailablePlayer } from '@lib/transforms/player-pool-transform';

vi.mock('@components/forms/Select', () => ({
  Select: ({ label }: Record<string, unknown>) => (
    <select aria-label={label as string} />
  ),
}));

vi.mock('@components/forms/Input', () => ({
  Input: ({ label, onChange, value, placeholder }: Record<string, unknown>) => (
    <input
      aria-label={label as string}
      value={(value as string) ?? ''}
      placeholder={placeholder as string}
      onChange={(e) => (onChange as (v: string) => void)(e.target.value)}
    />
  ),
}));

function createMockAvailablePlayer(overrides: Partial<AvailablePlayer> = {}): AvailablePlayer {
  return {
    playerId: 'ruthba01',
    nameFirst: 'Babe',
    nameLast: 'Ruth',
    seasonYear: 1927,
    primaryPosition: 'RF',
    playerCard: {} as AvailablePlayer['playerCard'],
    ...overrides,
  };
}

const defaultProps = {
  roster: [] as ReturnType<typeof createMockRosterEntry>[],
  availablePlayers: [] as AvailablePlayer[],
  isLoadingPlayers: false,
  onDrop: vi.fn(),
  onAdd: vi.fn(),
  onSearchPlayers: vi.fn(),
  canAdd: true,
};

describe('AddDropForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading', () => {
    render(<AddDropForm {...defaultProps} />);
    expect(screen.getByText('Add/Drop')).toBeInTheDocument();
  });

  it('renders drop section', () => {
    render(<AddDropForm {...defaultProps} />);
    expect(screen.getByText('Drop a Player')).toBeInTheDocument();
  });

  it('renders drop button as disabled when no player selected', () => {
    const roster = [createMockRosterEntry()];
    render(<AddDropForm {...defaultProps} roster={roster} />);
    expect(screen.getByText('Drop')).toBeDisabled();
  });

  // REQ-RST-005: Add Player UI tests

  it('renders Add a Player section heading', () => {
    render(<AddDropForm {...defaultProps} />);
    expect(screen.getByText('Add a Player')).toBeInTheDocument();
  });

  it('renders search input for player search', () => {
    render(<AddDropForm {...defaultProps} />);
    expect(screen.getByLabelText('Search free agents')).toBeInTheDocument();
  });

  it('shows roster full message when canAdd is false', () => {
    render(<AddDropForm {...defaultProps} canAdd={false} />);
    expect(screen.getByText(/Drop a player first/)).toBeInTheDocument();
  });

  it('renders available player names when provided', () => {
    const players = [
      createMockAvailablePlayer({ nameFirst: 'Babe', nameLast: 'Ruth' }),
      createMockAvailablePlayer({ playerId: 'gehrlo01', nameFirst: 'Lou', nameLast: 'Gehrig' }),
    ];
    render(<AddDropForm {...defaultProps} availablePlayers={players} />);
    expect(screen.getByText(/Babe Ruth/)).toBeInTheDocument();
    expect(screen.getByText(/Lou Gehrig/)).toBeInTheDocument();
  });

  it('calls onAdd with player object when Add button clicked', () => {
    const player = createMockAvailablePlayer({ nameFirst: 'Babe', nameLast: 'Ruth' });
    render(<AddDropForm {...defaultProps} availablePlayers={[player]} />);
    const addButtons = screen.getAllByText('Add');
    // Click the first "Add" button (next to the player, not the "Drop" button)
    fireEvent.click(addButtons[0]);
    expect(defaultProps.onAdd).toHaveBeenCalledWith(player);
  });

  it('disables Add buttons when canAdd is false', () => {
    const player = createMockAvailablePlayer();
    render(<AddDropForm {...defaultProps} availablePlayers={[player]} canAdd={false} />);
    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    // Find the add button that's for the player (not the drop button)
    const playerAddBtn = addButtons.find((btn) => !btn.textContent?.includes('Drop'));
    expect(playerAddBtn).toBeDisabled();
  });
});
