// @vitest-environment jsdom
/**
 * Tests for BoxScoreDisplay
 */

import { render, screen } from '@testing-library/react';
import { BoxScoreDisplay } from '@features/game-viewer/BoxScoreDisplay';
import { createMockBoxScore, createMockBattingLine, createMockPitchingLine } from '../../../fixtures/mock-game';

describe('BoxScoreDisplay', () => {
  const defaultProps = {
    boxScore: createMockBoxScore(),
    battingLines: [createMockBattingLine()],
    pitchingLines: [createMockPitchingLine()],
    homeTeam: 'New York Yankees',
    awayTeam: 'Boston Red Sox',
  };

  it('renders heading', () => {
    render(<BoxScoreDisplay {...defaultProps} />);
    expect(screen.getByText('Box Score')).toBeInTheDocument();
  });

  it('displays team names in line score', () => {
    render(<BoxScoreDisplay {...defaultProps} />);
    expect(screen.getByText('New York Yankees')).toBeInTheDocument();
    expect(screen.getByText('Boston Red Sox')).toBeInTheDocument();
  });

  it('renders batting and pitching sections', () => {
    render(<BoxScoreDisplay {...defaultProps} />);
    expect(screen.getByText('Batting')).toBeInTheDocument();
    expect(screen.getByText('Pitching')).toBeInTheDocument();
  });
});
