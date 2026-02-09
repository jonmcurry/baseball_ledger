// @vitest-environment jsdom
/**
 * Tests for Scoreboard component
 */

import { render, screen } from '@testing-library/react';
import { Scoreboard } from '@components/baseball/Scoreboard';

describe('Scoreboard', () => {
  const defaultProps = {
    homeTeam: 'NYY',
    awayTeam: 'BOS',
    homeScore: 4,
    awayScore: 2,
    inning: 5,
    halfInning: 'top' as const,
    outs: 1,
    bases: { first: null, second: 'player-1', third: null },
  };

  it('renders team names and scores', () => {
    render(<Scoreboard {...defaultProps} />);
    expect(screen.getByText('NYY')).toBeInTheDocument();
    expect(screen.getByText('BOS')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows inning display', () => {
    render(<Scoreboard {...defaultProps} />);
    expect(screen.getByText('Top 5')).toBeInTheDocument();
  });

  it('has scoreboard region role', () => {
    render(<Scoreboard {...defaultProps} />);
    expect(screen.getByRole('region', { name: 'Scoreboard' })).toBeInTheDocument();
  });
});
