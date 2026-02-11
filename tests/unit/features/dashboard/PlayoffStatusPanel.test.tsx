// @vitest-environment jsdom
/**
 * Tests for PlayoffStatusPanel component (REQ-LGE-009)
 */

import { render, screen, within } from '@testing-library/react';
import { PlayoffStatusPanel } from '@features/dashboard/PlayoffStatusPanel';
import { createMockTeams, createMockPlayoffBracket } from '../../../../tests/fixtures/mock-league';
import type { PlayoffGameResult } from '@stores/simulationStore';

const defaultProps = {
  playoffBracket: createMockPlayoffBracket(),
  teams: createMockTeams(),
  lastGameResult: null as PlayoffGameResult | null,
};

describe('PlayoffStatusPanel', () => {
  it('renders "Playoff Status" heading', () => {
    render(<PlayoffStatusPanel {...defaultProps} />);
    expect(screen.getByText('Playoff Status')).toBeInTheDocument();
  });

  it('renders last game result when lastGameResult is provided', () => {
    const lastGameResult: PlayoffGameResult = {
      round: 'ChampionshipSeries',
      seriesId: 'alcs-1',
      gameNumber: 3,
      isPlayoffsComplete: false,
      homeTeamId: 'al-e1',
      awayTeamId: 'al-w1',
      homeScore: 5,
      awayScore: 3,
    };

    render(<PlayoffStatusPanel {...defaultProps} lastGameResult={lastGameResult} />);
    const resultSection = screen.getByTestId('last-game-result');
    expect(resultSection).toBeInTheDocument();
    expect(within(resultSection).getByText(/Championship Series Game 3/)).toBeInTheDocument();
  });

  it('does not render last game result section when lastGameResult is null', () => {
    render(<PlayoffStatusPanel {...defaultProps} />);
    expect(screen.queryByTestId('last-game-result')).not.toBeInTheDocument();
  });

  it('renders active series with team names and win counts', () => {
    render(<PlayoffStatusPanel {...defaultProps} />);
    // ALCS: al-e1 (Eagles) vs al-w1 (Wolves), 2-0
    expect(screen.getByText('Eagles')).toBeInTheDocument();
    expect(screen.getByText('Wolves')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders next game preview from bracket data', () => {
    render(<PlayoffStatusPanel {...defaultProps} />);
    expect(screen.getByTestId('next-game-preview')).toBeInTheDocument();
    expect(screen.getByText(/Up Next/)).toBeInTheDocument();
  });

  it('renders link to full bracket page', () => {
    render(<PlayoffStatusPanel {...defaultProps} />);
    expect(screen.getByText(/View full bracket/)).toBeInTheDocument();
  });

  it('has data-testid="playoff-status-panel"', () => {
    render(<PlayoffStatusPanel {...defaultProps} />);
    expect(screen.getByTestId('playoff-status-panel')).toBeInTheDocument();
  });
});
