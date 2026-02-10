// @vitest-environment jsdom
/**
 * Tests for SeasonCompletePanel component (REQ-SCH-009)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SeasonCompletePanel } from '@features/dashboard/SeasonCompletePanel';

const defaultProps = {
  championName: 'Eastern Eagles',
  isCommissioner: true,
  onArchive: vi.fn(),
  isArchiving: false,
};

describe('SeasonCompletePanel', () => {
  it('renders StampAnimation with SEASON COMPLETED text', () => {
    render(<SeasonCompletePanel {...defaultProps} />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status.textContent).toContain('SEASON COMPLETED');
  });

  it('displays champion name', () => {
    render(<SeasonCompletePanel {...defaultProps} />);
    expect(screen.getByText('Eastern Eagles')).toBeInTheDocument();
    expect(screen.getByText('World Series Champion')).toBeInTheDocument();
  });

  it('shows archive button for commissioner', () => {
    render(<SeasonCompletePanel {...defaultProps} isCommissioner={true} />);
    expect(screen.getByRole('button', { name: /archive season/i })).toBeInTheDocument();
  });

  it('hides archive button for non-commissioner', () => {
    render(<SeasonCompletePanel {...defaultProps} isCommissioner={false} />);
    expect(screen.queryByRole('button', { name: /archive season/i })).not.toBeInTheDocument();
    expect(screen.getByText(/commissioner will archive/i)).toBeInTheDocument();
  });

  it('calls onArchive when archive button clicked', () => {
    const onArchive = vi.fn();
    render(<SeasonCompletePanel {...defaultProps} onArchive={onArchive} />);
    fireEvent.click(screen.getByRole('button', { name: /archive season/i }));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('disables archive button when isArchiving is true', () => {
    render(<SeasonCompletePanel {...defaultProps} isArchiving={true} />);
    expect(screen.getByRole('button', { name: /archiving/i })).toBeDisabled();
  });

  it('has expected data-testid', () => {
    render(<SeasonCompletePanel {...defaultProps} />);
    expect(screen.getByTestId('season-complete-panel')).toBeInTheDocument();
  });
});
