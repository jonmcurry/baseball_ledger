// @vitest-environment jsdom
/**
 * Tests for LedgerView component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LedgerView } from '@features/roster/LedgerView';
import type { RosterEntry } from '@lib/types/roster';
import type { PlayerCard } from '@lib/types/player';

function makeCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    nameFirst: 'Babe',
    nameLast: 'Ruth',
    playerId: 'ruthba01',
    seasonYear: 1927,
    primaryPosition: 'RF',
    eligiblePositions: ['RF', 'OF'],
    battingHand: 'L',
    throwingHand: 'L',
    powerRating: 21,
    speed: 0.4,
    cardValues: new Array(35).fill(0),
    ...overrides,
  } as PlayerCard;
}

function makeEntry(id: string, slot: RosterEntry['rosterSlot'], overrides: Partial<RosterEntry> = {}): RosterEntry {
  return {
    id,
    playerId: 'player-' + id,
    playerCard: makeCard({ nameFirst: 'Player', nameLast: id }),
    rosterSlot: slot,
    lineupOrder: null,
    lineupPosition: null,
    ...overrides,
  };
}

const starters = [
  makeEntry('1', 'starter', { lineupOrder: 1, lineupPosition: 'CF', playerCard: makeCard({ nameFirst: 'Mickey', nameLast: 'Mantle' }) }),
  makeEntry('2', 'starter', { lineupOrder: 2, lineupPosition: 'SS', playerCard: makeCard({ nameFirst: 'Derek', nameLast: 'Jeter' }) }),
];

const rotation = [
  makeEntry('3', 'rotation', { playerCard: makeCard({ nameFirst: 'Sandy', nameLast: 'Koufax', primaryPosition: 'SP' }) }),
];

const bullpen = [
  makeEntry('4', 'bullpen', { playerCard: makeCard({ nameFirst: 'Mariano', nameLast: 'Rivera', primaryPosition: 'CL' }) }),
];

const bench = [
  makeEntry('5', 'bench', { playerCard: makeCard({ nameFirst: 'Yogi', nameLast: 'Berra', primaryPosition: 'C' }) }),
];

describe('LedgerView', () => {
  it('renders a table with role="table"', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('applies stat-table class', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByRole('table').className).toContain('stat-table');
  });

  it('renders Starting Lineup section heading', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByText('Starting Lineup')).toBeInTheDocument();
  });

  it('renders Pitching Staff section heading', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByText('Pitching Staff')).toBeInTheDocument();
  });

  it('renders Bench section heading', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByText('Bench')).toBeInTheDocument();
  });

  it('renders starter player names', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByText('Mickey Mantle')).toBeInTheDocument();
    expect(screen.getByText('Derek Jeter')).toBeInTheDocument();
  });

  it('renders rotation player names', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByText('Sandy Koufax')).toBeInTheDocument();
  });

  it('renders bullpen player names', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByText('Mariano Rivera')).toBeInTheDocument();
  });

  it('renders bench player names', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByText('Yogi Berra')).toBeInTheDocument();
  });

  it('calls onPlayerClick when a player name is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} onPlayerClick={handleClick} />);
    await user.click(screen.getByText('Mickey Mantle'));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(starters[0]);
  });

  it('shows correct number of starters', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    // Starters have lineup numbers 1 and 2
    expect(screen.getByText('Mickey Mantle')).toBeInTheDocument();
    expect(screen.getByText('Derek Jeter')).toBeInTheDocument();
  });

  it('shows "No bench players" when bench is empty', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={[]} />);
    expect(screen.getByText('No bench players')).toBeInTheDocument();
  });

  it('renders Rotation and Bullpen sub-headings', () => {
    render(<LedgerView starters={starters} rotation={rotation} bullpen={bullpen} bench={bench} />);
    expect(screen.getByText('Rotation')).toBeInTheDocument();
    expect(screen.getByText('Bullpen')).toBeInTheDocument();
  });
});
