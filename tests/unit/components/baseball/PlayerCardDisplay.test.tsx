// @vitest-environment jsdom
/**
 * Tests for PlayerCardDisplay component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerCardDisplay } from '@components/baseball/PlayerCardDisplay';
import type { PlayerCard } from '@lib/types/player';

function createTestPlayer(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'griffey01',
    nameFirst: 'Ken',
    nameLast: 'Griffey Jr.',
    seasonYear: 1997,
    battingHand: 'L',
    throwingHand: 'L',
    primaryPosition: 'CF',
    eligiblePositions: ['CF', 'LF', 'RF'],
    isPitcher: false,
    card: Array.from({ length: 35 }, () => 7),
    powerRating: 21,
    archetype: { byte33: 1, byte34: 0 },
    speed: 0.7,
    power: 0.28,
    discipline: 0.6,
    contactRate: 0.78,
    fieldingPct: 0.990,
    range: 0.85,
    arm: 0.75,
    ...overrides,
  };
}

describe('PlayerCardDisplay', () => {
  it('renders nothing when closed', () => {
    render(<PlayerCardDisplay player={createTestPlayer()} isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Ken Griffey Jr.')).not.toBeInTheDocument();
  });

  it('renders player name and season when open', () => {
    render(<PlayerCardDisplay player={createTestPlayer()} isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Ken Griffey Jr.')).toBeInTheDocument();
    expect(screen.getByText(/1997/)).toBeInTheDocument();
  });

  it('shows eligible positions', () => {
    render(<PlayerCardDisplay player={createTestPlayer()} isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('CF')).toBeInTheDocument();
    expect(screen.getByText('LF')).toBeInTheDocument();
    expect(screen.getByText('RF')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<PlayerCardDisplay player={createTestPlayer()} isOpen={true} onClose={handleClose} />);

    await user.click(screen.getByLabelText('Close player card'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
