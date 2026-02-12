// @vitest-environment jsdom
/**
 * Tests for NewSeasonPanel component (REQ-SCH-009)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NewSeasonPanel } from '@features/dashboard/NewSeasonPanel';

const defaultProps = {
  seasonYear: 2,
  isCommissioner: true,
  onStartSeason: vi.fn(),
  isStarting: false,
};

describe('NewSeasonPanel', () => {
  it('renders season year heading', () => {
    render(<NewSeasonPanel {...defaultProps} />);
    expect(screen.getByText('Season 2')).toBeInTheDocument();
  });

  it('shows Play Ball button for commissioner', () => {
    render(<NewSeasonPanel {...defaultProps} isCommissioner={true} />);
    expect(screen.getByRole('button', { name: /play ball/i })).toBeInTheDocument();
  });

  it('shows waiting message for non-commissioner, no button', () => {
    render(<NewSeasonPanel {...defaultProps} isCommissioner={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/commissioner/i)).toBeInTheDocument();
  });

  it('disables button and shows Starting Season... when isStarting', () => {
    render(<NewSeasonPanel {...defaultProps} isStarting={true} />);
    const button = screen.getByRole('button', { name: /starting season/i });
    expect(button).toBeDisabled();
  });

});
