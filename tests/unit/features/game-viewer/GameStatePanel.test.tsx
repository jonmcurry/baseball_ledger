// @vitest-environment jsdom
/**
 * Tests for GameStatePanel
 */

import { render, screen } from '@testing-library/react';
import { GameStatePanel } from '@features/game-viewer/GameStatePanel';

describe('GameStatePanel', () => {
  const defaultProps = {
    gameState: {
      bases: { first: null, second: null, third: null },
      outs: 1,
      homeScore: 4,
      awayScore: 3,
      inning: 5,
      halfInning: 'top' as const,
    },
    homeTeam: 'New York Yankees',
    awayTeam: 'Boston Red Sox',
  };

  it('renders heading', () => {
    render(<GameStatePanel {...defaultProps} />);
    expect(screen.getByText('Game State')).toBeInTheDocument();
  });

  it('displays scoreboard with team names', () => {
    render(<GameStatePanel {...defaultProps} />);
    expect(screen.getByText('New York Yankees')).toBeInTheDocument();
    expect(screen.getByText('Boston Red Sox')).toBeInTheDocument();
  });
});
