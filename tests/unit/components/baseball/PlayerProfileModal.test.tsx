// @vitest-environment jsdom
/**
 * Tests for PlayerProfileModal (REQ-UI-009)
 *
 * "Digital Baseball Card" popup showing player attributes.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerProfileModal } from '@components/baseball/PlayerProfileModal';
import type { PlayerCard } from '@lib/types/player';

function makeBatterCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'ruth01',
    nameFirst: 'Babe',
    nameLast: 'Ruth',
    seasonYear: 1927,
    battingHand: 'L',
    throwingHand: 'L',
    primaryPosition: 'RF',
    eligiblePositions: ['RF', 'LF'],
    isPitcher: false,
    card: Array.from({ length: 35 }, () => 7),
    powerRating: 21,
    archetype: { byte33: 1, byte34: 0 },
    speed: 0.5,
    power: 0.35,
    discipline: 0.7,
    contactRate: 0.8,
    fieldingPct: 0.970,
    range: 0.5,
    arm: 0.6,
    ...overrides,
  };
}

function makePitcherCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'bluevi01',
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
    ...overrides,
  };
}

describe('PlayerProfileModal', () => {
  it('renders nothing when not open', () => {
    const { container } = render(
      <PlayerProfileModal player={makeBatterCard()} isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders dialog when open', () => {
    render(
      <PlayerProfileModal player={makeBatterCard()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays player name', () => {
    render(
      <PlayerProfileModal player={makeBatterCard()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText('Babe Ruth')).toBeInTheDocument();
  });

  it('displays position and season year', () => {
    render(
      <PlayerProfileModal player={makeBatterCard()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText(/RF -- 1927/)).toBeInTheDocument();
  });

  it('displays batter attributes for position player', () => {
    render(
      <PlayerProfileModal player={makeBatterCard()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText(/Power Rating/)).toBeInTheDocument();
    expect(screen.getByText(/Speed/)).toBeInTheDocument();
    expect(screen.getByText(/Contact/)).toBeInTheDocument();
  });

  it('displays pitcher attributes for pitcher', () => {
    render(
      <PlayerProfileModal player={makePitcherCard()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText(/Grade/)).toBeInTheDocument();
    expect(screen.getByText(/ERA/)).toBeInTheDocument();
    expect(screen.getByText(/WHIP/)).toBeInTheDocument();
  });

  it('displays fielding section', () => {
    render(
      <PlayerProfileModal player={makeBatterCard()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText('Fielding Pct')).toBeInTheDocument();
    expect(screen.getByText('Range')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <PlayerProfileModal player={makeBatterCard()} isOpen={true} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <PlayerProfileModal player={makeBatterCard()} isOpen={true} onClose={onClose} />,
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('focuses first focusable element on open', () => {
    render(
      <PlayerProfileModal player={makeBatterCard()} isOpen={true} onClose={vi.fn()} />,
    );
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(document.activeElement).toBe(closeButton);
  });
});
