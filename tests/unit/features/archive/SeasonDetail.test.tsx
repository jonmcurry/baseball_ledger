// @vitest-environment jsdom
/**
 * Tests for SeasonDetail (REQ-SCH-009)
 */

import { render, screen } from '@testing-library/react';
import { SeasonDetail } from '@features/archive/SeasonDetail';

describe('SeasonDetail', () => {
  it('renders year and champion', () => {
    render(
      <SeasonDetail
        year={1995}
        champion="Atlanta Braves"
        playoffResults={null}
        leagueLeaders={null}
      />,
    );
    expect(screen.getByText('1995 Season')).toBeInTheDocument();
    expect(screen.getByText('Atlanta Braves')).toBeInTheDocument();
  });

  it('renders league leaders when provided', () => {
    const leaders = {
      batting: {
        HR: [
          { playerId: 'p-1', playerName: 'Aaron Judge', teamId: 't-1', value: 45, rank: 1 },
          { playerId: 'p-2', playerName: 'Shohei Ohtani', teamId: 't-2', value: 40, rank: 2 },
        ],
      },
      pitching: {
        W: [
          { playerId: 'p-3', playerName: 'Gerrit Cole', teamId: 't-1', value: 18, rank: 1 },
        ],
      },
    };

    render(
      <SeasonDetail
        year={2024}
        champion="New York Yankees"
        playoffResults={null}
        leagueLeaders={leaders}
      />,
    );

    expect(screen.getByText('Batting Leaders')).toBeInTheDocument();
    expect(screen.getByText('Home Runs')).toBeInTheDocument();
    expect(screen.getByText('Aaron Judge')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Pitching Leaders')).toBeInTheDocument();
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByText('Gerrit Cole')).toBeInTheDocument();
  });

  it('shows World Series section when playoff results exist', () => {
    render(
      <SeasonDetail
        year={2024}
        champion="New York Yankees"
        playoffResults={{ worldSeriesChampionId: 'team-1', worldSeries: {} }}
        leagueLeaders={null}
      />,
    );

    expect(screen.getByText('World Series')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
