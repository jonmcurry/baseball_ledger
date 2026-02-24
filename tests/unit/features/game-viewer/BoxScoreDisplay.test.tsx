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

  it('renders column headers', () => {
    render(<BoxScoreDisplay {...defaultProps} />);
    expect(screen.getByText('HITTERS')).toBeInTheDocument();
    expect(screen.getByText('PITCHERS')).toBeInTheDocument();
  });

  it('displays team names in line score', () => {
    render(<BoxScoreDisplay {...defaultProps} />);
    expect(screen.getByText('New York Yankees')).toBeInTheDocument();
    expect(screen.getByText('Boston Red Sox')).toBeInTheDocument();
  });

  it('renders batting and pitching tables', () => {
    render(<BoxScoreDisplay {...defaultProps} />);
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(2);
  });
});
