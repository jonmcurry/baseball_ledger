// @vitest-environment jsdom
/**
 * Tests for SeriesCard
 */

import { render, screen } from '@testing-library/react';
import { SeriesCard } from '@features/playoffs/SeriesCard';
import type { PlayoffSeries } from '@lib/types/schedule';

describe('SeriesCard', () => {
  const baseSeries: PlayoffSeries = {
    id: 'series-1',
    round: 'DivisionSeries',
    leagueDivision: 'AL',
    higherSeed: { teamId: 'team-1', seed: 1, record: { wins: 95, losses: 67 } },
    lowerSeed: { teamId: 'team-2', seed: 4, record: { wins: 88, losses: 74 } },
    bestOf: 5,
    games: [],
    higherSeedWins: 3,
    lowerSeedWins: 1,
    isComplete: true,
    winnerId: 'team-1',
  };

  it('displays team names', () => {
    render(<SeriesCard series={baseSeries} homeTeam="Yankees" awayTeam="Red Sox" />);
    expect(screen.getByText('Yankees')).toBeInTheDocument();
    expect(screen.getByText('Red Sox')).toBeInTheDocument();
  });

  it('shows winner advances message when complete', () => {
    render(<SeriesCard series={baseSeries} homeTeam="Yankees" awayTeam="Red Sox" />);
    expect(screen.getByText(/Winner advances/)).toBeInTheDocument();
  });
});
