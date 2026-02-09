// @vitest-environment jsdom
/**
 * Tests for SeasonDetail
 */

import { render, screen } from '@testing-library/react';
import { SeasonDetail } from '@features/archive/SeasonDetail';

describe('SeasonDetail', () => {
  it('renders year and champion', () => {
    render(<SeasonDetail year={1995} champion="Atlanta Braves" standings={[]} />);
    expect(screen.getByText('1995 Season')).toBeInTheDocument();
    expect(screen.getByText('Atlanta Braves')).toBeInTheDocument();
  });

  it('renders division standings', () => {
    const standings = [
      {
        leagueDivision: 'AL' as const,
        division: 'East',
        teams: [
          { id: 't-1', name: 'Yankees', city: 'New York', ownerId: null, managerProfile: 'balanced', leagueDivision: 'AL' as const, division: 'East', wins: 95, losses: 67, runsScored: 800, runsAllowed: 700 },
        ],
      },
    ];
    render(<SeasonDetail year={1998} champion="New York Yankees" standings={standings} />);
    expect(screen.getByText('AL East')).toBeInTheDocument();
    expect(screen.getAllByText('New York Yankees').length).toBe(2);
  });
});
