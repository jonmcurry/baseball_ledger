// @vitest-environment jsdom
/**
 * Tests for LineupDiamond
 */

import { render, screen } from '@testing-library/react';
import { LineupDiamond } from '@features/roster/LineupDiamond';
import { createMockRosterEntry } from '../../../fixtures/mock-roster';

describe('LineupDiamond', () => {
  const mockOnPositionClick = vi.fn();

  it('renders heading', () => {
    render(
      <LineupDiamond starters={[]} selectedPosition={null} onPositionClick={mockOnPositionClick} />,
    );
    expect(screen.getByText('Field')).toBeInTheDocument();
  });

  it('renders the diamond field', () => {
    render(
      <LineupDiamond starters={[]} selectedPosition={null} onPositionClick={mockOnPositionClick} />,
    );
    expect(screen.getByLabelText('Baseball diamond lineup')).toBeInTheDocument();
  });

  it('displays starter names on the diamond', () => {
    const starters = [
      createMockRosterEntry({
        id: 'r-1',
        lineupOrder: 1,
        lineupPosition: 'CF',
        playerCard: {
          playerId: 'p-1',
          nameFirst: 'Ken',
          nameLast: 'Griffey',
          seasonYear: 1993,
          battingHand: 'L' as const,
          throwingHand: 'L' as const,
          primaryPosition: 'CF',
          eligiblePositions: ['CF'],
          isPitcher: false,
          card: [],
          powerRating: 19,
          archetype: { byte33: 7, byte34: 0 },
          speed: 0.6,
          power: 0.5,
          discipline: 0.5,
          contactRate: 0.7,
          fieldingPct: 0.98,
          range: 0.7,
          arm: 0.6,
        },
      }),
    ];
    render(
      <LineupDiamond starters={starters} selectedPosition={null} onPositionClick={mockOnPositionClick} />,
    );
    expect(screen.getAllByText('Ken Griffey').length).toBeGreaterThan(0);
  });

  it('renders empty position slots when no starters', () => {
    render(
      <LineupDiamond starters={[]} selectedPosition={null} onPositionClick={mockOnPositionClick} />,
    );
    const diamond = screen.getByLabelText('Baseball diamond lineup');
    expect(diamond).toBeInTheDocument();
  });

  it('shows position count', () => {
    render(
      <LineupDiamond starters={[]} selectedPosition={null} onPositionClick={mockOnPositionClick} />,
    );
    expect(screen.getByText('0/9 positions filled')).toBeInTheDocument();
  });
});
